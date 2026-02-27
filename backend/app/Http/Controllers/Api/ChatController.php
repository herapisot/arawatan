<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use App\Models\Notification;
use Illuminate\Http\Request;

class ChatController extends Controller
{
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

        // Transform to include "other" participant
        $conversations->getCollection()->transform(function ($conv) use ($userId) {
            $other = $conv->getOtherParticipant($userId);
            $conv->other_participant = $other;
            $conv->unread_count = Message::where('conversation_id', $conv->id)
                ->where('sender_id', '!=', $userId)
                ->where('created_at', '>', $conv->updated_at ?? $conv->created_at)
                ->count();
            return $conv;
        });

        return response()->json($conversations);
    }

    /**
     * Get messages for a conversation.
     */
    public function messages(Request $request, Conversation $conversation)
    {
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
     * Send a message.
     */
    public function sendMessage(Request $request, Conversation $conversation)
    {
        $userId = $request->user()->id;

        if ($conversation->participant_one_id !== $userId && $conversation->participant_two_id !== $userId) {
            return response()->json(['message' => 'Unauthorized'], 403);
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
            '/chat/' . $conversation->id,
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
            'item_id' => 'required|exists:items,id',
            'recipient_id' => 'required|exists:users,id',
        ]);

        $userId = $request->user()->id;
        $recipientId = $request->recipient_id;
        $itemId = $request->item_id;

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
}
