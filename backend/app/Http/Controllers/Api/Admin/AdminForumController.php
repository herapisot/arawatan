<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\ForumPost;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Http\Request;

class AdminForumController extends Controller
{
    /**
     * List forum posts for admin review (with status filter).
     */
    public function index(Request $request)
    {
        $status = $request->get('status', 'pending');

        $query = ForumPost::with(['user', 'transaction.item'])
            ->withCount('likes');

        if ($status !== 'all') {
            $query->where('status', $status);
        }

        $posts = $query->latest()->paginate(20);

        return response()->json($posts);
    }

    /**
     * Approve a forum post. Awards points to donor (+10) and receiver (+5).
     */
    public function approve(Request $request, ForumPost $forumPost)
    {
        if ($forumPost->status !== 'pending') {
            return response()->json(['message' => 'This post has already been reviewed.'], 422);
        }

        $forumPost->update(['status' => 'approved']);

        // Notify the post author
        Notification::notify(
            $forumPost->user_id,
            'forum_approved',
            'Forum Post Approved',
            'Your forum post has been approved and is now visible to the community!',
            '/forum',
            $forumPost->id,
            'forum_post'
        );

        // Award points if this post is linked to a transaction
        if ($forumPost->transaction_id) {
            $transaction = $forumPost->transaction;
            if ($transaction && $transaction->status === 'completed') {
                // Award points to donor (+10)
                $donor = $transaction->donor;
                if ($donor) {
                    $donor->increment('points', 10);
                    $this->updateTier($donor);

                    Notification::notify(
                        $donor->id,
                        'points_awarded',
                        'Points Earned!',
                        'You earned 10 points for donating "' . $transaction->item->title . '"!',
                        '/leaderboard',
                        $transaction->id,
                        'transaction'
                    );
                }

                // Award points to receiver (+5)
                $receiver = $transaction->receiver;
                if ($receiver) {
                    $receiver->increment('points', 5);
                    $this->updateTier($receiver);

                    Notification::notify(
                        $receiver->id,
                        'points_awarded',
                        'Points Earned!',
                        'You earned 5 points for receiving "' . $transaction->item->title . '"!',
                        '/leaderboard',
                        $transaction->id,
                        'transaction'
                    );
                }
            }
        }

        return response()->json(['message' => 'Post approved and points awarded.', 'post' => $forumPost->fresh()]);
    }

    /**
     * Reject a forum post with a reason.
     */
    public function reject(Request $request, ForumPost $forumPost)
    {
        if ($forumPost->status !== 'pending') {
            return response()->json(['message' => 'This post has already been reviewed.'], 422);
        }

        $request->validate([
            'reason' => 'required|string|max:500',
        ]);

        $forumPost->update([
            'status' => 'rejected',
            'rejection_reason' => $request->reason,
        ]);

        // Notify the post author
        Notification::notify(
            $forumPost->user_id,
            'forum_rejected',
            'Forum Post Rejected',
            'Your forum post was rejected: ' . $request->reason,
            '/forum',
            $forumPost->id,
            'forum_post'
        );

        return response()->json(['message' => 'Post rejected.', 'post' => $forumPost->fresh()]);
    }

    /**
     * Update user tier based on points.
     */
    private function updateTier(User $user): void
    {
        if ($user->points >= 500) {
            $user->update(['tier' => 'Gold Community Champion']);
        } elseif ($user->points >= 100) {
            $user->update(['tier' => 'Silver Contributor']);
        } else {
            $user->update(['tier' => 'Bronze Contributor']);
        }
    }
}
