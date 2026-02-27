<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Verification;
use Illuminate\Http\Request;

class AdminVerificationController extends Controller
{
    /**
     * List verifications with optional status filter.
     */
    public function index(Request $request)
    {
        $query = Verification::with(['user', 'reviewer']);

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $verifications = $query->latest('submitted_at')->paginate(20);

        return response()->json($verifications);
    }

    /**
     * Approve a verification.
     */
    public function approve(Request $request, Verification $verification)
    {
        $verification->update([
            'status' => 'approved',
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
        ]);

        // Update user verification status
        $verification->user->update([
            'is_verified' => true,
            'verification_status' => 'approved',
        ]);

        // Award badge for first verification
        $this->awardVerificationBadge($verification->user);

        return response()->json([
            'message' => 'Verification approved.',
            'verification' => $verification->fresh()->load('user'),
        ]);
    }

    /**
     * Reject a verification.
     */
    public function reject(Request $request, Verification $verification)
    {
        $request->validate([
            'rejection_reason' => 'required|string|max:500',
        ]);

        $verification->update([
            'status' => 'rejected',
            'rejection_reason' => $request->rejection_reason,
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
        ]);

        $verification->user->update([
            'verification_status' => 'rejected',
        ]);

        return response()->json([
            'message' => 'Verification rejected.',
            'verification' => $verification->fresh()->load('user'),
        ]);
    }

    private function awardVerificationBadge($user): void
    {
        $badge = \App\Models\Badge::where('name', 'First Exchange')->first();
        if ($badge && !$user->badges->contains($badge->id)) {
            $user->badges()->attach($badge->id, ['earned_at' => now()]);
        }
    }
}
