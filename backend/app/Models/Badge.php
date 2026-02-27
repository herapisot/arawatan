<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Badge extends Model
{
    protected $fillable = [
        'name',
        'icon',
        'description',
        'points_required',
    ];

    protected function casts(): array
    {
        return [
            'points_required' => 'integer',
        ];
    }

    public function users()
    {
        return $this->belongsToMany(User::class, 'badge_user')->withPivot('earned_at');
    }
}
