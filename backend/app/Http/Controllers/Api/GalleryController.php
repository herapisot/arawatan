<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ForumPost;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class GalleryController extends Controller
{
    /**
     * List public gallery posts.
     */
    public function index(Request $request)
    {
        $query = ForumPost::with(['user', 'transaction.item'])
            ->withCount('likes')
            ->where('visibility', 'public')
            ->latest();

        $posts = $query->paginate($request->get('per_page', 12));

        // Add liked status for authenticated user
        if ($request->user()) {
            $userId = $request->user()->id;
            $posts->getCollection()->transform(function ($post) use ($userId) {
                $post->is_liked = $post->likes()->where('user_id', $userId)->exists();
                return $post;
            });
        }

        return response()->json($posts);
    }

    /**
     * Get current user's gallery posts.
     */
    public function myPosts(Request $request)
    {
        $userId = $request->user()->id;

        $posts = ForumPost::with(['user', 'transaction.item'])
            ->withCount('likes')
            ->where('user_id', $userId)
            ->latest()
            ->paginate(12);

        $posts->getCollection()->transform(function ($post) use ($userId) {
            $post->is_liked = $post->likes()->where('user_id', $userId)->exists();
            return $post;
        });

        return response()->json($posts);
    }

    /**
     * Create a gallery post.
     */
    public function store(Request $request)
    {
        $request->validate([
            'image' => 'required|image|mimes:jpeg,png,jpg,webp|max:5120',
            'caption' => 'nullable|string|max:500',
            'transaction_id' => 'nullable|exists:transactions,id',
            'visibility' => 'nullable|in:public,private',
        ]);

        $path = $request->file('image')->store('gallery', 'public');

        $post = ForumPost::create([
            'user_id' => $request->user()->id,
            'transaction_id' => $request->transaction_id,
            'image_path' => $path,
            'caption' => $request->caption,
            'visibility' => $request->get('visibility', 'public'),
        ]);

        return response()->json($post->load('user'), 201);
    }

    /**
     * Like/unlike a gallery post.
     */
    public function toggleLike(Request $request, ForumPost $forumPost)
    {
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
}
