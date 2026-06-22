<?php
require_once 'middleware/auth.php';

$user = authenticate();
$userId = $user['id'];

$db = new Database();
$conn = $db->getConnection();

$action = $segments[1] ?? 'stats';

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if ($action === 'stats') {
        // Get Dashboard Stats
        $sql = "
          SELECT
            COALESCE(SUM(CASE WHEN status = 'paid' AND transaction_type = 'sales' THEN total ELSE 0 END), 0) as total_revenue,
            COALESCE(SUM(CASE WHEN status = 'paid' AND transaction_type = 'purchase' THEN total ELSE 0 END), 0) as total_expense,
            COALESCE(SUM(CASE WHEN status IN ('sent', 'overdue') AND transaction_type = 'sales' THEN total ELSE 0 END), 0) as outstanding_sales,
            COALESCE(SUM(CASE WHEN status IN ('sent', 'overdue') AND transaction_type = 'purchase' THEN total ELSE 0 END), 0) as outstanding_purchase,
            COALESCE(SUM(CASE WHEN status = 'overdue' AND transaction_type = 'sales' THEN total ELSE 0 END), 0) as overdue_sales,
            COALESCE(SUM(CASE WHEN status = 'overdue' AND transaction_type = 'purchase' THEN total ELSE 0 END), 0) as overdue_purchase,
            COUNT(CASE WHEN transaction_type = 'sales' THEN 1 END) as total_invoices_sales,
            COUNT(CASE WHEN transaction_type = 'purchase' THEN 1 END) as total_invoices_purchase,
            COUNT(*) as total_invoices
          FROM documents 
          WHERE user_id = ? AND document_type = 'invoice' AND transaction_type IN ('sales', 'purchase')
        ";
        $stmt = $conn->prepare($sql);
        $stmt->execute([$userId]);
        $stats = $stmt->fetch(PDO::FETCH_ASSOC);

        // Convert types
        foreach ($stats as $key => $value) {
            $stats[$key] = floatval($value);
        }
        
        $stats['net_profit'] = $stats['total_revenue'] - $stats['total_expense'];
        $stats['outstanding'] = $stats['outstanding_sales'] + $stats['outstanding_purchase'];
        $stats['overdue'] = $stats['overdue_sales'] + $stats['overdue_purchase'];

        // Get Status Counts for Invoices
        $sqlCounts = "SELECT status, COUNT(*) as count FROM documents WHERE user_id = ? AND document_type = 'invoice' GROUP BY status";
        $stmt = $conn->prepare($sqlCounts);
        $stmt->execute([$userId]);
        $countsRows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $counts = [
            'draft' => 0, 'sent' => 0, 'paid' => 0, 'overdue' => 0, 'cancelled' => 0
        ];
        foreach ($countsRows as $row) {
            $counts[$row['status']] = intval($row['count']);
        }

        sendResponse(200, true, "Success", ["stats" => $stats, "counts" => $counts]);
    }
    else if ($action === 'chart') {
        $months = isset($_GET['months']) ? intval($_GET['months']) : 6;
        $sql = "
          SELECT 
            DATE_FORMAT(paid_at, '%Y-%m') as month,
            COALESCE(SUM(total), 0) as revenue
          FROM documents
          WHERE user_id = ? AND transaction_type = 'sales' AND document_type = 'invoice' AND status = 'paid' AND paid_at IS NOT NULL
            AND paid_at >= DATE_SUB(NOW(), INTERVAL ? MONTH)
          GROUP BY DATE_FORMAT(paid_at, '%Y-%m')
          ORDER BY month ASC
        ";
        $stmt = $conn->prepare($sql);
        $stmt->execute([$userId, $months]);
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
        foreach ($data as &$row) {
            $row['revenue'] = floatval($row['revenue']);
        }
        sendResponse(200, true, "Success", $data);
    }
    else if ($action === 'recent') {
        $limit = 5;
        $sql = "
          SELECT d.*, c.name as contact_name
          FROM documents d LEFT JOIN contacts c ON d.contact_id = c.id
          WHERE d.user_id = ? AND d.transaction_type = 'sales' AND d.document_type = 'invoice'
          ORDER BY d.created_at DESC LIMIT ?
        ";
        $stmt = $conn->prepare($sql);
        $stmt->bindParam(1, $userId, PDO::PARAM_INT);
        $stmt->bindParam(2, $limit, PDO::PARAM_INT);
        $stmt->execute();
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Ensure numeric formats
        foreach ($data as &$row) {
            $row['total'] = floatval($row['total']);
        }
        sendResponse(200, true, "Success", $data);
    }
}

sendResponse(404, false, "Dashboard Endpoint Not Found");
?>
