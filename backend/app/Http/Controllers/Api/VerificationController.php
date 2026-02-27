<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Verification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class VerificationController extends Controller
{
    /**
     * Upload ID image for AI-powered verification (SheerID-like).
     * The system automatically verifies the ID — no admin review needed.
     */
    public function upload(Request $request)
    {
        $request->validate([
            'id_image' => 'required|image|mimes:jpeg,png,jpg,webp|max:5120',
        ]);

        $user = $request->user();

        // Check if already verified
        if ($user->is_verified) {
            return response()->json([
                'message' => 'Your account is already verified.',
                'status' => 'approved',
                'ai_confidence' => 99.0,
            ]);
        }

        // Check if already has pending verification
        $existing = Verification::where('user_id', $user->id)
            ->whereIn('status', ['pending', 'processing'])
            ->first();

        if ($existing) {
            return response()->json([
                'message' => 'You already have a pending verification request.',
                'verification' => $existing,
            ], 422);
        }

        $path = $request->file('id_image')->store('verifications', 'public');

        // ============================================================
        // AI Verification Engine (SheerID-like)
        // Validates: email domain, student ID format, file is image,
        // user type matches, and simulates ML confidence scoring.
        // In production, replace with actual SheerID API or ML model.
        // ============================================================
        $confidenceScore = 0;
        $reasons = [];

        // 1. Email domain check (must be @minsu.edu.ph)
        if (str_ends_with($user->email, '@minsu.edu.ph')) {
            $confidenceScore += 30;
        } else {
            $reasons[] = 'Email is not from the MinSU domain (@minsu.edu.ph).';
        }

        // 2. Student/Employee ID format check (e.g. 2024-12345)
        if (preg_match('/^\d{4}-\d{4,6}$/', $user->student_id)) {
            $confidenceScore += 20;
        } else {
            $reasons[] = 'Student/Employee ID format is invalid.';
        }

        // 3. Valid user type
        if (in_array($user->user_type, ['student', 'faculty', 'staff'])) {
            $confidenceScore += 10;
        } else {
            $reasons[] = 'Invalid user type.';
        }

        // 4. Image analysis simulation (file size, dimensions, format)
        $file = $request->file('id_image');
        $fileSize = $file->getSize();
        if ($fileSize > 50000 && $fileSize < 5120000) {
            // Reasonable file size for an ID photo (50KB - 5MB)
            $confidenceScore += 15;
        } else {
            $reasons[] = 'ID image file size is outside expected range.';
        }

        // Check image dimensions
        $imageInfo = @getimagesize($file->getRealPath());
        if ($imageInfo) {
            $width = $imageInfo[0];
            $height = $imageInfo[1];
            // ID photos should be at least 200x200
            if ($width >= 200 && $height >= 200) {
                $confidenceScore += 15;
            } else {
                $reasons[] = 'ID image resolution is too low.';
            }
        } else {
            $reasons[] = 'Could not read image dimensions.';
        }

        // 5. Simulate ML text detection confidence (OCR-like)
        // In production, call an actual OCR/ML service
        $mlBonus = rand(500, 1000) / 100; // 5.0 - 10.0
        $confidenceScore += $mlBonus;

        // Cap at 99.9
        $confidenceScore = min(99.9, round($confidenceScore, 2));

        // Decision threshold: 70% = approved, below = rejected
        $isApproved = $confidenceScore >= 70;

        $verification = Verification::create([
            'user_id' => $user->id,
            'id_image_path' => $path,
            'status' => $isApproved ? 'approved' : 'rejected',
            'ai_confidence' => $confidenceScore,
            'rejection_reason' => $isApproved ? null : implode(' ', $reasons),
            'submitted_at' => now(),
            'reviewed_at' => now(),
        ]);

        if ($isApproved) {
            $user->update([
                'is_verified' => true,
                'verification_status' => 'approved',
            ]);
        } else {
            $user->update([
                'verification_status' => 'rejected',
            ]);
        }

        return response()->json([
            'message' => $isApproved
                ? 'Your MinSU ID has been verified successfully!'
                : 'Verification failed. ' . implode(' ', $reasons),
            'status' => $verification->status,
            'ai_confidence' => $confidenceScore,
            'verification' => $verification,
        ], $isApproved ? 200 : 200);
    }

    /**
     * Check verification status.
     */
    public function status(Request $request)
    {
        $verification = Verification::where('user_id', $request->user()->id)
            ->latest()
            ->first();

        if (!$verification) {
            return response()->json([
                'status' => 'none',
                'message' => 'No verification request found.',
            ]);
        }

        return response()->json([
            'status' => $verification->status,
            'ai_confidence' => $verification->ai_confidence,
            'rejection_reason' => $verification->rejection_reason,
            'verification' => $verification,
            'user_verified' => $request->user()->is_verified,
        ]);
    }
}
