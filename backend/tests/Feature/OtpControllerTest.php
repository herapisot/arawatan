<?php

use App\Mail\OtpVerificationMail;
use App\Models\EmailOtp;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;

uses(RefreshDatabase::class);

it('sends an otp to a minsu email address', function () {
    Mail::fake();

    $response = $this->postJson('/api/otp/send', [
        'email' => 'student@minsu.edu.ph',
    ]);

    $response
        ->assertOk()
        ->assertJson([
            'message' => 'OTP sent successfully.',
        ]);

    $otpRecord = EmailOtp::query()->where('email', 'student@minsu.edu.ph')->first();

    expect($otpRecord)->not->toBeNull();
    expect($otpRecord->otp)->toHaveLength(6);
    expect($otpRecord->verified)->toBeFalse();

    Mail::assertSent(OtpVerificationMail::class, function (OtpVerificationMail $mail) {
        return $mail->hasTo('student@minsu.edu.ph');
    });
});

it('rejects non-minsu email addresses', function () {
    Mail::fake();

    $response = $this->postJson('/api/otp/send', [
        'email' => 'student@example.com',
    ]);

    $response
        ->assertStatus(422)
        ->assertJson([
            'message' => 'Only MinSU email addresses (@minsu.edu.ph) are allowed.',
        ]);

    expect(EmailOtp::query()->count())->toBe(0);
    Mail::assertNothingSent();
});

it('returns an error and removes the otp when mail delivery fails', function () {
    Mail::shouldReceive('to')
        ->once()
        ->with('student@minsu.edu.ph')
        ->andReturn(new class
        {
            public function send($mailable): void
            {
                throw new RuntimeException('SMTP unavailable');
            }
        });

    $response = $this->postJson('/api/otp/send', [
        'email' => 'student@minsu.edu.ph',
    ]);

    $response
        ->assertStatus(503)
        ->assertJson([
            'message' => 'Unable to send the verification code right now. Please try again later.',
        ]);

    expect(EmailOtp::query()->count())->toBe(0);
});
