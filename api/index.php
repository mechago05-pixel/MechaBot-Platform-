<?php
declare(strict_types=1);
require __DIR__ . '/bootstrap.php';

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:8080', 'http://127.0.0.1:8080'], true)) {
    header("Access-Control-Allow-Origin: $origin");
    header('Access-Control-Allow-Credentials: true');
    header('Vary: Origin');
}
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('Access-Control-Allow-Methods: GET, POST, PUT, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    exit;
}

$segments = explode('/', trim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?? '', '/'));
$apiSegment = array_search('api', $segments, true);
$path = implode('/', array_slice($segments, $apiSegment === false ? 0 : $apiSegment + 1));
// Supports both Apache rewrite URLs (/api/requests) and direct WAMP URLs
// (/api/index.php/requests) without changing the React client.
$path = preg_replace('#^index\.php/?#i', '', $path) ?? '';
$method = $_SERVER['REQUEST_METHOD'];

expire_stale_requests();

if ($method === 'POST' && $path === 'auth/register') {
    $data = json_input();
    $email = filter_var(strtolower(trim((string)($data['email'] ?? ''))), FILTER_VALIDATE_EMAIL);
    $password = (string)($data['password'] ?? '');
    $fullName = valid_string($data['full_name'] ?? '', 2, 100, 'full name');
    $phone = valid_string($data['phone'] ?? '', 7, 20, 'phone number');
    $role = in_array($data['role'] ?? 'client', ['client', 'mechanic'], true) ? $data['role'] : 'client';
    if (!$email || strlen($password) < 6) fail('Provide a valid email and a password of at least 6 characters');
    try {
        $id = uuid();
        db()->prepare('INSERT INTO users (id, email, password_hash, full_name, phone, role) VALUES (?, ?, ?, ?, ?, ?)')
            ->execute([$id, $email, password_hash($password, PASSWORD_DEFAULT), $fullName, $phone, $role]);
        db()->prepare('INSERT INTO profiles (id, user_id, full_name, phone) VALUES (?, ?, ?, ?)')->execute([uuid(), $id, $fullName, $phone]);
        db()->prepare('INSERT INTO user_roles (id, user_id, role) VALUES (?, ?, ?)')->execute([uuid(), $id, $role]);
    } catch (PDOException $e) {
        if ($e->getCode() === '23000') fail('An account with this email already exists', 409);
        throw $e;
    }
    respond(['data' => ['message' => 'Account created']], 201);
}

if ($method === 'POST' && $path === 'auth/login') {
    $data = json_input();
    $stmt = db()->prepare('SELECT id, email, password_hash, full_name, phone, role, is_blocked FROM users WHERE email = ?');
    $stmt->execute([strtolower(trim((string)($data['email'] ?? '')))]);
    $user = $stmt->fetch();
    if (!$user || !password_verify((string)($data['password'] ?? ''), $user['password_hash'])) fail('Invalid email or password', 401);
    if ((int)$user['is_blocked'] === 1) fail('This account has been blocked', 403);
    session_regenerate_id(true);
    $_SESSION['user_id'] = $user['id'];
    unset($user['password_hash'], $user['is_blocked']);
    respond(['data' => ['user' => $user]]);
}

if ($method === 'POST' && $path === 'auth/logout') { $_SESSION = []; session_destroy(); respond(['data' => []]); }
if ($method === 'GET' && $path === 'auth/me') { respond(['data' => ['user' => current_user()]]); }

if ($method === 'GET' && $path === 'mechanics/me') {
    $user = current_user();
    $stmt = db()->prepare('SELECT * FROM mechanic_profiles WHERE user_id = ?');
    $stmt->execute([$user['id']]);
    $profile = $stmt->fetch() ?: null;
    if ($profile) {
        $profile['specialties'] = json_decode($profile['specialties'] ?? '[]', true) ?: [];
        $profile['certification_urls'] = json_decode($profile['certification_urls'] ?? '[]', true) ?: [];
    }
    respond(['data' => ['profile' => $profile]]);
}

