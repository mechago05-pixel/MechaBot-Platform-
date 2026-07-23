<?php
declare(strict_types=1);

// Copy .env.example to .env and set your WAMP MySQL credentials. Do not commit .env.
function env_value(string $key, ?string $default = null): ?string {
    static $values = null;
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
    return $values[$key] ?? getenv($key) ?: $default;
}

function db(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        $dsn = sprintf('mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4', env_value('DB_HOST', '127.0.0.1'), env_value('DB_PORT', '3306'), env_value('DB_NAME', 'mechabot'));
        $pdo = new PDO($dsn, env_value('DB_USER', 'root'), env_value('DB_PASSWORD', ''), [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
    }
    return $pdo;
}

function json_input(): array {
    $data = json_decode(file_get_contents('php://input'), true);
    if (!is_array($data)) fail('Invalid JSON request body', 400);
    return $data;
}

function respond(array $data = [], int $status = 200): never {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_SLASHES);
    exit;
}

function fail(string $message, int $status = 400): never { respond(['error' => ['message' => $message]], $status); }

function current_user(): array {
    if (empty($_SESSION['user_id'])) fail('Authentication required', 401);
    $stmt = db()->prepare('SELECT id, email, full_name, phone, role FROM users WHERE id = ?');
    $stmt->execute([$_SESSION['user_id']]);
    $user = $stmt->fetch();
    if (!$user) { session_destroy(); fail('Authentication required', 401); }
    return $user;
}

function require_role(string $role): array {
    $user = current_user();
    if ($user['role'] !== $role) fail('Not authorized', 403);
    return $user;
}

function uuid(): string {
    $data = random_bytes(16);
    $data[6] = chr((ord($data[6]) & 0x0f) | 0x40);
    $data[8] = chr((ord($data[8]) & 0x3f) | 0x80);
    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
}

function valid_string(mixed $value, int $min, int $max, string $field): string {
    $value = trim((string)$value);
    if (mb_strlen($value) < $min || mb_strlen($value) > $max) fail("Invalid $field");
    return $value;
}

function request_by_id(string $id): array {
    $stmt = db()->prepare('SELECT r.*, c.full_name AS client_name, c.phone AS client_phone, m.full_name AS mechanic_name, m.phone AS mechanic_phone FROM service_requests r JOIN users c ON c.id = r.client_id LEFT JOIN mechanic_profiles m ON m.user_id = r.mechanic_id WHERE r.id = ?');
    $stmt->execute([$id]);
    $request = $stmt->fetch();
    if (!$request) fail('Service request not found', 404);
    return $request;
}

function haversine_km(float $lat1, float $lng1, float $lat2, float $lng2): float {
    $R = 6371.0;
    $dLat = deg2rad($lat2 - $lat1);
    $dLng = deg2rad($lng2 - $lng1);
    $a = sin($dLat / 2) ** 2 + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLng / 2) ** 2;
    return $R * 2 * atan2(sqrt($a), sqrt(1 - $a));
}

function expire_stale_requests(): void {
    // Delete pending requests older than 30 seconds entirely.
    // If no mechanic accepted, the request is invalid and should not be stored anywhere.
    db()->prepare('DELETE FROM service_requests WHERE status = "pending" AND created_at < DATE_SUB(NOW(), INTERVAL 30 SECOND)')->execute();
}

function create_notification(string $userId, string $type, string $message): void {
    db()->prepare('INSERT INTO notifications (id, user_id, type, message) VALUES (?, ?, ?, ?)')
        ->execute([uuid(), $userId, $type, $message]);
}

session_name('mechabot_session');
session_set_cookie_params(['httponly' => true, 'samesite' => 'Lax', 'secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off']);
session_start();