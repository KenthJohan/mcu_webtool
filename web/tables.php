<?php
// Database connection
$db_path = '../db/test1.duckdb';

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

// Handle table deletion
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['delete_table'])) {
    $table_to_delete = $_POST['delete_table'];
    
    try {
        // Validate table name (alphanumeric and underscore only)
        if (!preg_match('/^[a-zA-Z0-9_]+$/', $table_to_delete)) {
            throw new Exception("Invalid table name");
        }
        
        // Get all tables to verify the table exists
        $tables_result = executeDuckDBQuery($db_path, "SHOW TABLES");
        $tables = array_column($tables_result, 'name');
        
        if (in_array($table_to_delete, $tables)) {
            executeDuckDBQuery($db_path, "DROP TABLE $table_to_delete");
            $message = "Table '$table_to_delete' has been deleted successfully.";
            $message_type = "success";
        } else {
            $message = "Invalid table name.";
            $message_type = "error";
        }
    } catch (Exception $e) {
        $message = "Error deleting table: " . $e->getMessage();
        $message_type = "error";
    }
    
    // Redirect to prevent resubmission
    header("Location: " . $_SERVER['PHP_SELF'] . "?msg=" . urlencode($message) . "&type=" . $message_type);
    exit;
}

// Get message from redirect
$message = isset($_GET['msg']) ? $_GET['msg'] : '';
$message_type = isset($_GET['type']) ? $_GET['type'] : '';

try {
    // Check if database file exists
    if (!file_exists($db_path)) {
        throw new Exception("Database file not found at path: $db_path");
    }
    
    // Get all tables
    $tables_result = executeDuckDBQuery($db_path, "SHOW TABLES");
    $tables = array_column($tables_result, 'name');
    
    // Get schema for each table
    $table_schemas = [];
    foreach ($tables as $table) {
        $schema = executeDuckDBQuery($db_path, "DESCRIBE $table");
        $table_schemas[$table] = $schema;
    }
    
} catch (Exception $e) {
    die("Error: " . $e->getMessage());
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Database Schema Viewer</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div class="container">
        <h1>📊 Database Schema Viewer</h1>
        
        <div class="info">
            Database: <strong><?php echo htmlspecialchars($db_path); ?></strong>
        </div>
        
        <?php if ($message): ?>
            <div class="message <?php echo htmlspecialchars($message_type); ?>">
                <?php echo htmlspecialchars($message); ?>
            </div>
        <?php endif; ?>
        
        <div class="stats">
            <div class="stat-box">
                <div class="stat-number"><?php echo count($tables); ?></div>
                <div class="stat-label">Total Tables</div>
            </div>
            <div class="stat-box">
                <div class="stat-number">
                    <?php 
                    $total_columns = 0;
                    foreach ($table_schemas as $schema) {
                        $total_columns += count($schema);
                    }
                    echo $total_columns;
                    ?>
                </div>
                <div class="stat-label">Total Columns</div>
            </div>
        </div>
        
        <?php foreach ($table_schemas as $table_name => $schema): ?>
            <div class="schema-table">
                <div class="table-header">
                    <h2>🗂️ <?php echo htmlspecialchars($table_name); ?></h2>
                    <button class="delete-btn" onclick="confirmDelete('<?php echo htmlspecialchars($table_name); ?>')">
                        🗑️ Delete Table
                    </button>
                </div>
                
                <div class="table-wrapper">
                    <table>
                        <thead>
                            <tr>
                                <th>Column Name</th>
                                <th>Type</th>
                                <th>Nullable</th>
                                <th>Key</th>
                                <th>Default</th>
                                <th>Extra</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($schema as $column): ?>
                                <tr>
                                    <td><strong><?php echo htmlspecialchars($column['column_name']); ?></strong></td>
                                    <td><code><?php echo htmlspecialchars($column['column_type']); ?></code></td>
                                    <td class="<?php echo $column['null'] === 'YES' ? 'nullable-yes' : 'nullable-no'; ?>">
                                        <?php echo htmlspecialchars($column['null']); ?>
                                    </td>
                                    <td>
                                        <?php if ($column['key'] && $column['key'] !== 'NULL'): ?>
                                            <span class="key-badge key-<?php echo strtolower($column['key']); ?>">
                                                <?php echo htmlspecialchars($column['key']); ?>
                                            </span>
                                        <?php endif; ?>
                                    </td>
                                    <td><?php echo $column['default'] && $column['default'] !== 'NULL' ? htmlspecialchars($column['default']) : '-'; ?></td>
                                    <td><?php echo $column['extra'] && $column['extra'] !== 'NULL' ? htmlspecialchars($column['extra']) : '-'; ?></td>
                                </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                </div>
            </div>
        <?php endforeach; ?>
        
        <?php if (empty($tables)): ?>
            <div class="info" style="background-color: #fff3cd; color: #856404;">
                No tables found in the database.
            </div>
        <?php endif; ?>
    </div>
    
    <!-- Confirmation Modal -->
    <div id="confirmModal" class="confirmation-modal">
        <div class="modal-content">
            <h2>⚠️ Confirm Deletion</h2>
            <p>Are you sure you want to delete the table <strong id="tableToDelete"></strong>?</p>
            <p style="color: #dc3545; font-weight: bold;">This action cannot be undone!</p>
            <div class="modal-buttons">
                <form id="deleteForm" method="POST">
                    <input type="hidden" name="delete_table" id="deleteTableInput">
                    <button type="submit" class="btn-confirm">Yes, Delete</button>
                </form>
                <button class="btn-cancel" onclick="closeModal()">Cancel</button>
            </div>
        </div>
    </div>
    
    <script>
        function confirmDelete(tableName) {
            document.getElementById('tableToDelete').textContent = tableName;
            document.getElementById('deleteTableInput').value = tableName;
            document.getElementById('confirmModal').style.display = 'block';
        }
        
        function closeModal() {
            document.getElementById('confirmModal').style.display = 'none';
        }
        
        // Close modal when clicking outside
        window.onclick = function(event) {
            const modal = document.getElementById('confirmModal');
            if (event.target === modal) {
                closeModal();
            }
        }
        
        // Close modal with Escape key
        document.addEventListener('keydown', function(event) {
            if (event.key === 'Escape') {
                closeModal();
            }
        });
    </script>
</body>
</html>
