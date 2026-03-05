<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\Transaction;
use App\Models\User;
use App\Models\Notification;
use App\Traits\EncryptsRouteIds;
use Illuminate\Http\Request;

class ChatController extends Controller
{
    use EncryptsRouteIds;
    /**
     * List user's conversations.
     */
    public function index(Request $request)
    {
        $userId = $request->user()->id;

        $conversations = Conversation::with(['participantOne', 'participantTwo', 'item.images', 'latestMessage'])
            ->forUser($userId)
            ->latest('updated_at')
            ->paginate(20);

        // Transform to include "other" participant and transaction info
        $conversations->getCollection()->transform(function ($conv) use ($userId) {
            $other = $conv->getOtherParticipant($userId);
            $conv->other_participant = $other;
            $conv->unread_count = Message::where('conversation_id', $conv->id)
                ->where('sender_id', '!=', $userId)
                ->where('created_at', '>', $conv->updated_at ?? $conv->created_at)
                ->count();

            // Attach transaction info so the frontend knows if user is receiver
            $transaction = Transaction::where('item_id', $conv->item_id)
                ->whereNotIn('status', ['cancelled'])
                ->first();
            if ($transaction) {
                $conv->transaction_status = $transaction->status;
                $conv->transaction_encrypted_id = $transaction->encrypted_id;
                $conv->is_receiver = $transaction->receiver_id === $userId;
            }

            return $conv;
        });

        return response()->json($conversations);
    }

    /**
     * Get messages for a conversation.
     */
    public function messages(Request $request, string $encryptedId)
    {
        $conversation = $this->findByEncryptedId($encryptedId, Conversation::class);
        if ($this->isErrorResponse($conversation)) return $conversation;

        $userId = $request->user()->id;

        // Verify participant
        if ($conversation->participant_one_id !== $userId && $conversation->participant_two_id !== $userId) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $messages = $conversation->messages()
            ->with('sender')
            ->latest()
            ->paginate(50);

        return response()->json($messages);
    }

    /**
     * Send a message. Blocked if conversation is locked.
     */
    public function sendMessage(Request $request, string $encryptedId)
    {
        $conversation = $this->findByEncryptedId($encryptedId, Conversation::class);
        if ($this->isErrorResponse($conversation)) return $conversation;

        $userId = $request->user()->id;

        if ($conversation->participant_one_id !== $userId && $conversation->participant_two_id !== $userId) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // Check if conversation is locked (after transaction completion)
        if ($conversation->is_locked) {
            return response()->json(['message' => 'This conversation is locked. The transaction has been completed.'], 422);
        }

        $request->validate([
            'text' => 'required_without:image|nullable|string|max:2000',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,webp|max:5120',
        ]);

        $imagePath = null;
        if ($request->hasFile('image')) {
            $imagePath = $request->file('image')->store('chat-images', 'public');
        }

        $message = Message::create([
            'conversation_id' => $conversation->id,
            'sender_id' => $userId,
            'text' => $request->text,
            'image_path' => $imagePath,
        ]);

        // Update conversation timestamp
        $conversation->touch();

        // Notify the other participant about the new message
        $recipientId = $conversation->participant_one_id === $userId
            ? $conversation->participant_two_id
            : $conversation->participant_one_id;

        $senderName = $request->user()->full_name;
        $msgPreview = $request->text
            ? (strlen($request->text) > 50 ? substr($request->text, 0, 50) . '...' : $request->text)
            : '📷 Sent an image';

        Notification::notify(
            $recipientId,
            'new_message',
            'New Message',
            $senderName . ': ' . $msgPreview,
            '/chat/' . $conversation->encrypted_id,
            $conversation->id,
            'conversation'
        );

        return response()->json($message->load('sender'), 201);
    }

