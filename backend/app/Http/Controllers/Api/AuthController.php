<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Verification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Illuminate\Validation\Rule;

class AuthController extends Controller
{
    /**
     * Register a new user.
     *
     * If a previous user registered with the same email or student_id
     * but was NEVER verified (verification_status = 'rejected' or 'pending'
     * AND is_verified = false), that stale account is removed first so
     * the new registration can proceed.
     */
    public function register(Request $request)
    {
        // ── Clean up unverified accounts that would block uniqueness ──
        // Delete users who registered with the same email or student_id
        // but never completed verification (not verified & not approved).
        $staleUsers = User::where(function ($q) use ($request) {
                $q->where('email', $request->email)
                  ->orWhere('student_id', $request->student_id);
            })
            ->where('is_verified', false)
            ->where('verification_status', '!=', 'approved')
            ->get();

        foreach ($staleUsers as $staleUser) {
            // Remove their verification records & tokens first
            Verification::where('user_id', $staleUser->id)->delete();
            $staleUser->tokens()->delete();
            $staleUser->delete();
        }

        // ── Validate (unique check now only hits verified/approved users) ──
        $validated = $request->validate([
            'first_name' => 'required|string|max:255',
            'last_name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'student_id' => 'required|string|max:50|unique:users',
            'campus' => 'required|in:main,bongabong,victoria,pinamalayan',
            'user_type' => 'required|in:student,faculty,staff',
            'password' => 'required|string|min:8|confirmed',
        ]);

        $user = User::create([
            'first_name' => $validated['first_name'],
            'last_name' => $validated['last_name'],
            'email' => $validated['email'],
            'student_id' => $validated['student_id'],
            'campus' => $validated['campus'],
            'user_type' => $validated['user_type'],
            'password' => $validated['password'],
        ]);

        $token = $user->createToken('auth-token')->plainTextToken;

        return response()->json([
            'user' => $user,
            'token' => $token,
        ], 201);
    }

    /**
     * Login an existing user.
     */
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|string|email',
            'password' => 'required|string',
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        // Revoke previous tokens
        $user->tokens()->delete();

        $token = $user->createToken('auth-token')->plainTextToken;

        return response()->json([
            'user' => $user,
            'token' => $token,
        ]);
    }

    /**
     * Logout the current user.
     */
    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out successfully']);
    }

    /**
     * Get the authenticated user.
     */
    public function user(Request $request)
    {
        $user = $request->user()->load('badges');
        return response()->json($user);
    }
}