if ($method === 'GET' && $path === 'mechanics') {
    $specialty = trim((string)($_GET['specialty'] ?? ''));
    $sql = 'SELECT m.id, m.user_id, m.full_name, m.phone, m.specialties, m.garage_location, m.profile_image_url, m.rating, m.total_reviews, m.experience_years, m.tier, m.is_online, m.availability_status, m.lat, m.lng, l.latitude, l.longitude FROM mechanic_profiles m LEFT JOIN mechanic_locations l ON l.mechanic_id = m.id WHERE m.approval_status = "approved" AND m.is_blocked = 0';
    $params = [];
    if ($specialty !== '') { $sql .= ' AND JSON_CONTAINS(m.specialties, JSON_QUOTE(?))'; $params[] = $specialty; }
    $sql .= ' ORDER BY m.is_online DESC, m.rating DESC, m.created_at DESC';
    $stmt = db()->prepare($sql); $stmt->execute($params); $rows = $stmt->fetchAll();
    foreach ($rows as &$row) $row['specialties'] = json_decode($row['specialties'] ?? '[]', true) ?: [];
    respond(['data' => $rows]);
}

if ($method === 'POST' && $path === 'mechanics/me/location') {
    $mechanic = require_role('mechanic'); $data = json_input();
    $lat = filter_var($data['latitude'] ?? null, FILTER_VALIDATE_FLOAT); $lng = filter_var($data['longitude'] ?? null, FILTER_VALIDATE_FLOAT);
    if ($lat === false || $lng === false || $lat < -90 || $lat > 90 || $lng < -180 || $lng > 180) fail('Invalid location');
    $profile = db()->prepare('SELECT id FROM mechanic_profiles WHERE user_id = ? AND approval_status = "approved" AND is_blocked = 0'); $profile->execute([$mechanic['id']]); $profileId = $profile->fetchColumn();
    if (!$profileId) fail('Your mechanic account is not approved', 403);
    db()->prepare('INSERT INTO mechanic_locations (id, mechanic_id, latitude, longitude) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE latitude = VALUES(latitude), longitude = VALUES(longitude)')->execute([uuid(), $profileId, $lat, $lng]);
    db()->prepare('UPDATE mechanic_profiles SET lat = ?, lng = ? WHERE id = ?')->execute([$lat, $lng, $profileId]);
    respond(['data' => ['latitude' => $lat, 'longitude' => $lng]]);
}

if ($method === 'POST' && $path === 'mechanics/me/availability') {
    $mechanic = require_role('mechanic'); $data = json_input(); $online = !empty($data['is_online']) ? 1 : 0;
    db()->prepare('UPDATE mechanic_profiles SET is_online = ?, availability_status = ? WHERE user_id = ?')->execute([$online, $online ? 'available' : 'offline', $mechanic['id']]);
    respond(['data' => ['is_online' => (bool)$online]]);
}

if ($method === 'POST' && $path === 'mechanics/me/photo') {
    $user = current_user();
    $file = $_FILES['photo'] ?? null;
    if (!$file || $file['error'] !== UPLOAD_ERR_OK || $file['size'] > 5 * 1024 * 1024) fail('Upload a valid image smaller than 5MB');
    $mime = (new finfo(FILEINFO_MIME_TYPE))->file($file['tmp_name']);
    $extensions = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
    if (!isset($extensions[$mime])) fail('Only JPEG, PNG, and WebP images are allowed');
    $dir = __DIR__ . '/' . trim(env_value('UPLOAD_DIR', 'uploads'), '/\\') . '/mechanic-profiles/' . $user['id'];
    if (!is_dir($dir) && !mkdir($dir, 0755, true)) fail('Unable to create upload directory', 500);
    $name = 'profile-' . time() . '.' . $extensions[$mime];
    if (!move_uploaded_file($file['tmp_name'], "$dir/$name")) fail('Unable to save image', 500);
    respond(['data' => ['url' => '/api/uploads/mechanic-profiles/' . $user['id'] . '/' . $name]], 201);
}

