<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EmailOtp extends Model
{
    protected $fillable = [
        'email',
        'otp',
        'expires_at',
        'verified',
    ];

    protected $casts = [
        'expires_at' => 'datetime',
        'verified' => 'boolean',
    ];

    /**
     * Check if the OTP has expired.
     */
    public function isExpired(): bool
    {
        return $this->expires_at->isPast();
    }
}
