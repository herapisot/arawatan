<?php

namespace App\Traits;

use Illuminate\Support\Facades\Crypt;
use Illuminate\Contracts\Encryption\DecryptException;

trait EncryptsRouteIds
{
    /**
     * Encrypt a numeric ID for use in URLs.
     */
    protected function encryptId(int|string $id): string
    {
        return Crypt::encryptString((string) $id);
    }

    /**
     * Decrypt an encrypted ID from a route parameter.
     * Returns the numeric ID or null on failure.
     */
    protected function decryptId(string $encryptedId): ?int
    {
        try {
            $id = Crypt::decryptString($encryptedId);
            return is_numeric($id) ? (int) $id : null;
        } catch (DecryptException $e) {
            return null;
        }
    }

    /**
     * Decrypt an encrypted ID and find a model instance.
     * Returns a JSON error response (400) if decryption fails or model not found.
     *
     * @param  string  $encryptedId
     * @param  string  $modelClass  Fully-qualified model class name
     * @param  array   $with        Relations to eager-load
     * @return \Illuminate\Database\Eloquent\Model|\Illuminate\Http\JsonResponse
     */
    protected function findByEncryptedId(string $encryptedId, string $modelClass, array $with = [])
    {
        $id = $this->decryptId($encryptedId);

        if ($id === null) {
            return response()->json(['message' => 'Invalid or malformed ID.'], 400);
        }

        $query = $modelClass::query();
        if (!empty($with)) {
            $query->with($with);
        }

        $model = $query->find($id);

        if (!$model) {
            return response()->json(['message' => 'Resource not found.'], 404);
        }

        return $model;
    }

    /**
     * Check if the result of findByEncryptedId is an error response.
     */
    protected function isErrorResponse($result): bool
    {
        return $result instanceof \Illuminate\Http\JsonResponse;
    }
}
