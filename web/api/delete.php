<?php


require_once __DIR__ . '/config.php';
require_once AUTOLOAD_PATH;

use Saturio\DuckDB\DuckDB;
use Saturio\DuckDB\Type\Timestamp;

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
    
    // Get POST data for WHERE conditions
    $postData = $_POST;
    
    // Build SQL query
    $sql = "DELETE FROM $tableName";
    
    // If POST data exists, build WHERE clause
    if (!empty($postData)) {
        $whereConditions = [];
        
        // Validate column names and build WHERE conditions
        foreach ($postData as $column => $value) {
            // Validate column name (alphanumeric and underscores only)
            if (!preg_match('/^[a-zA-Z0-9_]+$/', $column)) {
                throw new Exception("Invalid column name: $column");
            }
            $whereConditions[] = "$column = ?";
        }
        
        // Add WHERE clause with AND operations
        $sql .= " WHERE " . implode(' AND ', $whereConditions);
    }
    
    // Prepare statement
    $stmt = $duckDB->preparedStatement($sql);
    
    // Bind parameters if POST data exists
    if (!empty($postData)) {
        $paramIndex = 1;
        foreach ($postData as $value) {
            // Convert string values to appropriate types
            // DuckDB bindParam requires properly typed values
            if ($value === null || $value === '') {
                $typedValue = null;
            } elseif (is_numeric($value)) {
                // Check if it's an integer or float
                $typedValue = (strpos($value, '.') !== false) ? (float)$value : (int)$value;
            } else {
                // Try to parse as DateTime for timestamp columns
                // Match common timestamp formats
                if (preg_match('/^\d{4}-\d{2}-\d{2}[\s T]\d{2}:\d{2}:\d{2}/', $value)) {
                    try {
                        $dateTime = new DateTime($value);
                        $typedValue = Timestamp::fromDatetime($dateTime);
                    } catch (Exception $e) {
                        $typedValue = $value;
                    }
                } else {
                    $typedValue = $value;
                }
            }
            
            $stmt->bindParam($paramIndex++, $typedValue);
        }
    }
    
    // Execute the DELETE statement
    $result = $stmt->execute();
    
    // Return success response
    echo json_encode([
        'success' => true,
        'message' => 'Delete operation completed',
        'table' => $tableName,
        'conditions' => !empty($postData) ? $postData : 'all rows'
    ], JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ], JSON_PRETTY_PRINT);
}
