<?php
require_once 'utils/jwt.php';

function authenticate() {
    $headers = apache_request_headers();
    $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';

    if (empty($authHeader) || !preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
        sendResponse(401, false, "Akses ditolak. Token tidak ditemukan.");
    }

    $token = $matches[1];
    $jwt_secret = "invoiceflow_super_secret_key_2024_change_in_production"; // Must match config

    $decoded = SimpleJWT::decode($token, $jwt_secret);

    if ($decoded === false) {
        // Since our minimal JWT decoder returns false for both invalid and expired,
        // we'll just return a general invalid/expired message.
        sendResponse(401, false, "Token tidak valid atau sudah kadaluarsa.");
    }

    return $decoded; // Returns payload (e.g. ['id' => 1, 'email' => '...'])
}

function optionalAuth() {
    $headers = apache_request_headers();
    $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';

    if (!empty($authHeader) && preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
        $token = $matches[1];
        $jwt_secret = "invoiceflow_super_secret_key_2024_change_in_production";
        $decoded = SimpleJWT::decode($token, $jwt_secret);
        if ($decoded !== false) {
            return $decoded;
        }
    }
    return null;
}
?>
