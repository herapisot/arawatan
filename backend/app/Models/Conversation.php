<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Conversation extends Model
{
    protected $fillable = [
        'item_id',
        'participant_one_id',
        'participant_two_id',
    ];

    public function item()
    {
        return $this->belongsTo(Item::class);
    }

    public function participantOne()
    {
        return $this->belongsTo(User::class, 'participant_one_id');
    }

    public function participantTwo()
    {
        return $this->belongsTo(User::class, 'participant_two_id');
    }

    public function messages()
    {
        return $this->hasMany(Message::class)->orderBy('created_at');
    }

    public function latestMessage()
    {
        return $this->hasOne(Message::class)->latestOfMany();
    }

    /**
     * Get the other participant in the conversation.
     */
    public function getOtherParticipant(int $userId): ?User
    {
        if ($this->participant_one_id === $userId) {
            return $this->participantTwo;
        }
        return $this->participantOne;
    }

    /**
     * Scope: conversations for a specific user.
     */
    public function scopeForUser($query, int $userId)
    {
        return $query->where('participant_one_id', $userId)
            ->orWhere('participant_two_id', $userId);
    }
}
