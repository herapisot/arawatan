<?php

namespace App\Traits;

use Illuminate\Support\Facades\Crypt;

trait HasEncryptedId
{
    /**
     * Boot the trait — automatically append encrypted_id to serialization.
     */
    public static function bootHasEncryptedId(): void
    {
        // Nothing needed here — we rely on the accessor + $appends.
    }

    /**
     * Get the encrypted_id attribute.
     */
    public function getEncryptedIdAttribute(): string
    {
        return Crypt::encryptString((string) $this->getKey());
    }
}
