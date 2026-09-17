<?php

declare(strict_types=1);

// Copy .env.example to .env and set your WAMP MySQL credentials. Do not commit .env.
function env_value(string $key, ?string $default = null): ?string
{
    static $values = null;
    $fromEnv = getenv($key);
    if ($fromEnv !== false && $fromEnv !== '') {
        return $fromEnv;
    }
    if ($values === null) {
        $values = [];
        $file = __DIR__ . '/.env';
        if (is_file($file)) {
            foreach (file($file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
                if (str_starts_with(trim($line), '#') || !str_contains($line, '=')) continue;
                [$name, $value] = explode('=', $line, 2);
                $values[trim($name)] = trim($value);
            }
        }
    }
    return $values[$key] ?? $default;
}

function email_verification_required(): bool
{
    $flag = strtolower((string) env_value('VERIFY_EMAIL_ENABLED', ''));
    if ($flag === 'true' || $flag === '1') return true;
    if ($flag === 'false' || $flag === '0') return false;
    return env_value('MAIL_USERNAME', '') !== '';
}

function db_driver(): string
{
    static $driver = null;
    if ($driver === null) {
        $driver = strtolower((string) env_value('DB_DRIVER', 'sqlite')) === 'mysql' ? 'mysql' : 'sqlite';
    }
    return $driver;
}

/**
 * SQL expression for "now +/- N seconds", portable across MySQL and SQLite.
 */
function sql_time_offset(int $seconds): string
{
    if (db_driver() === 'mysql') {
        if ($seconds === 0) return 'NOW()';
        return $seconds > 0
            ? 'DATE_ADD(NOW(), INTERVAL ' . $seconds . ' SECOND)'
            : 'DATE_SUB(NOW(), INTERVAL ' . (-$seconds) . ' SECOND)';
    }
    return $seconds === 0
        ? "datetime('now')"
        : "datetime('now', '" . ($seconds > 0 ? '+' : '-') . abs($seconds) . " seconds')";
}

/**
 * Upsert suffix for a statement ending with VALUES (...).
 */
function sql_upsert(string $mysqlClause, string $sqliteClause): string
{
    return db_driver() === 'mysql' ? $mysqlClause : $sqliteClause;
}

function db(): PDO
{
    static $pdo = null;
    if ($pdo === null) {
        $attrs = [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ];
        if (db_driver() === 'mysql') {
            $dsn = sprintf('mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4', env_value('DB_HOST', '127.0.0.1'), env_value('DB_PORT', '3306'), env_value('DB_NAME', 'mechabot'));
            $pdo = new PDO($dsn, env_value('DB_USER', 'root'), env_value('DB_PASSWORD', ''), $attrs);
        } else {
            $dataDir = rtrim((string) env_value('SQLITE_DIR', __DIR__ . '/data'), '/\\');
            if (!is_dir($dataDir) && !mkdir($dataDir, 0775, true) && !is_dir($dataDir)) {
                throw new RuntimeException("Unable to create SQLite data directory: {$dataDir}");
            }
            $pdo = new PDO('sqlite:' . $dataDir . '/mechabot.sqlite', null, null, $attrs);
            $pdo->exec('PRAGMA journal_mode = WAL');
            $pdo->exec('PRAGMA foreign_keys = ON');
            $pdo->exec('PRAGMA busy_timeout = 5000');
            try {
                $pdo->query('SELECT 1 FROM users LIMIT 1');
            } catch (Throwable $e) {
                foreach (sqlite_schema_statements() as $statement) {
                    $pdo->exec($statement);
                }
            }
        }
    }
    return $pdo;
}

/**
 * Full schema for SQLite deployments (MySQL ENUM columns become TEXT + CHECK,
 * inline MySQL indexes become separate CREATE INDEX statements).
 */
function sqlite_schema_statements(): array
{
    return [
        "CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            full_name TEXT NOT NULL,
            phone TEXT,
            role TEXT NOT NULL DEFAULT 'client' CHECK (role IN ('admin','client','mechanic')),
            is_blocked INTEGER NOT NULL DEFAULT 0,
            email_verified INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )",
        "CREATE TABLE IF NOT EXISTS user_roles (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            role TEXT NOT NULL CHECK (role IN ('admin','client','mechanic')),
            UNIQUE (user_id, role),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )",
        "CREATE TABLE IF NOT EXISTS profiles (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL UNIQUE,
            full_name TEXT NOT NULL,
            phone TEXT,
            avatar_url TEXT,
            is_blocked INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )",
        "CREATE TABLE IF NOT EXISTS mechanic_profiles (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL UNIQUE,
            full_name TEXT,
            nida_number TEXT,
            email TEXT,
            phone TEXT,
            specialties TEXT NOT NULL DEFAULT '[]',
            garage_location TEXT,
            certification_urls TEXT,
            profile_image_url TEXT,
            approval_status TEXT NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending','approved','rejected')),
            is_online INTEGER NOT NULL DEFAULT 0,
            availability_status TEXT NOT NULL DEFAULT 'available',
            rating REAL DEFAULT 0,
            total_reviews INTEGER DEFAULT 0,
            experience_years INTEGER DEFAULT 0,
            tier TEXT DEFAULT 'silver',
            lat REAL,
            lng REAL,
            badge TEXT,
            is_blocked INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )",
        "CREATE TABLE IF NOT EXISTS mechanic_locations (
            id TEXT PRIMARY KEY,
            mechanic_id TEXT NOT NULL UNIQUE,
            latitude REAL NOT NULL DEFAULT -6.7924,
            longitude REAL NOT NULL DEFAULT 39.2083,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (mechanic_id) REFERENCES mechanic_profiles(id) ON DELETE CASCADE
        )",
        "CREATE TABLE IF NOT EXISTS service_requests (
            id TEXT PRIMARY KEY,
            client_id TEXT NOT NULL,
            mechanic_id TEXT,
            category TEXT NOT NULL,
            description TEXT,
            car_model TEXT,
            car_year TEXT,
            vehicle_size TEXT NOT NULL DEFAULT 'medium' CHECK (vehicle_size IN ('small','medium','large')),
            client_lat REAL,
            client_lng REAL,
            status TEXT NOT NULL DEFAULT 'pending',
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (mechanic_id) REFERENCES users(id) ON DELETE SET NULL
        )",
        "CREATE TABLE IF NOT EXISTS orders (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            mechanic_id TEXT NOT NULL,
            description TEXT,
            problem TEXT,
            car_category TEXT,
            location TEXT,
            status TEXT NOT NULL DEFAULT 'pending',
            estimated_price INTEGER,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )",
        "CREATE TABLE IF NOT EXISTS notifications (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            type TEXT NOT NULL DEFAULT 'info',
            message TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'unread' CHECK (status IN ('unread','read')),
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )",
        "CREATE TABLE IF NOT EXISTS messages (
            id TEXT PRIMARY KEY,
            request_id TEXT NOT NULL,
            sender_id TEXT NOT NULL,
            receiver_id TEXT NOT NULL,
            message TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'unread' CHECK (status IN ('unread','read')),
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (request_id) REFERENCES service_requests(id) ON DELETE CASCADE,
            FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
        )",
        "CREATE TABLE IF NOT EXISTS mechanic_ratings (
            id TEXT PRIMARY KEY,
            request_id TEXT NOT NULL UNIQUE,
            client_id TEXT NOT NULL,
            mechanic_id TEXT NOT NULL,
            rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
            comment TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (request_id) REFERENCES service_requests(id) ON DELETE CASCADE,
            FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (mechanic_id) REFERENCES users(id) ON DELETE CASCADE
        )",
        "CREATE TABLE IF NOT EXISTS activity_logs (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            action TEXT NOT NULL,
            table_name TEXT,
            record_id TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
        )",
        "CREATE TABLE IF NOT EXISTS service_prices (
            id TEXT PRIMARY KEY,
            service_name_en TEXT NOT NULL,
            service_name_sw TEXT NOT NULL,
            car_size TEXT NOT NULL DEFAULT 'medium' CHECK (car_size IN ('small','medium','large')),
            estimated_price INTEGER NOT NULL DEFAULT 0,
            problem TEXT,
            possible_cause TEXT,
            min_price INTEGER,
            max_price INTEGER,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )",
        "CREATE TABLE IF NOT EXISTS email_verifications (
            id TEXT PRIMARY KEY,
            email TEXT NOT NULL UNIQUE,
            code TEXT NOT NULL,
            expires_at TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )",
        "CREATE INDEX IF NOT EXISTS request_client ON service_requests (client_id)",
        "CREATE INDEX IF NOT EXISTS request_mechanic_status ON service_requests (mechanic_id, status)",
        "CREATE INDEX IF NOT EXISTS request_client_location ON service_requests (client_lat, client_lng)",
        "CREATE INDEX IF NOT EXISTS orders_user ON orders (user_id)",
        "CREATE INDEX IF NOT EXISTS orders_mechanic_status ON orders (mechanic_id, status)",
        "CREATE INDEX IF NOT EXISTS notification_user_status ON notifications (user_id, status)",
        "CREATE INDEX IF NOT EXISTS message_receiver_status ON messages (receiver_id, status)",
    ];
}

