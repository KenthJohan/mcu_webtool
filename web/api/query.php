<?php

require_once __DIR__ . '/config.php';
require_once AUTOLOAD_PATH;

use Saturio\DuckDB\DuckDB;

header('Content-Type: application/json');

try {
    // Get table name from GET parameter
    if (!isset($_GET['table']) || empty($_GET['table'])) {
        throw new Exception('Table parameter is required');
    }
    
    $tableName = $_GET['table'];
    
    // Validate table name (alphanumeric and underscores only)
    if (!preg_match('/^[a-zA-Z0-9_]+$/', $tableName)) {
        throw new Exception('Invalid table name');
    }
    

    
    if (!file_exists(DB_PATH)) {
        throw new Exception('Database file not found');
    }
    
    // Connect to DuckDB using PHP client
    $duckDB = DuckDB::create(DB_PATH);
    
    // Use prepared statement for safe querying
    $stmt = $duckDB->preparedStatement("SELECT * FROM $tableName");
    $result = $stmt->execute();
    
    // Fetch all results - convert iterator to array with column names as keys
    $results = iterator_to_array($result->rows(columnNameAsKey: true));
    
    // Return as JSON
    echo json_encode([
        'success' => true,
        'table' => $tableName,
        'count' => count($results),
        'data' => $results
    ], JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ], JSON_PRETTY_PRINT);
}
