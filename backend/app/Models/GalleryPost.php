<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class GalleryPost extends Model
{
    protected $fillable = [
        'user_id',
        'transaction_id',
        'image_path',
        'caption',
        'visibility',
        'likes_count',
    ];

    protected function casts(): array
    {
        return [
            'likes_count' => 'integer',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function transaction()
    {
        return $this->belongsTo(Transaction::class);
    }

    public function likes()
    {
        return $this->belongsToMany(User::class, 'gallery_likes')->withTimestamps();
    }

    public function isLikedBy(?User $user): bool
    {
        if (!$user) return false;
        return $this->likes()->where('user_id', $user->id)->exists();
    }
}
