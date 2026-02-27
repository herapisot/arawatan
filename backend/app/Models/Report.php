<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Report extends Model
{
    protected $fillable = [
        'item_id',
        'user_id',
        'reporter_id',
        'reported_by',
        'reason',
        'ai_confidence',
        'severity',
        'status',
        'reviewed_by',
        'enforcement_action',
        'reviewed_at',
    ];

    protected function casts(): array
    {
        return [
            'ai_confidence' => 'decimal:2',
            'reviewed_at' => 'datetime',
        ];
    }

    public function item()
    {
        return $this->belongsTo(Item::class);
    }

    public function reportedUser()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function reporter()
    {
        return $this->belongsTo(User::class, 'reporter_id');
    }

    public function reviewer()
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }
}
