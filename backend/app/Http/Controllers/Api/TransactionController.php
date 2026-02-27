<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Transaction;
use App\Models\Item;
use App\Models\Notification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class TransactionController extends Controller
{
    /**
     * Request an item (create transaction).
     */
    public function requestItem(Request $request, Item $item)
    {
        $user = $request->user();

        // Can't request your own item
        if ($item->user_id === $user->id) {
            return response()->json(['message' => 'You cannot request your own item.'], 422);
        }

        // Check if already requested
        $existing = Transaction::where('item_id', $item->id)
            ->where('receiver_id', $user->id)
            ->whereNotIn('status', ['cancelled'])
            ->first();

        if ($existing) {
            return response()->json(['message' => 'You have already requested this item.'], 422);
        }

        // Check item is available
        if ($item->status !== 'active') {
            return response()->json(['message' => 'This item is no longer available.'], 422);
        }

        $transaction = Transaction::create([
            'item_id' => $item->id,
            'donor_id' => $item->user_id,
            'receiver_id' => $user->id,
            'status' => 'requested',
            'meetup_location' => $item->meetup_location,
            'requested_at' => now(),
        ]);

        // Mark item as reserved
        $item->update(['status' => 'reserved']);

        // Notify the donor about the new request
        Notification::notify(
            $item->user_id,
            'item_request',
            'New Item Request',
            $user->full_name . ' has requested your item "' . $item->title . '".',
            '/browseitem/' . $item->id,
            $transaction->id,
            'transaction'
        );

        return response()->json(
            $transaction->load(['item.images', 'donor', 'receiver']),
            201
        );
    }

    /**
     * Get transaction detail.
     */
    public function show(Request $request, Transaction $transaction)
    {
        $user = $request->user();

        // Only participants or admin can view
        if ($transaction->donor_id !== $user->id
            && $transaction->receiver_id !== $user->id
            && !$user->isAdmin()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $transaction->load(['item.images', 'donor', 'receiver']);

        return response()->json($transaction);
    }

    /**
     * Donor approves a request.
     */
    public function approve(Request $request, Transaction $transaction)
    {
        if ($transaction->donor_id !== $request->user()->id) {
            return response()->json(['message' => 'Only the donor can approve.'], 403);
        }

        if ($transaction->status !== 'requested') {
            return response()->json(['message' => 'Transaction cannot be approved in its current state.'], 422);
        }

        $transaction->update([
            'status' => 'approved',
            'approved_at' => now(),
        ]);

        // Notify the receiver that their request was approved
        Notification::notify(
            $transaction->receiver_id,
            'request_approved',
            'Request Approved',
            'Your request for "' . $transaction->item->title . '" has been approved!',
            '/browseitem/' . $transaction->item_id,
            $transaction->id,
            'transaction'
        );

        return response()->json($transaction->load(['item.images', 'donor', 'receiver']));
    }

    /**
     * Move transaction to meeting stage.
     */
    public function startMeeting(Request $request, Transaction $transaction)
    {
        $user = $request->user();
        if ($transaction->donor_id !== $user->id && $transaction->receiver_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if ($transaction->status !== 'approved') {
            return response()->json(['message' => 'Transaction must be approved first.'], 422);
        }

        $transaction->update(['status' => 'meeting']);

        return response()->json($transaction->load(['item.images', 'donor', 'receiver']));
    }

    /**
     * Complete a transaction with proof photo.
     */
    public function complete(Request $request, Transaction $transaction)
    {
        $user = $request->user();
        if ($transaction->donor_id !== $user->id && $transaction->receiver_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if (!in_array($transaction->status, ['approved', 'meeting'])) {
            return response()->json(['message' => 'Transaction cannot be completed in its current state.'], 422);
        }

        $transaction->update([
            'status' => 'completed',
            'completed_at' => now(),
        ]);

        // Mark item as completed
        $transaction->item->update(['status' => 'completed']);

        // Notify both parties about completion
        $otherUserId = $user->id === $transaction->donor_id ? $transaction->receiver_id : $transaction->donor_id;
        Notification::notify(
            $otherUserId,
            'transaction_completed',
            'Transaction Completed',
            'The transaction for "' . $transaction->item->title . '" has been completed.',
            '/browseitem/' . $transaction->item_id,
            $transaction->id,
            'transaction'
        );

        // Award points to donor
        $donor = $transaction->donor;
        $donor->increment('points', 10);
        $this->updateTier($donor);

        // Award points to receiver
        $receiver = $transaction->receiver;
        $receiver->increment('points', 5);
        $this->updateTier($receiver);

        return response()->json($transaction->load(['item.images', 'donor', 'receiver']));
    }

    /**
     * Upload proof photo for a transaction.
     */
    public function uploadProof(Request $request, Transaction $transaction)
    {
        $user = $request->user();
        if ($transaction->donor_id !== $user->id && $transaction->receiver_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $request->validate([
            'proof_photo' => 'required|image|mimes:jpeg,png,jpg,webp|max:5120',
        ]);

        $path = $request->file('proof_photo')->store('proofs', 'public');
        $transaction->update(['proof_photo_path' => $path]);

        return response()->json($transaction);
    }

    /**
     * Cancel a transaction.
     */
    public function cancel(Request $request, Transaction $transaction)
    {
        $user = $request->user();
        if ($transaction->donor_id !== $user->id && $transaction->receiver_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if ($transaction->status === 'completed') {
            return response()->json(['message' => 'Cannot cancel a completed transaction.'], 422);
        }

        $transaction->update(['status' => 'cancelled']);

        // Make item available again
        $transaction->item->update(['status' => 'active']);

        // Notify the other party about cancellation
        $otherUserId = $user->id === $transaction->donor_id ? $transaction->receiver_id : $transaction->donor_id;
        Notification::notify(
            $otherUserId,
            'transaction_cancelled',
            'Transaction Cancelled',
            'The transaction for "' . $transaction->item->title . '" has been cancelled.',
            '/browseitem/' . $transaction->item_id,
            $transaction->id,
            'transaction'
        );

        return response()->json($transaction);
    }

    /**
     * Get current user's requests (as receiver).
     */
    public function myRequests(Request $request)
    {
        $transactions = Transaction::with(['item.images', 'donor'])
            ->where('receiver_id', $request->user()->id)
            ->latest()
            ->paginate(12);

        return response()->json($transactions);
    }

    /**
     * Get current user's donations (as donor).
     */
    public function myDonations(Request $request)
    {
        $transactions = Transaction::with(['item.images', 'receiver'])
            ->where('donor_id', $request->user()->id)
            ->latest()
            ->paginate(12);

        return response()->json($transactions);
    }

    /**
     * Update user tier based on points.
     */
    private function updateTier($user): void
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
