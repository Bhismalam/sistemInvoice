<?php
// CORS Headers
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once 'config/database.php';
require_once 'utils/response.php';

// Simple Router
$request_uri = $_SERVER['REQUEST_URI'];
$base_path = '/api'; // Adjust this if your app is in a subfolder

// For local testing in XAMPP, the URL might be /sistem_voice/server-php/api/...
// Let's extract the part after /api/
$path = '';
if (strpos($request_uri, '/api/') !== false) {
    $parts = explode('/api/', $request_uri);
    $path = $parts[1];
} else {
    $path = trim(parse_url($request_uri, PHP_URL_PATH), '/');
}

$segments = explode('/', $path);
$resource = $segments[0] ?? '';

switch ($resource) {
    case 'auth':
        require 'controllers/auth.php';
        break;
    case 'dashboard':
        require 'controllers/dashboard.php';
        break;
    case 'documents':
        require 'controllers/documents.php';
        break;
    // Add other routes here...
    default:
        sendResponse(404, false, "API Endpoint Not Found: " . $resource);
        break;
}
?>
