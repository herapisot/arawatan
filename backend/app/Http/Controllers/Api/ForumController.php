<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ForumPost;
use App\Services\ContentModerationService;
use App\Traits\EncryptsRouteIds;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ForumController extends Controller
{
    use EncryptsRouteIds;
    /**
     * List all public forum posts from all users.
     * Shows every public post regardless of approval status.
     */
    public function index(Request $request)
    {
        // Try to resolve user from Bearer token (public route, no auth middleware)
        $user = $request->user() ?? $this->resolveUserFromToken($request);

        $query = ForumPost::with(['user', 'transaction.item'])
            ->withCount('likes')
            ->where('visibility', 'public');

        $posts = $query->latest()->paginate($request->get('per_page', 12));

        if ($user) {
            $userId = $user->id;
            $posts->getCollection()->transform(function ($post) use ($userId) {
                $post->is_liked = $post->likes()->where('user_id', $userId)->exists();
                return $post;
            });
        } else {
            $posts->getCollection()->transform(function ($post) {
                $post->is_liked = false;
                return $post;
            });
        }

        return response()->json($posts);
    }

    /**
     * Resolve user from Bearer token on public routes.
     */
    private function resolveUserFromToken(Request $request)
    {
        $token = $request->bearerToken();
        if (!$token) return null;

        $accessToken = \Laravel\Sanctum\PersonalAccessToken::findToken($token);
        if (!$accessToken) return null;

        return $accessToken->tokenable;
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

        // AI Content Moderation — screen caption text
        $moderationService = new ContentModerationService();
        $textFields = [];
        if (!empty($request->caption)) {
            $textFields['caption'] = $request->caption;
        }

        // Screen the uploaded image for prohibited text
        $imagePaths = [];
        $image = $request->file('image');
        $tempImagePath = $image->getRealPath();
        if ($tempImagePath && file_exists($tempImagePath)) {
            $imagePaths[] = $tempImagePath;
        }

        $screening = $moderationService->screenContent($textFields, $imagePaths);

        if (!$screening['approved']) {
            return response()->json([
                'message' => 'Your post was rejected by our AI safety screening.',
                'moderation' => [
                    'reasons' => $screening['reasons'],
                    'severity' => $screening['overall_severity'],
                    'categories' => $screening['flagged_categories'],
                ],
            ], 422);
        }

        // Auto-crop image to square
        $croppedPath = $this->cropToSquare($image);

        $post = ForumPost::create([
            'user_id' => $request->user()->id,
            'transaction_id' => $request->transaction_id,
            'image_path' => $croppedPath,
            'caption' => $request->caption,
            'visibility' => $request->get('visibility', 'public'),
            'status' => 'approved',
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