if ($method === 'POST' && $path === 'mechanics/register') {
    $user = current_user();
    $data = json_input();
    $fullName = valid_string($data['full_name'] ?? '', 2, 100, 'full name');
    $nida = valid_string($data['nida_number'] ?? '', 4, 40, 'NIDA number');
    $email = filter_var(strtolower(trim((string)($data['email'] ?? ''))), FILTER_VALIDATE_EMAIL);
    $phone = valid_string($data['phone'] ?? '', 7, 20, 'phone number');
    $garage = valid_string($data['garage_location'] ?? '', 2, 200, 'garage location');
    $years = filter_var($data['experience_years'] ?? null, FILTER_VALIDATE_INT);
    $specialties = $data['specialties'] ?? null;
    if (!$email || $years === false || $years < 0 || $years > 80 || !is_array($specialties) || count($specialties) === 0) fail('Please provide valid mechanic registration details');
    $stmt = db()->prepare('INSERT INTO mechanic_profiles (id, user_id, full_name, nida_number, email, phone, experience_years, specialties, garage_location, lat, lng, profile_image_url, approval_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, "pending") ON DUPLICATE KEY UPDATE full_name=VALUES(full_name), nida_number=VALUES(nida_number), email=VALUES(email), phone=VALUES(phone), experience_years=VALUES(experience_years), specialties=VALUES(specialties), garage_location=VALUES(garage_location), lat=VALUES(lat), lng=VALUES(lng), profile_image_url=COALESCE(VALUES(profile_image_url), profile_image_url), approval_status=IF(approval_status="rejected", "pending", approval_status), updated_at=CURRENT_TIMESTAMP');
    $stmt->execute([uuid(), $user['id'], $fullName, $nida, $email, $phone, $years, json_encode(array_values($specialties)), $garage, (float)($data['lat'] ?? 0), (float)($data['lng'] ?? 0), $data['profile_image_url'] ?? null]);
    db()->prepare('UPDATE users SET full_name = ?, phone = ?, role = "mechanic" WHERE id = ?')->execute([$fullName, $phone, $user['id']]);
    db()->prepare('UPDATE profiles SET full_name = ?, phone = ?, avatar_url = COALESCE(?, avatar_url) WHERE user_id = ?')->execute([$fullName, $phone, $data['profile_image_url'] ?? null, $user['id']]);
    db()->prepare('UPDATE user_roles SET role = "mechanic" WHERE user_id = ? AND role = "client"')->execute([$user['id']]);
    if (db()->query('SELECT ROW_COUNT()')->fetchColumn() === 0) db()->prepare('INSERT IGNORE INTO user_roles (id, user_id, role) VALUES (?, ?, "mechanic")')->execute([uuid(), $user['id']]);
    respond(['data' => ['message' => 'Registration complete']]);
}

// ============================================================
// Service-request lifecycle
// ============================================================

