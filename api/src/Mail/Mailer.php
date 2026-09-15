<?php

declare(strict_types=1);

namespace MechaBot\Mail;

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

class Mailer
{
    private static ?self $instance = null;
    private PHPMailer $mailer;

    private function __construct()
    {
        $this->mailer = new PHPMailer(true);
        $this->configureSMTP();
    }

    public static function getInstance(): self
    {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    private function configureSMTP(): void
    {
        try {
            $this->mailer->isSMTP();
            $this->mailer->Host = env_value('MAIL_HOST', 'smtp.gmail.com');
            $this->mailer->Port = (int) env_value('MAIL_PORT', '587');
            $this->mailer->SMTPAuth = true;
            $this->mailer->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
            $this->mailer->Username = env_value('MAIL_USERNAME', '');
            $this->mailer->Password = env_value('MAIL_PASSWORD', '');
            $this->mailer->CharSet = 'UTF-8';
            $this->mailer->setFrom(
                env_value('MAIL_FROM_ADDRESS', 'noreply@mechabot.local'),
                env_value('MAIL_FROM_NAME', 'MechaBot Platform')
            );
        } catch (Exception $e) {
            error_log("Mailer configuration error: " . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Send an email
     *
     * @param string $toEmail Recipient email
     * @param string $toName Recipient name
     * @param string $subject Email subject
     * @param string $htmlBody HTML email body
     * @param string|null $plainText Plain text fallback
     * @return bool True if sent successfully
     */
    public function send(
        string $toEmail,
        string $toName,
        string $subject,
        string $htmlBody,
        ?string $plainText = null
    ): bool {
        try {
            $this->mailer->addAddress($toEmail, $toName);
            $this->mailer->isHTML(true);
            $this->mailer->Subject = $subject;
            $this->mailer->Body = $htmlBody;
            $this->mailer->AltBody = $plainText ?? strip_tags($htmlBody);

            $result = $this->mailer->send();

            // Clear recipients for next use
            $this->mailer->clearAddresses();

            return $result;
        } catch (Exception $e) {
            error_log("Email send error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Send email verification code
     */
    public function sendVerificationEmail(string $email, string $fullName, string $verificationCode): bool
    {
        $verificationLink = env_value('APP_URL', 'http://localhost:5173') . '/verify-email?code=' . urlencode($verificationCode) . '&email=' . urlencode($email);

        $subject = 'Verify Your Email - MechaBot Platform';

        $htmlBody = <<<HTML
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .code { background: white; border: 2px solid #e0e0e0; padding: 15px; text-align: center; font-size: 18px; font-weight: bold; letter-spacing: 2px; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; font-size: 12px; color: #999; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🤖 MechaBot Platform</h1>
            <p>Email Verification</p>
        </div>
        <div class="content">
            <h2>Hello {$fullName},</h2>
            <p>Thank you for signing up with MechaBot Platform! To complete your registration, please verify your email address by clicking the button below:</p>
            
            <a href="{$verificationLink}" class="button">Verify Email Address</a>
            
            <p>Or use this verification code:</p>
            <div class="code">{$verificationCode}</div>
            
            <p>This verification link will expire in 24 hours.</p>
            
            <p>If you didn't create this account, please ignore this email.</p>
            
            <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
            <p><strong>Why we need this:</strong> Email verification ensures your account is secure and that we can contact you about your service requests.</p>
        </div>
        <div class="footer">
            <p>&copy; 2026 MechaBot Platform. All rights reserved.</p>
            <p>If you have questions, contact support@mechabot.local</p>
        </div>
    </div>
</body>
</html>
HTML;

        return $this->send($email, $fullName, $subject, $htmlBody);
    }

    /**
     * Send password reset email
     */
    public function sendPasswordResetEmail(string $email, string $fullName, string $resetCode): bool
    {
        $resetLink = env_value('APP_URL', 'http://localhost:5173') . '/reset-password?code=' . urlencode($resetCode) . '&email=' . urlencode($email);

        $subject = 'Reset Your Password - MechaBot Platform';

        $htmlBody = <<<HTML
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; background: #f5576c; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .code { background: white; border: 2px solid #e0e0e0; padding: 15px; text-align: center; font-size: 18px; font-weight: bold; letter-spacing: 2px; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; font-size: 12px; color: #999; margin-top: 20px; }
        .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; border-radius: 5px; margin: 15px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🤖 MechaBot Platform</h1>
            <p>Password Reset Request</p>
        </div>
        <div class="content">
            <h2>Hello {$fullName},</h2>
            <p>We received a request to reset your password. Click the button below to create a new password:</p>
            
            <a href="{$resetLink}" class="button">Reset Password</a>
            
            <p>Or use this reset code:</p>
            <div class="code">{$resetCode}</div>
            
            <div class="warning">
                <strong>⚠️ Security Notice:</strong> This link will expire in 1 hour. If you didn't request this reset, please ignore this email and your password will remain unchanged.
            </div>
            
            <p>For security reasons, we'll never ask you to share your password via email.</p>
        </div>
        <div class="footer">
            <p>&copy; 2026 MechaBot Platform. All rights reserved.</p>
            <p>If you have questions, contact support@mechabot.local</p>
        </div>
    </div>
</body>
</html>
HTML;

        return $this->send($email, $fullName, $subject, $htmlBody);
    }

    /**
     * Send mechanic approval notification
     */
    public function sendMechanicApprovalEmail(string $email, string $fullName, bool $approved): bool
    {
        $status = $approved ? 'Approved' : 'Rejected';
        $color = $approved ? '#28a745' : '#dc3545';
        $gradient = $approved ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)';
        $message = $approved
            ? 'Congratulations! Your mechanic profile has been approved. You can now start accepting service requests.'
            : 'Unfortunately, your mechanic profile application was not approved at this time. Please review the requirements and reapply.';

        $subject = "Mechanic Profile {$status} - MechaBot Platform";

        $htmlBody = <<<HTML
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: {$gradient}; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; background: {$color}; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; font-size: 12px; color: #999; margin-top: 20px; }
        .status { background: white; border-left: 4px solid {$color}; padding: 15px; border-radius: 5px; margin: 15px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🤖 MechaBot Platform</h1>
            <p>Mechanic Profile Status Update</p>
        </div>
        <div class="content">
            <h2>Hello {$fullName},</h2>
            
            <div class="status">
                <strong>Status: {$status}</strong>
            </div>
            
            <p>{$message}</p>
            
            <a href="http://localhost:5173/dashboard" class="button">Go to Dashboard</a>
            
            <p>If you have any questions, please contact our support team.</p>
        </div>
        <div class="footer">
            <p>&copy; 2026 MechaBot Platform. All rights reserved.</p>
            <p>If you have questions, contact support@mechabot.local</p>
        </div>
    </div>
</body>
</html>
HTML;

        return $this->send($email, $fullName, $subject, $htmlBody);
    }

    /**
     * Send service request notification
     */
    public function sendServiceRequestNotification(string $email, string $fullName, string $requestDetails): bool
    {
        $subject = 'New Service Request Available - MechaBot Platform';

        $htmlBody = <<<HTML
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; font-size: 12px; color: #999; margin-top: 20px; }
        .details { background: white; border: 2px solid #e0e0e0; padding: 15px; border-radius: 5px; margin: 15px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🤖 MechaBot Platform</h1>
            <p>Service Request Alert</p>
        </div>
        <div class="content">
            <h2>Hello {$fullName},</h2>
            <p>A new service request matching your specialties is available!</p>
            
            <div class="details">
                {$requestDetails}
            </div>
            
            <a href="http://localhost:5173/dashboard" class="button">View Request</a>
            
            <p>Log in to your dashboard to see all available requests and accept the ones you can help with.</p>
        </div>
        <div class="footer">
            <p>&copy; 2026 MechaBot Platform. All rights reserved.</p>
            <p>If you have questions, contact support@mechabot.local</p>
        </div>
    </div>
</body>
</html>
HTML;

        return $this->send($email, $fullName, $subject, $htmlBody);
    }
}
