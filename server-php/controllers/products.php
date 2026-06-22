<?php
require_once 'middleware/auth.php';

$user = authenticate();
$userId = $user['id'];

$db = new Database();
$conn = $db->getConnection();

$action = $segments[1] ?? '';
$id = $segments[2] ?? null;

$method = $_SERVER['REQUEST_METHOD'];

// Handle GET /api/products
if ($method === 'GET' && empty($action)) {
    $search = $_GET['search'] ?? '';
    $category = $_GET['category'] ?? '';
    $page = max(1, intval($_GET['page'] ?? 1));
    $limit = min(100, intval($_GET['limit'] ?? 20));
    $offset = ($page - 1) * $limit;

    $query = "SELECT * FROM products WHERE user_id = :userId";
    $params = [':userId' => $userId];

    if (!empty($search)) {
        $query .= " AND (name LIKE :search1 OR description LIKE :search2)";
        $params[':search1'] = "%$search%";
        $params[':search2'] = "%$search%";
    }
    if (!empty($category)) {
        $query .= " AND category = :category";
        $params[':category'] = $category;
    }

    // Count Total
    $countQuery = str_replace("SELECT *", "SELECT COUNT(*) as total", $query);
    $stmt = $conn->prepare($countQuery);
    $stmt->execute($params);
    $total = $stmt->fetch(PDO::FETCH_ASSOC)['total'];

    // Get Data
    $query .= " ORDER BY name ASC LIMIT :limit OFFSET :offset";
    $stmt = $conn->prepare($query);
    
    // Bind all params
    foreach ($params as $key => &$val) {
        $stmt->bindParam($key, $val);
    }
    $stmt->bindParam(':limit', $limit, PDO::PARAM_INT);
    $stmt->bindParam(':offset', $offset, PDO::PARAM_INT);
    $stmt->execute();
    
    $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

    sendResponse(200, true, "Success", null, [
        "data" => $data,
        "meta" => [
            "total" => $total,
            "page" => $page,
            "limit" => $limit,
            "totalPages" => ceil($total / $limit)
        ]
    ]);
}
// Handle GET /api/products/:id
else if ($method === 'GET' && !empty($action) && is_numeric($action)) {
    $id = $action;
    $stmt = $conn->prepare("SELECT * FROM products WHERE id = ? AND user_id = ?");
    $stmt->execute([$id, $userId]);
    $product = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$product) sendResponse(404, false, "Produk tidak ditemukan.");
    sendResponse(200, true, "Success", $product);
}
// Handle POST /api/products
else if ($method === 'POST') {
    $input = json_decode(file_get_contents("php://input"), true);
    $name = $input['name'] ?? '';
    $description = $input['description'] ?? '';
    $unit = $input['unit'] ?? 'pcs';
    $price = $input['price'] ?? 0;
    $stock = $input['stock'] ?? 0;
    $category = $input['category'] ?? '';

    if (empty($name)) sendResponse(400, false, "Nama produk wajib diisi.");

    $stmt = $conn->prepare("INSERT INTO products (user_id, name, description, unit, price, stock, category) VALUES (?, ?, ?, ?, ?, ?, ?)");
    $stmt->execute([$userId, $name, $description, $unit, $price, $stock, $category]);
    
    $newId = $conn->lastInsertId();
    $stmt = $conn->prepare("SELECT * FROM products WHERE id = ?");
    $stmt->execute([$newId]);
    
    sendResponse(201, true, "Produk berhasil ditambahkan!", $stmt->fetch(PDO::FETCH_ASSOC));
}
// Handle PUT /api/products/:id
else if ($method === 'PUT' && !empty($action) && is_numeric($action)) {
    $id = $action;
    $input = json_decode(file_get_contents("php://input"), true);
    
    $allowed = ['name', 'description', 'unit', 'price', 'stock', 'category'];
    $fields = [];
    $values = [];

    foreach ($allowed as $key) {
        if (isset($input[$key])) {
            $fields[] = "$key = ?";
            $values[] = $input[$key];
        }
    }

    if (empty($fields)) sendResponse(400, false, "Tidak ada data yang diupdate.");

    $values[] = $id;
    $values[] = $userId;

    $sql = "UPDATE products SET " . implode(", ", $fields) . " WHERE id = ? AND user_id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->execute($values);

    if ($stmt->rowCount() === 0) {
        // Cek apakah produk ada
        $check = $conn->prepare("SELECT id FROM products WHERE id = ? AND user_id = ?");
        $check->execute([$id, $userId]);
        if (!$check->fetch()) sendResponse(404, false, "Produk tidak ditemukan.");
    }

    $stmt = $conn->prepare("SELECT * FROM products WHERE id = ? AND user_id = ?");
    $stmt->execute([$id, $userId]);
    sendResponse(200, true, "Produk berhasil diupdate!", $stmt->fetch(PDO::FETCH_ASSOC));
}
// Handle DELETE /api/products/:id
else if ($method === 'DELETE' && !empty($action) && is_numeric($action)) {
    $id = $action;
    $stmt = $conn->prepare("DELETE FROM products WHERE id = ? AND user_id = ?");
    $stmt->execute([$id, $userId]);

    if ($stmt->rowCount() === 0) sendResponse(404, false, "Produk tidak ditemukan.");
    sendResponse(200, true, "Produk berhasil dihapus.");
}

sendResponse(404, false, "Products Endpoint Not Found");
?>
