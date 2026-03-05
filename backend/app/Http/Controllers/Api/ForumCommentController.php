<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ForumComment;
use App\Models\ForumPost;
use App\Services\ContentModerationService;
use App\Traits\EncryptsRouteIds;
use Illuminate\Http\Request;

class ForumCommentController extends Controller
{
    use EncryptsRouteIds;

    /**
     * List comments for a forum post.
     */
    public function index(Request $request, string $encryptedPostId)
    {
        $post = $this->findByEncryptedId($encryptedPostId, ForumPost::class);
        if ($this->isErrorResponse($post)) return $post;

        $comments = $post->comments()
            ->with('user')
            ->where('status', 'approved')
            ->latest()
            ->paginate($request->get('per_page', 20));

        return response()->json($comments);
    }

    /**
     * Add a comment to a forum post with AI moderation.
     */
    public function store(Request $request, string $encryptedPostId)
    {
        $post = $this->findByEncryptedId($encryptedPostId, ForumPost::class);
        if ($this->isErrorResponse($post)) return $post;

        $validated = $request->validate([
            'body' => 'required|string|max:500',
        ]);

        // AI Content Moderation — screen comment text
        $moderationService = new ContentModerationService();
        $screening = $moderationService->screenText($validated['body']);

        if ($screening['flagged']) {
            return response()->json([
                'message' => 'Your comment was rejected by our AI safety screening.',
                'moderation' => [
                    'reason' => $screening['reason'],
                    'severity' => $screening['severity'],
                    'categories' => array_keys($screening['categories']),
                ],
            ], 422);
        }

        $comment = ForumComment::create([
            'gallery_post_id' => $post->id,
            'user_id' => $request->user()->id,
            'body' => $validated['body'],
            'status' => 'approved',
        ]);

        return response()->json($comment->load('user'), 201);
    }

    /**
     * Delete a comment (owner or admin only).
     */
    public function destroy(Request $request, string $encryptedCommentId)
    {
        $comment = $this->findByEncryptedId($encryptedCommentId, ForumComment::class);
        if ($this->isErrorResponse($comment)) return $comment;

        if ($comment->user_id !== $request->user()->id && !$request->user()->isAdmin()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $comment->delete();

        return response()->json(['message' => 'Comment removed successfully']);
    }
}
