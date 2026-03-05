<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Mail\Mailables\Address;
use Illuminate\Queue\SerializesModels;

class OtpVerificationMail extends Mailable
{
    use Queueable, SerializesModels;

    public string $otp;

    public function __construct(string $otp)
    {
        $this->otp = $otp;
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            from: new Address('noreply@minsu.edu.ph', 'MinSU ARAWATAN'),
            subject: 'Your MinSU ARAWATAN Verification Code',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.otp-verification',
        );
    }
}