function json_input(): array
{
    $data = json_decode(file_get_contents('php://input'), true);
    if (!is_array($data)) fail('Invalid JSON request body', 400);
    return $data;
}

function respond(array $data = [], int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_SLASHES);
    exit;
}

function fail(string $message, int $status = 400): never
{
    respond(['error' => ['message' => $message]], $status);
}

function current_user(): array
{
    if (empty($_SESSION['user_id'])) fail('Authentication required', 401);
    $stmt = db()->prepare('SELECT id, email, full_name, phone, role, email_verified FROM users WHERE id = ?');
    $stmt->execute([$_SESSION['user_id']]);
    $user = $stmt->fetch();
    if (!$user) {
        session_destroy();
        fail('Authentication required', 401);
    }
    return $user;
}

function require_role(string $role): array
{
    $user = current_user();
    if ($user['role'] !== $role) fail('Not authorized', 403);
    return $user;
}

function uuid(): string
{
    $data = random_bytes(16);
    $data[6] = chr((ord($data[6]) & 0x0f) | 0x40);
    $data[8] = chr((ord($data[8]) & 0x3f) | 0x80);
    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
}

function valid_string(mixed $value, int $min, int $max, string $field): string
{
    $value = trim((string)$value);
    if (mb_strlen($value) < $min || mb_strlen($value) > $max) fail("Invalid $field");
    return $value;
}