// POST /requests — Client creates a pending request visible to all nearby mechanics
if ($method === 'POST' && $path === 'requests') {
    $user = require_role('client');
    $data = json_input();
    $category = valid_string($data['category'] ?? '', 2, 100, 'service category');
    $description = trim((string)($data['description'] ?? ''));
    $carModel = valid_string($data['car_model'] ?? '', 2, 255, 'car model');
    $carYear = preg_replace('/\D/', '', (string)($data['car_year'] ?? '')) ?: null;
    $vehicleSize = in_array($data['vehicle_size'] ?? 'medium', ['small', 'medium', 'large'], true) ? $data['vehicle_size'] : 'medium';
    $clientLat = filter_var($data['client_lat'] ?? null, FILTER_VALIDATE_FLOAT);
    $clientLng = filter_var($data['client_lng'] ?? null, FILTER_VALIDATE_FLOAT);
    if (mb_strlen($description) > 1000 || ($carYear !== null && (strlen($carYear) !== 4 || (int)$carYear < 1886 || (int)$carYear > ((int)date('Y') + 1)))) fail('Invalid request details');
    
    // Validate client coordinates
    if ($clientLat === false || $clientLng === false || $clientLat === null || $clientLng === null) {
        $clientLat = null;
        $clientLng = null;
    } elseif ($clientLat < -90 || $clientLat > 90 || $clientLng < -180 || $clientLng > 180) {
        $clientLat = null;
        $clientLng = null;
    }
    
    // Create as pending with no mechanic assigned.
    // All nearby online mechanics can see and compete for it.
    // Once one mechanic accepts, others can't see/accept it anymore.
    // Requests are auto-DELETED after 30 seconds if unaccepted.
    $id = uuid();
    db()->prepare('INSERT INTO service_requests (id, client_id, mechanic_id, category, description, car_model, car_year, vehicle_size, client_lat, client_lng, status) VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, "pending")')
        ->execute([$id, $user['id'], $category, $description ?: null, $carModel, $carYear, $vehicleSize, $clientLat, $clientLng]);
        
    // Notify all approved online mechanics within 10km about the new pending request
    if ($clientLat !== null && $clientLng !== null) {
        $mechanics = db()->query(
            'SELECT m.user_id, m.lat, m.lng, l.latitude, l.longitude
             FROM mechanic_profiles m
             LEFT JOIN mechanic_locations l ON l.mechanic_id = m.id
             WHERE m.approval_status = "approved" AND m.is_blocked = 0 AND m.is_online = 1'
        )->fetchAll();
        foreach ($mechanics as $m) {
            $mLng = (float)($m['longitude'] ?? $m['lng'] ?? 0);
            $mLat = (float)($m['latitude'] ?? $m['lat'] ?? 0);
            if ($mLat === 0.0 && $mLng === 0.0) continue;
            $dist = haversine_km($clientLat, $clientLng, $mLat, $mLng);
            if ($dist <= 10.0) {
                create_notification($m['user_id'], 'service_request', "New service request nearby ({$dist}km away). Open your dashboard to view and accept.");
            }
        }
    }
    respond(['data' => request_by_id($id)], 201);
}

// POST /requests/:id/cancel — Client cancels a pending request
if (preg_match('#^requests/([0-9a-f-]{36})/cancel$#i', $path, $matches) && $method === 'POST') {
    $client = require_role('client');
    $stmt = db()->prepare('SELECT mechanic_id FROM service_requests WHERE id = ? AND client_id = ? AND status = "pending"');
    $stmt->execute([$matches[1], $client['id']]);
    $mechanicId = $stmt->fetchColumn();
    if ($mechanicId === false) fail('Only pending requests can be cancelled', 422);
    db()->prepare('UPDATE service_requests SET status = "cancelled" WHERE id = ?')->execute([$matches[1]]);
    if ($mechanicId) create_notification($mechanicId, 'service_request', 'A client cancelled a service request.');
    respond(['data' => request_by_id($matches[1])]);
}

