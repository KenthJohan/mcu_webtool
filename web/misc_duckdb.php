<?php
/**
 * Execute a DuckDB query and return the result as JSON
 */
function executeDuckDBQuery($db_path, $query) {
    $escaped_query = escapeshellarg($query);
    $escaped_path = escapeshellarg($db_path);
    $command = "duckdb $escaped_path -json -c $escaped_query 2>&1";
    
    $output = shell_exec($command);
    if ($output === null) {
        throw new Exception("Failed to execute DuckDB command");
    }
    
    // Check for errors
    if (strpos($output, 'Error:') !== false) {
        throw new Exception($output);
    }
    
    $result = json_decode($output, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception("Failed to parse DuckDB output: " . json_last_error_msg());
    }
    
    return $result;
}

/**
 * Delete a table from the database
 * 
 * @param string $db_path Path to the DuckDB database file
 * @param string $table_name Name of the table to delete
 * @return array Associative array with 'success' (bool) and 'message' (string) keys
 */
function deleteTable($db_path, $table_name) {
    try {
        // Validate table name (alphanumeric and underscore only)
        if (!preg_match('/^[a-zA-Z0-9_]+$/', $table_name)) {
            return [
                'success' => false,
                'message' => "Invalid table name"
            ];
        }
        
        // Get all tables to verify the table exists
        $tables_result = executeDuckDBQuery($db_path, "SHOW TABLES");
        $tables = array_column($tables_result, 'name');
        
        if (!in_array($table_name, $tables)) {
            return [
                'success' => false,
                'message' => "Table '$table_name' does not exist"
            ];
        }
        
        // Delete the table
        executeDuckDBQuery($db_path, "DROP TABLE $table_name");
        
        return [
            'success' => true,
            'message' => "Table '$table_name' has been deleted successfully"
        ];
        
    } catch (Exception $e) {
        return [
            'success' => false,
            'message' => "Error deleting table: " . $e->getMessage()
        ];
    }
}

?>