function request_by_id(string $id): array
{
    $stmt = db()->prepare('SELECT r.*, c.full_name AS client_name, c.phone AS client_phone, m.full_name AS mechanic_name, m.phone AS mechanic_phone FROM service_requests r JOIN users c ON c.id = r.client_id LEFT JOIN users m ON m.id = r.mechanic_id WHERE r.id = ?');
    $stmt->execute([$id]);
    $request = $stmt->fetch();
    if (!$request) fail('Service request not found', 404);
    return $request;
}

function haversine_km(float $lat1, float $lng1, float $lat2, float $lng2): float
{
    $R = 6371.0;
    $dLat = deg2rad($lat2 - $lat1);
    $dLng = deg2rad($lng2 - $lng1);
    $a = sin($dLat / 2) ** 2 + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLng / 2) ** 2;
    return $R * 2 * atan2(sqrt($a), sqrt(1 - $a));
}

function expire_stale_requests(): void
{
    // Delete pending requests older than 30 seconds entirely.
    // If no mechanic accepted, the request is invalid and should not be stored anywhere.
    db()->prepare('DELETE FROM service_requests WHERE status = "pending" AND created_at < ' . sql_time_offset(-30))->execute();
}

function create_notification(string $userId, string $type, string $message): void
{
    db()->prepare('INSERT INTO notifications (id, user_id, type, message) VALUES (?, ?, ?, ?)')
        ->execute([uuid(), $userId, $type, $message]);
}

/**
 * Get Mailer instance
 */
function mailer(): \PHPMailer\PHPMailer\PHPMailer
{
    static $mailer = null;
    if ($mailer === null) {
        // Load composer autoloader if available
        $autoloadPath = __DIR__ . '/vendor/autoload.php';
        if (file_exists($autoloadPath)) {
            require_once $autoloadPath;
        }
        
        $mailer = new \PHPMailer\PHPMailer\PHPMailer(true);
        
        try {
            $mailer->isSMTP();
            $mailer->Host = env_value('MAIL_HOST', 'smtp.gmail.com');
            $mailer->Port = (int) env_value('MAIL_PORT', '587');
            $mailer->SMTPAuth = true;
            $mailer->SMTPSecure = \PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_STARTTLS;
            $mailer->Username = env_value('MAIL_USERNAME', '');
            $mailer->Password = env_value('MAIL_PASSWORD', '');
            $mailer->CharSet = 'UTF-8';
            $mailer->setFrom(
                env_value('MAIL_FROM_ADDRESS', 'noreply@mechabot.local'),
                env_value('MAIL_FROM_NAME', 'MechaBot Platform')
            );
        } catch (\PHPMailer\PHPMailer\Exception $e) {
            error_log("Mailer configuration error: " . $e->getMessage());
        }
    }
    return $mailer;
}

/**
 * Send email with verification code
 */
