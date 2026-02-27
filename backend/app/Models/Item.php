<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Item extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'title',
        'description',
        'category',
        'condition',
        'campus',
        'meetup_location',
        'status',
        'is_verified',
        'views_count',
        'posted_at',
    ];

    protected function casts(): array
    {
        return [
            'is_verified' => 'boolean',
            'views_count' => 'integer',
            'posted_at' => 'datetime',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function images()
    {
        return $this->hasMany(ItemImage::class)->orderBy('sort_order');
    }

    public function primaryImage()
    {
        return $this->hasOne(ItemImage::class)->where('is_primary', true);
    }

    public function transactions()
    {
        return $this->hasMany(Transaction::class);
    }

    public function conversations()
    {
        return $this->hasMany(Conversation::class);
    }

    public function reports()
    {
        return $this->hasMany(Report::class);
    }
}
