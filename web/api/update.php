<?php
/**
 * Generic Update API
 * Batch updates records in any specified table
 */

require_once __DIR__ . '/config.php';
require_once AUTOLOAD_PATH;

use Saturio\DuckDB\DuckDB;

header('Content-Type: application/json');


try {
    $db = DuckDB::create(DB_PATH);

    // Get JSON input
    $input = file_get_contents('php://input');
    $jsonData = json_decode($input, true);
    
    if (!$jsonData || !isset($jsonData['table']) || !isset($jsonData['updates'])) {
        echo json_encode([
            'success' => false,
            'error' => 'Invalid request. Expected JSON with "table" and "updates" array'
        ]);
        exit;
    }
    
    $table = $jsonData['table'];
    $updates = $jsonData['updates'];
    
    // Validate table name (whitelist allowed tables for security)
    $allowedTables = ['mcu_parameters', 'types', 'quantities', 'units'];
    if (!in_array($table, $allowedTables)) {
        echo json_encode([
            'success' => false,
            'error' => 'Invalid or unauthorized table'
        ]);
        exit;
    }
    
    if (!is_array($updates) || empty($updates)) {
        echo json_encode([
            'success' => false,
            'error' => 'Invalid or empty updates array'
        ]);
        exit;
    }
    
    $successCount = 0;
    $errors = [];
    
    // Process each update
    foreach ($updates as $update) {
        $id = (int)($update['id'] ?? 0);
        
        if ($id <= 0) {
            $errors[] = "Invalid ID in batch";
            continue;
        }
        
        // Remove id from fields to update
        $fields = $update;
        unset($fields['id']);
        
        if (empty($fields)) {
            $errors[] = "No fields to update for ID $id";
            continue;
        }
        
        // Build dynamic UPDATE query
        $setClause = [];
        $values = [];
        foreach ($fields as $field => $value) {
            // Sanitize field names (alphanumeric and underscore only)
            if (!preg_match('/^[a-zA-Z0-9_]+$/', $field)) {
                $errors[] = "Invalid field name: $field";
                continue 2; // Skip this update entirely
            }
            $setClause[] = "$field = ?";
            $values[] = $value;
        }
        
        $values[] = $id; // Add ID for WHERE clause
        
        $sql = "UPDATE $table SET " . implode(', ', $setClause) . " WHERE id = ?";
        
        try {
            $stmt = $db->preparedStatement($sql);
            
            // Bind all field values (1-indexed)
            for ($i = 0; $i < count($values) - 1; $i++) {
                $stmt->bindParam($i + 1, $values[$i]);
            }
            // Bind ID parameter last
            $stmt->bindParam(count($values), $values[count($values) - 1]);
            
            $stmt->execute();
            $successCount++;
        } catch (Exception $e) {
            $errors[] = "Error updating ID $id: " . $e->getMessage();
        }
    }
    
    echo json_encode([
        'success' => $successCount > 0,
        'message' => "Updated $successCount record(s)",
        'successCount' => $successCount,
        'errors' => $errors
    ]);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => 'Database error: ' . $e->getMessage()
    ]);
}