function send_verification_email(string $email, string $fullName, string $verificationCode): bool
{
    try {
        $mail = mailer();
        $mail->clearAddresses();
        $mail->addAddress($email, $fullName);
        $mail->isHTML(true);
        $mail->Subject = 'Verify Your Email - MechaBot Platform';
        
        $appUrl = env_value('APP_URL', env_value('RENDER_EXTERNAL_URL', 'http://localhost:5173'));
        $verificationLink = $appUrl . '/verify-email?code=' . urlencode($verificationCode) . '&email=' . urlencode($email);
        
        $mail->Body = <<<HTML
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
            <p>Thank you for signing up with MechaBot Platform! To complete your registration, please verify your email address:</p>
            
            <a href="{$verificationLink}" class="button">Verify Email Address</a>
            
            <p>Or enter this code:</p>
            <div class="code">{$verificationCode}</div>
            
            <p>This link expires in 24 hours.</p>
            <p>If you didn't create this account, please ignore this email.</p>
        </div>
        <div class="footer">
            <p>&copy; 2026 MechaBot Platform. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
HTML;
        
        $mail->AltBody = "Welcome to MechaBot! Your verification code is: {$verificationCode}";
        return $mail->send();
    } catch (\Exception $e) {
        error_log("Email send error: " . $e->getMessage());
        return false;
    }
}

/**
 * Send password reset email
 */
function send_password_reset_email(string $email, string $fullName, string $resetCode): bool
{
    try {
        $mail = mailer();
        $mail->clearAddresses();
        $mail->addAddress($email, $fullName);
        $mail->isHTML(true);
        $mail->Subject = 'Reset Your Password - MechaBot Platform';
        
        $appUrl = env_value('APP_URL', env_value('RENDER_EXTERNAL_URL', 'http://localhost:5173'));
        $resetLink = $appUrl . '/reset-password?code=' . urlencode($resetCode) . '&email=' . urlencode($email);
        
        $mail->Body = <<<HTML
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
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🤖 MechaBot Platform</h1>
            <p>Password Reset</p>
        </div>
        <div class="content">
            <h2>Hello {$fullName},</h2>
            <p>We received a request to reset your password. Click the button below:</p>
            
            <a href="{$resetLink}" class="button">Reset Password</a>
            
            <p>Or use this code:</p>
            <div class="code">{$resetCode}</div>
            
            <p>This link expires in 1 hour. If you didn't request this, ignore this email.</p>
        </div>
        <div class="footer">
            <p>&copy; 2026 MechaBot Platform. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
HTML;
        
        $mail->AltBody = "Password reset code: {$resetCode}";
        return $mail->send();
    } catch (\Exception $e) {
        error_log("Email send error: " . $e->getMessage());
        return false;
    }
}

/**
 * Send mechanic approval email
 */
function send_mechanic_approval_email(string $email, string $fullName, bool $approved): bool
{
    try {
        $mail = mailer();
        $mail->clearAddresses();
        $mail->addAddress($email, $fullName);
        $mail->isHTML(true);
        
        $status = $approved ? 'Approved' : 'Rejected';
        $color = $approved ? '#28a745' : '#dc3545';
        $message = $approved
            ? 'Congratulations! Your mechanic profile has been approved. You can now start accepting service requests.'
            : 'Unfortunately, your mechanic profile application was not approved. Please review and reapply.';
        
        $appUrl = env_value('APP_URL', env_value('RENDER_EXTERNAL_URL', 'http://localhost:5173'));
        $mail->Subject = "Mechanic Profile {$status} - MechaBot Platform";
        $mail->Body = <<<HTML
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; background: {$color}; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; font-size: 12px; color: #999; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🤖 MechaBot Platform</h1>
            <p>Mechanic Profile Update</p>
        </div>
        <div class="content">
            <h2>Hello {$fullName},</h2>
            <p><strong>Status: {$status}</strong></p>
            <p>{$message}</p>
            
            <a href="{$appUrl}/dashboard" class="button">Go to Dashboard</a>
        </div>
        <div class="footer">
            <p>&copy; 2026 MechaBot Platform. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
HTML;
        
        $mail->AltBody = "Your mechanic profile has been {$status}.";
        return $mail->send();
    } catch (\Exception $e) {
        error_log("Email send error: " . $e->getMessage());
        return false;
    }
}

if (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https') {
    $_SERVER['HTTPS'] = 'on';
}

if (PHP_SAPI !== 'cli') {
    session_name('mechabot_session');
    $crossOrigin = env_value('CORS_ORIGINS', '') !== '';
    $secure = $crossOrigin || (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off');
    session_set_cookie_params(['httponly' => true, 'samesite' => $crossOrigin ? 'None' : 'Lax', 'secure' => $secure]);
    session_start();
}
