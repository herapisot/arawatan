<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EmailOtp;
use App\Mail\OtpVerificationMail;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Log;
use Throwable;

class OtpController extends Controller
{
    /**
     * Send an OTP to the given email address.
     * Rate limited to 3 attempts per 5 minutes per email.
     */
    public function send(Request $request)
    {
        $request->validate([
            'email' => 'required|email|max:255',
        ]);

        $email = strtolower($request->email);

        // Validate MinSU email domain
        if (!str_ends_with($email, '@minsu.edu.ph')) {
            return response()->json([
                'message' => 'Only MinSU email addresses (@minsu.edu.ph) are allowed.',
            ], 422);
        }

        // Rate limit: max 3 OTP sends per email every 5 minutes
        $rateLimitKey = 'otp-send:' . $email;
        if (RateLimiter::tooManyAttempts($rateLimitKey, 3)) {
            $seconds = RateLimiter::availableIn($rateLimitKey);
            return response()->json([
                'message' => "Too many OTP requests. Please try again in {$seconds} seconds.",
            ], 429);
        }
        RateLimiter::hit($rateLimitKey, 300); // 5 min window

        // Invalidate any existing OTPs for this email
        EmailOtp::where('email', $email)->delete();

        // Generate a 6-digit OTP
        $otp = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        // Store otp with 5-minute expiry
        $emailOtp = EmailOtp::create([
            'email' => $email,
            'otp' => $otp,
            'expires_at' => now()->addMinutes(5),
        ]);

        // Send the email
        try {
            Mail::to($email)->send(new OtpVerificationMail($otp));
        } catch (Throwable $e) {
            // Remove the unusable OTP and reset the limiter because no email was delivered.
            $emailOtp->delete();
            RateLimiter::clear($rateLimitKey);

            Log::error('OTP email failed.', [
                'email' => $email,
                'mailer' => config('mail.default'),
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'message' => 'Unable to send the verification code right now. Please try again later.',
            ], 503);
        }

        $response = [
            'message' => 'OTP sent successfully.',
        ];

        return response()->json($response);
    }

    /**
     * Verify an OTP for the given email.
     */
    public function verify(Request $request)
    {
        $request->validate([
            'email' => 'required|email|max:255',
            'otp' => 'required|string|size:6',
        ]);

        $email = strtolower($request->email);

        // Rate limit: max 5 verify attempts per email every 5 minutes
        $rateLimitKey = 'otp-verify:' . $email;
        if (RateLimiter::tooManyAttempts($rateLimitKey, 5)) {
            $seconds = RateLimiter::availableIn($rateLimitKey);
            return response()->json([
                'message' => "Too many attempts. Please try again in {$seconds} seconds.",
            ], 429);
        }
        RateLimiter::hit($rateLimitKey, 300);

        $record = EmailOtp::where('email', $email)
            ->where('verified', false)
            ->latest()
            ->first();

        if (!$record) {
            return response()->json([
                'message' => 'No OTP found. Please request a new one.',
            ], 422);
        }

        if ($record->isExpired()) {
            $record->delete();
            return response()->json([
                'message' => 'OTP has expired. Please request a new one.',
            ], 422);
        }

        if ($record->otp !== $request->otp) {
            return response()->json([
                'message' => 'Invalid OTP. Please try again.',
            ], 422);
        }

        // Mark as verified
        $record->update(['verified' => true]);

        // Clear rate limiters on success
        RateLimiter::clear($rateLimitKey);

        return response()->json([
            'message' => 'Email verified successfully.',
            'verified' => true,
        ]);
    }
}
