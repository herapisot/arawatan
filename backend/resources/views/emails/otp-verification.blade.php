<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verification Code</title>
    <style>
        body { margin: 0; padding: 0; background-color: #f4f7f6; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
        .container { max-width: 480px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
        .header { background: linear-gradient(135deg, #16a34a, #15803d); padding: 32px 24px; text-align: center; }
        .header h1 { color: #ffffff; margin: 0; font-size: 22px; font-weight: 700; }
        .header p { color: rgba(255,255,255,0.85); margin: 6px 0 0; font-size: 13px; }
        .body { padding: 32px 24px; text-align: center; }
        .body p { color: #4b5563; font-size: 14px; line-height: 1.6; margin: 0 0 20px; }
        .otp-box { background: #f0fdf4; border: 2px dashed #16a34a; border-radius: 10px; padding: 20px; margin: 24px 0; }
        .otp-code { font-size: 36px; font-weight: 800; letter-spacing: 10px; color: #15803d; font-family: 'Courier New', monospace; }
        .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px 16px; border-radius: 0 8px 8px 0; margin: 20px 0; text-align: left; }
        .warning p { color: #92400e; font-size: 12px; margin: 0; }
        .footer { padding: 20px 24px; text-align: center; border-top: 1px solid #e5e7eb; }
        .footer p { color: #9ca3af; font-size: 11px; margin: 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>MinSU ARAWATAN</h1>
            <p>Email Verification Code</p>
        </div>
        <div class="body">
            <p>Use the verification code below to complete your registration. Do not share this code with anyone.</p>
            <div class="otp-box">
                <div class="otp-code">{{ $otp }}</div>
            </div>
            <div class="warning">
                <p><strong>⏱ This code expires in 5 minutes.</strong></p>
                <p>If you did not request this code, please ignore this email.</p>
            </div>
        </div>
        <div class="footer">
            <p>This is an automated message from MinSU ARAWATAN. Please do not reply.</p>
        </div>
    </div>
</body>
</html>
