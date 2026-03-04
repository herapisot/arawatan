<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\HasEncryptedId;

class Transaction extends Model
{
    use HasFactory, HasEncryptedId;

    protected $appends = ['encrypted_id'];

    protected $fillable = [
        'item_id',
        'donor_id',
        'receiver_id',
        'status',
        'proof_photo_path',
        'meetup_location',
        'requested_at',
        'approved_at',
        'completed_at',
        'forum_deadline_at',
    ];

    protected function casts(): array
    {
        return [
            'requested_at' => 'datetime',
            'approved_at' => 'datetime',
            'completed_at' => 'datetime',
            'forum_deadline_at' => 'datetime',
        ];
    }

    public function item()
    {
        return $this->belongsTo(Item::class);
    }

    public function donor()
    {
        return $this->belongsTo(User::class, 'donor_id');
    }

    public function receiver()
    {
        return $this->belongsTo(User::class, 'receiver_id');
    }

    public function forumPost()
    {
        return $this->hasOne(ForumPost::class);
    }
}
