<?php
class Database {
    // Untuk lokal (XAMPP), gunakan localhost.
    // Nanti sebelum di-upload ke InfinityFree, ubah ke:
    // private $host = "sql302.infinityfree.com";
    // private $db_name = "if0_41853658_invoiceflow";
    // private $username = "if0_41853658";
    // private $password = "rk4uSqs2Cw";
    
    private $host = "127.0.0.1";
    private $db_name = "invoiceflow";
    private $username = "root";
    private $password = "";
    public $conn;

    public function getConnection() {
        $this->conn = null;
        try {
            $this->conn = new PDO("mysql:host=" . $this->host . ";dbname=" . $this->db_name, $this->username, $this->password);
            $this->conn->exec("set names utf8mb4");
            $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        } catch(PDOException $exception) {
            echo json_encode(["success" => false, "message" => "Connection error: " . $exception->getMessage()]);
            exit;
        }
        return $this->conn;
    }
}
?>
