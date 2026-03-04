<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Traits\HasEncryptedId;

class Notification extends Model
{
    use HasEncryptedId;

    protected $appends = ['encrypted_id'];
    protected $fillable = [
        'user_id',
        'type',
        'title',
        'message',
        'link',
        'related_id',
        'related_type',
        'read_at',
    ];

    protected $casts = [
        'read_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function scopeUnread($query)
    {
        return $query->whereNull('read_at');
    }

    /**
     * Create a notification for a user.
     */
    public static function notify(int $userId, string $type, string $title, string $message, ?string $link = null, ?int $relatedId = null, ?string $relatedType = null): self
    {
        return self::create([
            'user_id' => $userId,
            'type' => $type,
            'title' => $title,
            'message' => $message,
            'link' => $link,
            'related_id' => $relatedId,
            'related_type' => $relatedType,
        ]);
    }
}
