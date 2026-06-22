<?php
require_once 'utils/jwt.php';

// Konfigurasi rahasia JWT (Sama dengan Node.js)
$jwt_secret = "invoiceflow_super_secret_key_2024_change_in_production";
$jwt_refresh_secret = "invoiceflow_refresh_secret_key_2024_change_in_production";

$db = new Database();
$conn = $db->getConnection();

$action = $segments[1] ?? '';

// Ambil payload JSON
$input = json_decode(file_get_contents("php://input"), true);

function generateAccessToken($user, $secret) {
    return SimpleJWT::encode(['id' => $user['id'], 'email' => $user['email'], 'exp' => time() + (15 * 60)], $secret);
}

function generateRefreshToken($user, $secret) {
    return SimpleJWT::encode(['id' => $user['id'], 'exp' => time() + (7 * 24 * 60 * 60)], $secret);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if ($action === 'register') {
        $name = $input['name'] ?? '';
        $email = $input['email'] ?? '';
        $phone = $input['phone'] ?? '';
        $password = $input['password'] ?? '';

        if (empty($name) || empty($email) || empty($password)) {
            sendResponse(400, false, "Nama, email, dan password wajib diisi.");
        }

        // Cek email
        $stmt = $conn->prepare("SELECT id FROM users WHERE email = ?");
        $stmt->execute([$email]);
        if ($stmt->fetch()) {
            sendResponse(409, false, "Email sudah terdaftar.");
        }

        $password_hash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
        $stmt = $conn->prepare("INSERT INTO users (name, email, phone, password_hash) VALUES (?, ?, ?, ?)");
        $stmt->execute([$name, $email, $phone, $password_hash]);
        
        $userId = $conn->lastInsertId();
        
        // Ambil data user
        $stmt = $conn->prepare("SELECT id, name, email, phone, business_name, business_logo, business_address, npwp, invoice_prefix, invoice_counter, default_tax_percent, created_at FROM users WHERE id = ?");
        $stmt->execute([$userId]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        $accessToken = generateAccessToken($user, $jwt_secret);
        $refreshToken = generateRefreshToken($user, $jwt_refresh_secret);

        $expiresAt = date('Y-m-d H:i:s', time() + (7 * 24 * 60 * 60));
        $stmt = $conn->prepare("INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)");
        $stmt->execute([$userId, $refreshToken, $expiresAt]);

        sendResponse(201, true, "Registrasi berhasil!", [
            "user" => $user,
            "accessToken" => $accessToken,
            "refreshToken" => $refreshToken
        ]);
    }
    else if ($action === 'login') {
        $email = $input['email'] ?? '';
        $password = $input['password'] ?? '';

        $stmt = $conn->prepare("SELECT * FROM users WHERE email = ?");
        $stmt->execute([$email]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$user || !password_verify($password, $user['password_hash'])) {
            sendResponse(401, false, "Email atau password salah.");
        }

        $accessToken = generateAccessToken($user, $jwt_secret);
        $refreshToken = generateRefreshToken($user, $jwt_refresh_secret);

        $expiresAt = date('Y-m-d H:i:s', time() + (7 * 24 * 60 * 60));
        $stmt = $conn->prepare("INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)");
        $stmt->execute([$user['id'], $refreshToken, $expiresAt]);

        unset($user['password_hash']);

        sendResponse(200, true, "Login berhasil!", [
            "user" => $user,
            "accessToken" => $accessToken,
            "refreshToken" => $refreshToken
        ]);
    }
    // Implement Google Login & Refresh later if requested...
}

sendResponse(404, false, "Auth Endpoint Not Found");
?>
