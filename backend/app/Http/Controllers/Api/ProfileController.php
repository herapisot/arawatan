<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ProfileController extends Controller
{
    /**
     * Get authenticated user's profile with stats.
     */
    public function show(Request $request)
    {
        $user = $request->user();
        $user->load('badges');

        $stats = [
            'items_shared' => $user->donorTransactions()->where('status', 'completed')->count(),
            'items_received' => $user->receiverTransactions()->where('status', 'completed')->count(),
            'active_listings' => $user->items()->where('status', 'active')->count(),
            'completed_transactions' => $user->donorTransactions()->where('status', 'completed')->count()
                + $user->receiverTransactions()->where('status', 'completed')->count(),
        ];

        return response()->json([
            'user' => $user,
            'stats' => $stats,
        ]);
    }

    /**
     * Update profile.
     */
    public function update(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'first_name' => 'sometimes|string|max:255',
            'last_name' => 'sometimes|string|max:255',
            'campus' => 'sometimes|in:main,bongabong,victoria,pinamalayan',
            'avatar' => 'nullable|image|mimes:jpeg,png,jpg,webp|max:2048',
        ]);

        if ($request->hasFile('avatar')) {
            // Delete old avatar
            if ($user->avatar_url) {
                Storage::disk('public')->delete($user->avatar_url);
            }
            $validated['avatar_url'] = $request->file('avatar')->store('avatars', 'public');
            unset($validated['avatar']);
        }

        $user->update($validated);

        return response()->json($user->fresh());
    }

    /**
     * Get a public user profile.
     */
    public function publicProfile(User $user)
    {
        $user->load('badges');

        $stats = [
            'items_shared' => $user->donorTransactions()->where('status', 'completed')->count(),
            'items_received' => $user->receiverTransactions()->where('status', 'completed')->count(),
        ];

        return response()->json([
            'user' => $user->only(['id', 'first_name', 'last_name', 'campus', 'tier', 'points', 'avatar_url', 'created_at']),
            'stats' => $stats,
            'badges' => $user->badges,
        ]);
    }
}
