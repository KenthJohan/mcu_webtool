<?php
// Database connection
$db_path = '../db/test1.duckdb';

require_once 'misc_duckdb.php';

// Get table name from GET parameter
$table_name = isset($_GET['table']) ? $_GET['table'] : '';
$error = '';
$schema = [];

try {
    // Check if database file exists
    if (!file_exists($db_path)) {
        throw new Exception("Database file not found at path: $db_path");
    }
    
    if (empty($table_name)) {
        throw new Exception("No table specified. Please provide a table name via ?table=table_name");
    }
    
    // Validate table name (alphanumeric and underscore only)
    if (!preg_match('/^[a-zA-Z0-9_]+$/', $table_name)) {
        throw new Exception("Invalid table name format");
    }
    
    // Get all tables to verify the table exists
    $tables_result = executeDuckDBQuery($db_path, "SHOW TABLES");
    $tables = array_column($tables_result, 'name');
    
    if (!in_array($table_name, $tables)) {
        throw new Exception("Table '$table_name' does not exist in the database");
    }
    
    // Get schema for the table
    $schema = executeDuckDBQuery($db_path, "DESCRIBE $table_name");
    
    // Get row count
    $count_result = executeDuckDBQuery($db_path, "SELECT COUNT(*) as count FROM $table_name");
    $row_count = $count_result[0]['count'];
    
} catch (Exception $e) {
    $error = $e->getMessage();
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Schema: <?php echo htmlspecialchars($table_name); ?></title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div class="container">
        <div style="margin-bottom: 20px;">
            <a href="tables.php" style="text-decoration: none; color: #4CAF50; font-weight: bold;">← Back to All Tables</a>
        </div>
        
        <h1>🗂️ Table Schema: <?php echo htmlspecialchars($table_name); ?></h1>
        
        <div class="info">
            Database: <strong><?php echo htmlspecialchars($db_path); ?></strong>
        </div>
        
        <?php if ($error): ?>
            <div class="message error">
                <?php echo htmlspecialchars($error); ?>
            </div>
            <p><a href="tables.php">View all tables</a></p>
        <?php else: ?>
            
            <div class="stats">
                <div class="stat-box">
                    <div class="stat-number"><?php echo count($schema); ?></div>
                    <div class="stat-label">Total Columns</div>
                </div>
                <div class="stat-box">
                    <div class="stat-number"><?php echo number_format($row_count); ?></div>
                    <div class="stat-label">Total Rows</div>
                </div>
                <div class="stat-box">
                    <div class="stat-number">
                        <?php 
                        $pk_count = 0;
                        foreach ($schema as $col) {
                            if ($col['key'] === 'PRI') $pk_count++;
                        }
                        echo $pk_count;
                        ?>
                    </div>
                    <div class="stat-label">Primary Keys</div>
                </div>
            </div>
            
            <div class="table-wrapper">
                <table>
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Column Name</th>
                            <th>Type</th>
                            <th>Nullable</th>
                            <th>Key</th>
                            <th>Default</th>
                            <th>Extra</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($schema as $index => $column): ?>
                            <tr>
                                <td><?php echo $index + 1; ?></td>
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
            
            <div style="margin-top: 30px;">
                <h2>Actions</h2>
                <div style="display: flex; gap: 10px; margin-top: 15px;">
                    <a href="table.php?name=<?php echo urlencode($table_name); ?>" class="btn-action">View Data</a>
                    <a href="tables.php" class="btn-action">Back to Tables</a>
                </div>
            </div>
            
        <?php endif; ?>
    </div>
</body>
</html>

