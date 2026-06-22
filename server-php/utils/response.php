<?php
function sendResponse($statusCode, $success, $message, $data = null, $extra = []) {
    http_response_code($statusCode);
    $response = [
        "success" => $success,
        "message" => $message
    ];
    if ($data !== null) {
        $response["data"] = $data;
    }
    if (!empty($extra)) {
        $response = array_merge($response, $extra);
    }
    echo json_encode($response);
    exit;
}
?>