// GET /requests — List requests for current user
if ($method === 'GET' && $path === 'requests') {
    $user = current_user();
    if ($user['role'] === 'client') {
        $stmt = db()->prepare('SELECT r.*, m.full_name AS mechanic_name, m.phone AS mechanic_phone FROM service_requests r LEFT JOIN mechanic_profiles m ON m.user_id = r.mechanic_id WHERE r.client_id = ? ORDER BY r.created_at DESC');
        $stmt->execute([$user['id']]);
    } elseif ($user['role'] === 'mechanic') {
        $profile = db()->prepare('SELECT is_online, lat, lng FROM mechanic_profiles WHERE user_id = ? AND approval_status = "approved" AND is_blocked = 0');
        $profile->execute([$user['id']]);
        $currentMechanic = $profile->fetch();
        $isOnline = $currentMechanic && $currentMechanic['is_online'] ? 1 : 0;
        $mechanicLat = $currentMechanic ? (float)($currentMechanic['lat'] ?? 0) : 0;
        $mechanicLng = $currentMechanic ? (float)($currentMechanic['lng'] ?? 0) : 0;
        
        // Get mechanic location from mechanic_locations table if available (more accurate)
        $locStmt = db()->prepare('SELECT latitude, longitude FROM mechanic_locations WHERE mechanic_id = (SELECT id FROM mechanic_profiles WHERE user_id = ?)');
        $locStmt->execute([$user['id']]);
        $loc = $locStmt->fetch();
        if ($loc) {
            $mechanicLat = (float)$loc['latitude'];
            $mechanicLng = (float)$loc['longitude'];
        }
        
        // Rules:
        // - Assigned requests: show all (mechanic_id = this user)
        // - Pending requests: show ONLY if mechanic_id IS NULL and created < 30s ago
        //   (older pending requests are auto-deleted by expire_stale_requests())
        // - Once accepted by any mechanic: mechaninc_id is set, so it no longer shows as pending for others
        $rows = db()->prepare('SELECT r.*, u.full_name AS client_name, u.phone AS client_phone FROM service_requests r JOIN users u ON u.id = r.client_id WHERE (r.mechanic_id = ? OR (r.status = "pending" AND ? = 1 AND r.mechanic_id IS NULL AND r.created_at >= DATE_SUB(NOW(), INTERVAL 30 SECOND))) ORDER BY r.created_at DESC');
        $rows->execute([$user['id'], $isOnline]);
        $requests = $rows->fetchAll();
        
        // Enrich with distance from mechanic to client location
        if ($mechanicLat !== 0.0 || $mechanicLng !== 0.0) {
            foreach ($requests as &$req) {
                if ($req['client_lat'] !== null && $req['client_lng'] !== null) {
                    $req['distance_km'] = round(haversine_km($mechanicLat, $mechanicLng, (float)$req['client_lat'], (float)$req['client_lng']), 2);
                } else {
                    $req['distance_km'] = null;
                }
            }
        }
        respond(['data' => $requests]);
    } else {
        $stmt = db()->query('SELECT * FROM service_requests ORDER BY created_at DESC');
        respond(['data' => $stmt->fetchAll()]);
    }
    if (isset($stmt)) respond(['data' => $stmt->fetchAll()]);
    respond(['data' => []]);
}

if ($method === 'GET' && $path === 'notifications') {
    $user = current_user();
    // All users see only unread notifications
    $stmt = db()->prepare('SELECT * FROM notifications WHERE user_id = ? AND status = "unread" ORDER BY created_at DESC LIMIT 50');
    $stmt->execute([$user['id']]);
    respond(['data' => $stmt->fetchAll()]);
}

if (preg_match('#^notifications/([0-9a-f-]{36})/read$#i', $path, $matches) && $method === 'POST') {
    $user = current_user(); db()->prepare('UPDATE notifications SET status = "read" WHERE id = ? AND user_id = ?')->execute([$matches[1], $user['id']]);
    respond(['data' => []]);
}

if ($method === 'GET' && $path === 'messages') {
    $user = current_user(); $requestId = (string)($_GET['request_id'] ?? '');
    if (!preg_match('/^[0-9a-f-]{36}$/i', $requestId)) fail('A valid request id is required');
    $access = db()->prepare('SELECT 1 FROM service_requests WHERE id = ? AND (client_id = ? OR mechanic_id = ?)'); $access->execute([$requestId, $user['id'], $user['id']]); if (!$access->fetchColumn()) fail('Not authorized', 403);
    $stmt = db()->prepare('SELECT * FROM messages WHERE request_id = ? ORDER BY created_at ASC'); $stmt->execute([$requestId]); $messages = $stmt->fetchAll();
    db()->prepare('UPDATE messages SET status = "read" WHERE request_id = ? AND receiver_id = ? AND status = "unread"')->execute([$requestId, $user['id']]);
    respond(['data' => $messages]);
}

if ($method === 'GET' && $path === 'conversations') {
    $user = current_user();
    $stmt = db()->prepare('SELECT m.*, sender.full_name AS sender_name, receiver.full_name AS receiver_name FROM messages m JOIN users sender ON sender.id = m.sender_id JOIN users receiver ON receiver.id = m.receiver_id WHERE m.sender_id = ? OR m.receiver_id = ? ORDER BY m.created_at DESC'); $stmt->execute([$user['id'], $user['id']]);
    respond(['data' => $stmt->fetchAll()]);
}

