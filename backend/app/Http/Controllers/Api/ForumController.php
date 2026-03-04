<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ForumPost;
use App\Traits\EncryptsRouteIds;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ForumController extends Controller
{
    use EncryptsRouteIds;
    /**
     * List public forum posts.
     * - Approved posts are visible to everyone.
     * - Pending/rejected posts from transactions the authenticated user was part of
     *   are also included so both giver and receiver can see them immediately.
     */
    public function index(Request $request)
    {
        $user = $request->user();

        $query = ForumPost::with(['user', 'transaction.item'])
            ->withCount('likes')
            ->where('visibility', 'public')
            ->where('status', 'approved');

        if ($user) {
            $userId = $user->id;
            // For authenticated users, we also include their own pending/rejected posts
            // or posts from transactions they are part of, regardless of status.
            $query->orWhere(function ($q) use ($userId) {
                $q->whereHas('transaction', function ($tq) use ($userId) {
                    $tq->where('donor_id', $userId)
                      ->orWhere('receiver_id', $userId);
                });
            });
        }

        $posts = $query->latest()->paginate($request->get('per_page', 12));

        if ($user) {
            $userId = $user->id;
            $posts->getCollection()->transform(function ($post) use ($userId) {
                $post->is_liked = $post->likes()->where('user_id', $userId)->exists();
                return $post;
            });
        }

        return response()->json($posts);
    }

    /**
     * Get current user's forum posts (own posts + partner's posts on shared transactions).
     */
    public function myPosts(Request $request)
    {
        $userId = $request->user()->id;

        $posts = ForumPost::with(['user', 'transaction.item'])
            ->withCount('likes')
            ->where(function ($q) use ($userId) {
                // Own posts
                $q->where('user_id', $userId);

                // Posts by the other party in any transaction the user was involved in
                $q->orWhereHas('transaction', function ($tq) use ($userId) {
                    $tq->where('donor_id', $userId)
                       ->orWhere('receiver_id', $userId);
                });
            })
            ->latest()
            ->paginate(12);

        $posts->getCollection()->transform(function ($post) use ($userId) {
            $post->is_liked = $post->likes()->where('user_id', $userId)->exists();
            return $post;
        });

        return response()->json($posts);
    }

    /**
     * Create a forum post (status defaults to 'pending', awaiting admin approval).
     * Image limited to 1MB (1024KB). Auto-cropped to square aspect ratio.
     */
    public function store(Request $request)
    {
        $request->validate([
            'image' => 'required|image|mimes:jpeg,png,jpg,webp|max:1024',
            'caption' => 'nullable|string|max:500',
            'transaction_id' => 'nullable|exists:transactions,id',
            'visibility' => 'nullable|in:public,private',
        ]);

        // Auto-crop image to square
        $image = $request->file('image');
        $croppedPath = $this->cropToSquare($image);

        $post = ForumPost::create([
            'user_id' => $request->user()->id,
            'transaction_id' => $request->transaction_id,
            'image_path' => $croppedPath,
            'caption' => $request->caption,
            'visibility' => $request->get('visibility', 'public'),
            'status' => 'pending',
        ]);

        return response()->json($post->load('user'), 201);
    }

    /**
     * Like/unlike a forum post (only approved posts can be liked).
     */
    public function toggleLike(Request $request, string $encryptedId)
    {
        $forumPost = $this->findByEncryptedId($encryptedId, ForumPost::class);
        if ($this->isErrorResponse($forumPost)) return $forumPost;
        if ($forumPost->status !== 'approved') {
            return response()->json(['message' => 'You can only like approved posts.'], 422);
        }

        $userId = $request->user()->id;
        $isLiked = $forumPost->likes()->where('user_id', $userId)->exists();

        if ($isLiked) {
            $forumPost->likes()->detach($userId);
            $forumPost->decrement('likes_count');
            $liked = false;
        } else {
            $forumPost->likes()->attach($userId);
            $forumPost->increment('likes_count');
            $liked = true;
        }

        return response()->json([
            'is_liked' => $liked,
            'likes_count' => $forumPost->fresh()->likes_count,
        ]);
    }

    /**
     * Crop an uploaded image to a square (center crop).
     */
    private function cropToSquare($imageFile): string
    {
        $img = @imagecreatefromstring(file_get_contents($imageFile->getRealPath()));

        if (!$img) {
            // Fallback: no GD or unsupported format, just store as-is
            return $imageFile->store('gallery', 'public');
        }

        $width = imagesx($img);
        $height = imagesy($img);
        $size = min($width, $height);

        $srcX = (int) (($width - $size) / 2);
        $srcY = (int) (($height - $size) / 2);

        $cropped = imagecreatetruecolor($size, $size);
        imagecopyresampled($cropped, $img, 0, 0, $srcX, $srcY, $size, $size, $size, $size);

        $filename = 'gallery/' . uniqid('forum_') . '.jpg';
        $fullPath = storage_path('app/public/' . $filename);

        // Ensure directory exists
        if (!is_dir(dirname($fullPath))) {
            mkdir(dirname($fullPath), 0755, true);
        }

        imagejpeg($cropped, $fullPath, 85);

        imagedestroy($img);
        imagedestroy($cropped);

        return $filename;
    }
}