    /**
     * Start or get existing conversation for an item.
     */
    public function startConversation(Request $request)
    {
        $request->validate([
            'item_id' => 'required|string',
            'recipient_id' => 'required|string',
        ]);

        $userId = $request->user()->id;

        // Decrypt the encrypted IDs
        $itemId = $this->decryptId($request->item_id);
        $recipientId = $this->decryptId($request->recipient_id);

        if ($itemId === null || $recipientId === null) {
            return response()->json(['message' => 'Invalid or malformed ID.'], 400);
        }

        // Verify the models exist
        $item = \App\Models\Item::find($itemId);
        $recipient = User::find($recipientId);

        if (!$item || !$recipient) {
            return response()->json(['message' => 'Resource not found.'], 404);
        }

        if ($userId === $recipientId) {
            return response()->json(['message' => 'Cannot start a conversation with yourself.'], 422);
        }

        // Find existing conversation
        $conversation = Conversation::where('item_id', $itemId)
            ->where(function ($q) use ($userId, $recipientId) {
                $q->where(function ($q2) use ($userId, $recipientId) {
                    $q2->where('participant_one_id', $userId)
                        ->where('participant_two_id', $recipientId);
                })->orWhere(function ($q2) use ($userId, $recipientId) {
                    $q2->where('participant_one_id', $recipientId)
                        ->where('participant_two_id', $userId);
                });
            })
            ->first();

        if (!$conversation) {
            $conversation = Conversation::create([
                'item_id' => $itemId,
                'participant_one_id' => $userId,
                'participant_two_id' => $recipientId,
            ]);
        }

        $conversation->load(['participantOne', 'participantTwo', 'item.images']);

        return response()->json($conversation);
    }

    /**
     * Complete a transaction from within the chat (receiver only).
     */
    public function completeTransaction(Request $request, string $encryptedId)
    {
        $conversation = $this->findByEncryptedId($encryptedId, Conversation::class);
        if ($this->isErrorResponse($conversation)) return $conversation;

        $userId = $request->user()->id;

        // Verify participant
        if ($conversation->participant_one_id !== $userId && $conversation->participant_two_id !== $userId) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // Find the active transaction for this item
        $transaction = Transaction::where('item_id', $conversation->item_id)
            ->whereNotIn('status', ['cancelled', 'completed'])
            ->first();

        if (!$transaction) {
            return response()->json(['message' => 'No active transaction found for this conversation.'], 404);
        }

        // Only the receiver can complete
        if ($transaction->receiver_id !== $userId) {
            return response()->json(['message' => 'Only the receiver can complete the transaction.'], 403);
        }

        if (!in_array($transaction->status, ['approved', 'meeting'])) {
            return response()->json(['message' => 'Transaction cannot be completed in its current state.'], 422);
        }

        $forumDeadline = now()->addHours(12);

        $transaction->update([
            'status' => 'completed',
            'completed_at' => now(),
            'forum_deadline_at' => $forumDeadline,
        ]);

        // Mark item as completed
        $transaction->item->update(['status' => 'completed']);

        // Lock all conversations related to this item
        Conversation::where('item_id', $transaction->item_id)->update(['is_locked' => true]);

        // Notify the donor about completion
        Notification::notify(
            $transaction->donor_id,
            'transaction_completed',
            'Transaction Completed',
            'The transaction for "' . $transaction->item->title . '" has been completed by the receiver.',
            '/browseitem/' . $transaction->item->encrypted_id,
            $transaction->id,
            'transaction'
        );

        // Notify receiver about forum post deadline
        Notification::notify(
            $transaction->receiver_id,
            'forum_deadline',
            'Post to Forum',
            'Please post a photo of your exchange for "' . $transaction->item->title . '" to the forum within 12 hours to earn points!',
            '/forum',
            $transaction->id,
            'transaction'
        );

        // Also notify donor about the forum deadline
        Notification::notify(
            $transaction->donor_id,
            'forum_deadline',
            'Post to Forum',
            'The exchange for "' . $transaction->item->title . '" is completed! Post a photo to the forum within 12 hours to earn points.',
            '/forum',
            $transaction->id,
            'transaction'
        );

        return response()->json([
            'message' => 'Transaction completed successfully.',
            'transaction' => $transaction->load(['item.images', 'donor', 'receiver']),
        ]);
    }
}