if ($method === 'POST' && $path === 'messages') {
    $user = current_user(); $data = json_input(); $requestId = (string)($data['request_id'] ?? ''); $receiverId = (string)($data['receiver_id'] ?? ''); $message = valid_string($data['message'] ?? '', 1, 500, 'message');
    $stmt = db()->prepare('SELECT client_id, mechanic_id FROM service_requests WHERE id = ?'); $stmt->execute([$requestId]); $request = $stmt->fetch();
    if (!$request || !in_array($user['id'], [$request['client_id'], $request['mechanic_id']], true) || !in_array($receiverId, [$request['client_id'], $request['mechanic_id']], true) || $receiverId === $user['id']) fail('Messaging is only available to assigned request participants', 403);
    $id = uuid(); db()->prepare('INSERT INTO messages (id, request_id, sender_id, receiver_id, message) VALUES (?, ?, ?, ?, ?)')->execute([$id, $requestId, $user['id'], $receiverId, $message]);
    create_notification($receiverId, 'message', 'You have a new message about a service request.');
    $stmt = db()->prepare('SELECT * FROM messages WHERE id = ?'); $stmt->execute([$id]); respond(['data' => $stmt->fetch()], 201);
}

if (preg_match('#^requests/([0-9a-f-]{36})$#i', $path, $matches) && $method === 'GET') {
    $user = current_user(); $request = request_by_id($matches[1]);
    if ($user['role'] !== 'admin' && $request['client_id'] !== $user['id'] && $request['mechanic_id'] !== $user['id']) fail('Not authorized', 403);
    respond(['data' => $request]);
}

if (preg_match('#^mechanics/([0-9a-f-]{36})/location$#i', $path, $matches) && $method === 'GET') {
    $user = current_user();
    $userId = $matches[1];
    $stmt = db()->prepare('SELECT l.latitude, l.longitude, l.updated_at FROM mechanic_locations l JOIN mechanic_profiles m ON m.id = l.mechanic_id WHERE m.user_id = ?');
    $stmt->execute([$userId]);
    $loc = $stmt->fetch() ?: null;
    if (!$loc) {
        $stmt = db()->prepare('SELECT lat AS latitude, lng AS longitude FROM mechanic_profiles WHERE user_id = ?');
        $stmt->execute([$userId]);
        $loc = $stmt->fetch() ?: null;
    }
    if ($loc) {
        $loc['latitude'] = (float)$loc['latitude'];
        $loc['longitude'] = (float)$loc['longitude'];
    }
    respond(['data' => $loc]);
}

// POST /requests/:id/accept — Mechanic accepts a pending request (first-come-first-serve)
if (preg_match('#^requests/([0-9a-f-]{36})/accept$#i', $path, $matches) && $method === 'POST') {
    $mechanic = require_role('mechanic');
    $profile = db()->prepare('SELECT approval_status, is_blocked, is_online FROM mechanic_profiles WHERE user_id = ?'); $profile->execute([$mechanic['id']]); $profile = $profile->fetch();
    if (!$profile || $profile['approval_status'] !== 'approved' || (int)$profile['is_blocked']) fail('Your mechanic account is not approved', 403);
    if (!(int)$profile['is_online']) fail('You must be online to accept new requests', 403);
    db()->beginTransaction();
    try {
        $active = db()->prepare('SELECT 1 FROM service_requests WHERE mechanic_id = ? AND status IN ("accepted", "on_the_way", "arrived", "diagnosis", "repair") FOR UPDATE'); $active->execute([$mechanic['id']]);
        if ($active->fetchColumn()) fail('Complete your active job before accepting another', 409);
        
        // Atomic UPDATE: only works if mechanic_id is still NULL (not yet accepted by anyone)
        $update = db()->prepare('UPDATE service_requests SET mechanic_id = ?, status = "accepted" WHERE id = ? AND status = "pending" AND mechanic_id IS NULL');
        $update->execute([$mechanic['id'], $matches[1]]);
        if ($update->rowCount() !== 1) fail('This request is no longer available (another mechanic may have accepted it)', 409);
        db()->commit();
    } catch (Throwable $e) { if (db()->inTransaction()) db()->rollBack(); throw $e; }
    create_notification(request_by_id($matches[1])['client_id'], 'service_request', 'Your mechanic accepted the service request.');
    respond(['data' => request_by_id($matches[1])]);
}

