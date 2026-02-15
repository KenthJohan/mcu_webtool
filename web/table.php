<?php
/**
 * DuckDB Parquet Table Viewer
 * Reads parquet files from db1 folder and displays them as HTML tables
 * Uses DuckDB CLI for querying parquet files
 */

// Configuration
$db1_path = realpath(__DIR__ . '/../db1');

// Get file from URL parameter or default to trains.parquet
$requested_file = isset($_GET['file']) ? basename($_GET['file']) : 'trains.parquet';
$parquet_file = $db1_path . '/' . $requested_file;

// Check if parquet file exists
if (!file_exists($parquet_file)) {
    die('<div style="color: red; padding: 20px;">Error: Parquet file not found at: ' . htmlspecialchars($parquet_file) . '</div>');
}

// Validate it's actually a parquet file
if (pathinfo($parquet_file, PATHINFO_EXTENSION) !== 'parquet') {
    die('<div style="color: red; padding: 20px;">Error: Only parquet files are allowed.</div>');
}

// Find DuckDB CLI
$duckdb_path = trim(shell_exec('which duckdb 2>/dev/null') ?? '');
if (empty($duckdb_path)) {
    // Try common locations
    $possible_paths = ['/usr/local/bin/duckdb', '/usr/bin/duckdb', '/opt/homebrew/bin/duckdb'];
    foreach ($possible_paths as $path) {
        if (file_exists($path)) {
            $duckdb_path = $path;
            break;
        }
    }
}

if (empty($duckdb_path) || !file_exists($duckdb_path)) {
    die('<div style="color: red; padding: 20px;">Error: DuckDB CLI not found. Please install it: <pre>wget https://github.com/duckdb/duckdb/releases/download/v1.0.0/duckdb_cli-linux-amd64.zip
unzip duckdb_cli-linux-amd64.zip
sudo mv duckdb /usr/local/bin/</pre></div>');
}

try {
    // Escape the file path for shell command
    $escaped_file = escapeshellarg($parquet_file);
    
    // Query the parquet file using DuckDB CLI and get JSON output
    $query = "SELECT * FROM read_parquet($escaped_file) LIMIT 1000"; // Limit to 1000 rows for performance
    $command = $duckdb_path . " -json -c " . escapeshellarg($query) . " 2>&1";
    
    $output = shell_exec($command);
    
    if (empty($output)) {
        throw new Exception("DuckDB returned no output");
    }
    
    // Check for errors in output
    if (strpos($output, 'Error:') !== false || strpos($output, 'error:') !== false) {
        throw new Exception("DuckDB error: " . $output);
    }
    
    // Parse JSON output (DuckDB returns a single JSON array)
    $rows = json_decode($output, true);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception("JSON decode error: " . json_last_error_msg() . ". Output: " . substr($output, 0, 200));
    }
    
    if (!is_array($rows)) {
        throw new Exception("Expected array from DuckDB, got: " . gettype($rows));
    }
    
    // Extract column names from first row
    $columns = [];
    if (!empty($rows) && is_array($rows[0])) {
        $columns = array_keys($rows[0]);
    }
    
} catch (Exception $e) {
    die('<div style="color: red; padding: 20px;">Error: ' . htmlspecialchars($e->getMessage()) . '</div>');
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Parquet Table Viewer</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 20px;
            background-color: #f5f5f5;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background-color: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        h1 {
            color: #333;
            border-bottom: 2px solid #4CAF50;
            padding-bottom: 10px;
        }
        .info {
            background-color: #e8f5e9;
            padding: 10px;
            border-radius: 4px;
            margin-bottom: 20px;
            color: #2e7d32;
        }
        .table-wrapper {
            overflow-x: auto;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }
        th {
            background-color: #4CAF50;
            color: white;
            padding: 12px;
            text-align: left;
            font-weight: bold;
            position: sticky;
            top: 0;
        }
        td {
            padding: 10px 12px;
            border-bottom: 1px solid #ddd;
        }
        tr:hover {
            background-color: #f5f5f5;
        }
        tr:nth-child(even) {
            background-color: #fafafa;
        }
        .record-count {
            font-weight: bold;
            color: #666;
            margin-top: 10px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div style="margin-bottom: 20px;">
            <a href="index.php" style="text-decoration: none; color: #4CAF50; font-weight: bold;">← Back to File List</a>
        </div>
        
        <h1>📊 Parquet Table Viewer</h1>
        
        <div class="info">
            <strong>File:</strong> <?php echo htmlspecialchars(basename($parquet_file)); ?><br>
            <strong>Path:</strong> <?php echo htmlspecialchars($parquet_file); ?>
        </div>
        
        <?php if (empty($rows)): ?>
            <p>No data found in the parquet file.</p>
        <?php else: ?>
            <div class="record-count">
                Total Records: <?php echo count($rows); ?> | Columns: <?php echo count($columns); ?>
            </div>
            
            <div class="table-wrapper">
                <table>
                    <thead>
                        <tr>
                            <?php foreach ($columns as $column): ?>
                                <th><?php echo htmlspecialchars($column); ?></th>
                            <?php endforeach; ?>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($rows as $row): ?>
                            <tr>
                                <?php foreach ($columns as $column): ?>
                                    <td><?php echo htmlspecialchars($row[$column] ?? ''); ?></td>
                                <?php endforeach; ?>
                            </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
        <?php endif; ?>
    </div>
</body>
</html>
