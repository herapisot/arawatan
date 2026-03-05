<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Traits\HasEncryptedId;

class ForumComment extends Model
{
    use HasEncryptedId;

    protected $table = 'forum_comments';
    protected $appends = ['encrypted_id'];

    protected $fillable = [
        'gallery_post_id',
        'user_id',
        'body',
        'status',
        'rejection_reason',
    ];

    public function post()
    {
        return $this->belongsTo(ForumPost::class, 'gallery_post_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