if (preg_match('#^requests/([0-9a-f-]{36})/status$#i', $path, $matches) && $method === 'POST') {
    $mechanic = require_role('mechanic'); $data = json_input(); $next = $data['status'] ?? '';
    // Check the status exists and belongs to this mechanic
    $stmt = db()->prepare('SELECT 1 FROM service_requests WHERE id = ? AND mechanic_id = ?');
    $stmt->execute([$matches[1], $mechanic['id']]);
    if (!$stmt->fetchColumn()) fail('Request not found or not assigned to you', 404);
    
    // Allow any forward status transition
    db()->prepare('UPDATE service_requests SET status = ? WHERE id = ? AND mechanic_id = ?')->execute([$next, $matches[1], $mechanic['id']]);
    create_notification(request_by_id($matches[1])['client_id'], 'service_request', 'Your mechanic updated your service request to ' . str_replace('_', ' ', $next) . '.');
    respond(['data' => request_by_id($matches[1])]);
}

if (preg_match('#^requests/([0-9a-f-]{36})/rating$#i', $path, $matches) && $method === 'POST') {
    $client = require_role('client'); $data = json_input(); $rating = filter_var($data['rating'] ?? null, FILTER_VALIDATE_INT); $comment = trim((string)($data['comment'] ?? ''));
    if ($rating === false || $rating < 1 || $rating > 5 || mb_strlen($comment) > 500) fail('Invalid rating');
    $stmt = db()->prepare('SELECT mechanic_id FROM service_requests WHERE id = ? AND client_id = ? AND status = "completed"'); $stmt->execute([$matches[1], $client['id']]); $mechanicId = $stmt->fetchColumn();
    if (!$mechanicId) fail('Only completed requests can be rated', 422);
    db()->prepare('INSERT INTO mechanic_ratings (id, request_id, client_id, mechanic_id, rating, comment) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE rating = VALUES(rating), comment = VALUES(comment), updated_at = CURRENT_TIMESTAMP')->execute([uuid(), $matches[1], $client['id'], $mechanicId, $rating, $comment ?: null]);
    db()->prepare('UPDATE mechanic_profiles SET rating = (SELECT COALESCE(ROUND(AVG(r.rating), 1), 0) FROM mechanic_ratings r WHERE r.mechanic_id = ?), total_reviews = (SELECT COUNT(*) FROM mechanic_ratings r WHERE r.mechanic_id = ?) WHERE user_id = ?')->execute([$mechanicId, $mechanicId, $mechanicId]);
    create_notification((string)$mechanicId, 'rating', 'A client left a ' . $rating . '-star rating.');
    respond(['data' => ['rating' => $rating]]);
}

if ($method === 'GET' && $path === 'admin/mechanics') {
    require_role('admin');
    $rows = db()->query(
        'SELECT m.*, u.email, u.full_name AS user_full_name, u.phone AS user_phone 
         FROM mechanic_profiles m 
         JOIN users u ON u.id = m.user_id 
         ORDER BY m.created_at DESC'
    )->fetchAll();
    foreach ($rows as &$row) {
        $row['specialties'] = json_decode($row['specialties'] ?? '[]', true) ?: [];
        $row['certification_urls'] = json_decode($row['certification_urls'] ?? '[]', true) ?: [];
    }
    respond(['data' => $rows]);
}

if (preg_match('#^admin/mechanics/([0-9a-f-]{36})/approval$#i', $path, $matches) && $method === 'POST') {
    require_role('admin');
    $status = json_input()['approval_status'] ?? '';
    if (!in_array($status, ['approved', 'rejected'], true)) fail('Invalid approval status');
    $stmt = db()->prepare('UPDATE mechanic_profiles SET approval_status = ? WHERE id = ?');
    $stmt->execute([$status, $matches[1]]);
    if ($stmt->rowCount() !== 1) fail('Mechanic profile not found', 404);
    $profile = db()->prepare('SELECT user_id FROM mechanic_profiles WHERE id = ?'); $profile->execute([$matches[1]]);
    create_notification((string)$profile->fetchColumn(), 'account', 'Your mechanic registration was ' . $status . '.');
    respond(['data' => ['approval_status' => $status]]);
}

fail('Route not found', 404);