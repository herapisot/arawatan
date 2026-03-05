<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\VerifySchoolIdRequest;
use App\Models\Verification;
use App\Services\SchoolIdOcrService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class VerificationController extends Controller
{
    public function __construct(
        protected SchoolIdOcrService $ocrService
    ) {}

    /**
     * Upload ID image for OCR-based verification.
     *
     * Pipeline:
     * 1. Store the uploaded image.
     * 2. Run Tesseract OCR to extract text from the ID.
     * 3. Parse for a student number matching \d{4}-\d{4,6}.
     * 4. Validate the detected number matches the authenticated user's record.
     * 5. Score confidence and approve/reject automatically.
     */
    public function upload(VerifySchoolIdRequest $request)
    {
        $user = $request->user();

        // ── Already verified? ──────────────────────────────────────
        if ($user->is_verified) {
            return response()->json([
                'message'       => 'Your account is already verified.',
                'status'        => 'approved',
                'ai_confidence' => 99.0,
            ]);
        }

        // ── Pending request exists? ────────────────────────────────
        $existing = Verification::where('user_id', $user->id)
            ->whereIn('status', ['pending', 'processing'])
            ->first();

        if ($existing) {
            return response()->json([
                'message'      => 'You already have a pending verification request.',
                'verification' => $existing,
            ], 422);
        }

        // ── Store the image ────────────────────────────────────────
        $path = $request->file('id_image')->store('verifications', 'public');
        $absolutePath = Storage::disk('public')->path($path);

        // ── Build confidence score ─────────────────────────────────
        $confidenceScore = 0;
        $reasons = [];

        // 1. Email domain check (must be @minsu.edu.ph)
        if (str_ends_with($user->email, '@minsu.edu.ph')) {
            $confidenceScore += 25;
        } else {
            $reasons[] = 'Email is not from the MinSU domain (@minsu.edu.ph).';
        }

        // 2. Student/Employee ID format check on profile data
        // Accept both standard (YYYY-NNNNNN) and MinSU (MMCYYYY-NNNNN) formats
        if (preg_match('/^(?:MMC)?\d{4}-\d{4,6}$/i', $user->student_id)) {
            $confidenceScore += 15;
        } else {
            $reasons[] = 'Student/Employee ID format is invalid.';
        }

        // 3. Valid user type
        if (in_array($user->user_type, ['student', 'faculty', 'staff'])) {
            $confidenceScore += 5;
        } else {
            $reasons[] = 'Invalid user type.';
        }

        // 4. Image quality checks (size & dimensions)
        $file = $request->file('id_image');
        $fileSize = $file->getSize();
        if ($fileSize > 50_000 && $fileSize < 5_120_000) {
            $confidenceScore += 5;
        } else {
            $reasons[] = 'ID image file size is outside expected range.';
        }

        $imageInfo = @getimagesize($file->getRealPath());
        if ($imageInfo && $imageInfo[0] >= 200 && $imageInfo[1] >= 200) {
            $confidenceScore += 5;
        } else {
            $reasons[] = 'ID image resolution is too low.';
        }

        // ── 5. Tesseract OCR — full analysis ──────────────────────
        $analysis   = $this->ocrService->analyzeId($absolutePath);
        $detectedId = $analysis['detected_id'];
        $ocrText    = $analysis['raw_text'];

        // 5a. Student/Employee ID number — MUST match exactly
        $idMatched = false;
        if ($detectedId) {
            $confidenceScore += 10;
            if (strcasecmp($detectedId, $user->student_id) === 0) {
                $idMatched = true;
                $confidenceScore += 30;
            } elseif ($this->ocrService->matchesUser($detectedId, $user->id)) {
                $idMatched = true;
                $confidenceScore += 25;
            } else {
                // $reasons[] = "Student ID on the card ({$detectedId}) does not match your input ({$user->student_id}).";
                $reasons[] = "Student ID on the card does not match your input.";
            }
        } else {
            $reasons[] = 'Could not read a student number from the ID image. Upload a clear, well-lit photo.';
        }
        $nameResult = $this->ocrService->matchName($ocrText, $user->first_name, $user->last_name);
        $nameMatched = $nameResult['full_match'];

        if ($nameMatched) {
            $confidenceScore += 15;
        } else {
            if (!$nameResult['first_name_match']) {
                $reasons[] = "First name \"{$user->first_name}\" was not found on the ID.";
            }
            if (!$nameResult['last_name_match']) {
                $reasons[] = "Last name \"{$user->last_name}\" was not found on the ID.";
            }
        }

        // 5c. Institution check — the ID must belong to MinSU
        if ($analysis['institution_found']) {
            $confidenceScore += 10;
        } else {
            $reasons[] = 'The ID does not appear to be from Mindoro State University.';
        }

        // 5d. Logo comparison with reference image (bonus)
        if ($analysis['logo_match']) {
            $confidenceScore += 5;
        }

        // ── HARD FAIL: reject if student ID or name didn't match ──
        // Even if the score is high, these are non-negotiable.
        if (!$idMatched) {
            $confidenceScore = min($confidenceScore, 40); // force below threshold
        }
        if (!$nameMatched) {
            $confidenceScore = min($confidenceScore, 50); // force below threshold
        }

        // Cap at 99.9
        $confidenceScore = min(99.9, round($confidenceScore, 2));

        // ── Decision: threshold = 70% ──────────────────────────────
        $isApproved = $confidenceScore >= 70;

        $verification = Verification::create([
            'user_id'          => $user->id,
            'id_image_path'    => $path,
            'status'           => $isApproved ? 'approved' : 'rejected',
            'ai_confidence'    => $confidenceScore,
            'rejection_reason' => $isApproved ? null : implode(' ', $reasons),
            'submitted_at'     => now(),
            'reviewed_at'      => now(),
        ]);

        if ($isApproved) {
            $user->update([
                'is_verified'         => true,
                'verification_status' => 'approved',
            ]);
        } else {
            $user->update([
                'verification_status' => 'rejected',
            ]);
        }

        return response()->json([
            'message'       => $isApproved
                ? 'Your MinSU ID has been verified successfully!'
                : 'Could not verify your MinSU ID. Please try again with a clearer photo.',
            'status'        => $verification->status,
            'ai_confidence' => $confidenceScore,
            'ocr_detected'  => $detectedId,
            'reasons'       => $isApproved ? [] : $reasons,
            'checks'        => [
                'id_number_match'    => $idMatched,
                'first_name_match'   => $nameResult['first_name_match'] ?? false,
                'last_name_match'    => $nameResult['last_name_match'] ?? false,
                'institution_found'  => $analysis['institution_found'] ?? false,
                'logo_match'         => $analysis['logo_match'] ?? false,
            ],
            'verification'  => $verification,
        ]);
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
