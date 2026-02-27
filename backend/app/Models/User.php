<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasFactory, Notifiable, HasApiTokens;

    protected $fillable = [
        'first_name',
        'last_name',
        'email',
        'student_id',
        'campus',
        'user_type',
        'password',
        'is_verified',
        'verification_status',
        'tier',
        'points',
        'role',
        'avatar_url',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_verified' => 'boolean',
            'points' => 'integer',
        ];
    }

    protected $appends = ['full_name', 'items_shared', 'items_received'];

    public function getFullNameAttribute(): string
    {
        return $this->first_name . ' ' . $this->last_name;
    }

    public function getItemsSharedAttribute(): int
    {
        return $this->donorTransactions()->where('status', 'completed')->count();
    }

    public function getItemsReceivedAttribute(): int
    {
        return $this->receiverTransactions()->where('status', 'completed')->count();
    }

    // Relationships
    public function items()
    {
        return $this->hasMany(Item::class);
    }

    public function verifications()
    {
        return $this->hasMany(Verification::class);
    }

    public function donorTransactions()
    {
        return $this->hasMany(Transaction::class, 'donor_id');
    }

    public function receiverTransactions()
    {
        return $this->hasMany(Transaction::class, 'receiver_id');
    }

    public function conversations()
    {
        return Conversation::where('participant_one_id', $this->id)
            ->orWhere('participant_two_id', $this->id);
    }

    public function sentMessages()
    {
        return $this->hasMany(Message::class, 'sender_id');
    }

    public function galleryPosts()
    {
        return $this->hasMany(GalleryPost::class);
    }

    public function badges()
    {
        return $this->belongsToMany(Badge::class, 'badge_user')->withPivot('earned_at');
    }

    public function likedPosts()
    {
        return $this->belongsToMany(GalleryPost::class, 'gallery_likes')->withTimestamps();
    }

    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }
}
