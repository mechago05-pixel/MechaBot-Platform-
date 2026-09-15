<?php

declare(strict_types=1);

namespace MechaBot\Services;

use MechaBot\Mail\Mailer;

class EmailVerificationService
{
    private Mailer $mailer;

    public function __construct(Mailer $mailer)
    {
        $this->mailer = $mailer;
    }

    /**
     * Generate a verification code
     */
    public static function generateCode(): string
    {
        return strtoupper(bin2hex(random_bytes(4))); // 8-character code
    }

    /**
     * Generate a verification token
     */
    public static function generateToken(): string
    {
        return bin2hex(random_bytes(32)); // 64-character token
    }

    /**
     * Send verification email to user
     */
    public function sendVerificationEmail(string $email, string $fullName): string
    {
        $verificationCode = self::generateCode();

        // Store verification code in database
        global $db;
        try {
            $db->prepare(
                'INSERT INTO email_verifications (id, email, code, expires_at) 
                VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 24 HOUR))
                ON DUPLICATE KEY UPDATE code = VALUES(code), expires_at = VALUES(expires_at)'
            )->execute([uuid(), $email, $verificationCode]);
        } catch (\Exception $e) {
            error_log("Database error storing verification code: " . $e->getMessage());
            throw $e;
        }

        // Send email
        $sent = $this->mailer->sendVerificationEmail($email, $fullName, $verificationCode);

        if (!$sent) {
            throw new \Exception('Failed to send verification email');
        }

        return $verificationCode;
    }

    /**
     * Verify email with code
     */
    public function verifyEmailWithCode(string $email, string $code): bool
    {
        global $db;

        $stmt = $db->prepare(
            'SELECT 1 FROM email_verifications 
            WHERE email = ? AND code = ? AND expires_at > NOW()'
        );
        $stmt->execute([$email, $code]);

        $isValid = (bool) $stmt->fetchColumn();

        if ($isValid) {
            // Mark user as verified
            $db->prepare('UPDATE users SET email_verified = 1 WHERE email = ?')
                ->execute([$email]);

            // Delete verification record
            $db->prepare('DELETE FROM email_verifications WHERE email = ?')
                ->execute([$email]);
        }

        return $isValid;
    }

    /**
     * Check if email is verified
     */
    public function isEmailVerified(string $email): bool
    {
        global $db;

        $stmt = $db->prepare('SELECT email_verified FROM users WHERE email = ?');
        $stmt->execute([$email]);

        return (bool) $stmt->fetchColumn();
    }

    /**
     * Resend verification email
     */
    public function resendVerificationEmail(string $email): void
    {
        global $db;

        $stmt = $db->prepare('SELECT full_name FROM users WHERE email = ?');
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        if (!$user) {
            throw new \Exception('User not found');
        }

        $this->sendVerificationEmail($email, $user['full_name']);
    }
}
