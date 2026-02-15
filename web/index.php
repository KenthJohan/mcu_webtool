<?php
/**
 * DuckDB Parquet Viewer - Index Page
 */

$db1_path = realpath(__DIR__ . '/../db1');
$parquet_files = [];

// Scan for parquet files in db1 folder
if (is_dir($db1_path)) {
    $files = scandir($db1_path);
    foreach ($files as $file) {
        if (pathinfo($file, PATHINFO_EXTENSION) === 'parquet') {
            $parquet_files[] = $file;
        }
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DuckDB Parquet Viewer</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
        }
        .container {
            max-width: 800px;
            margin: 50px auto;
            background-color: white;
            padding: 40px;
            border-radius: 12px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        }
        h1 {
            color: #333;
            text-align: center;
            margin-bottom: 10px;
        }
        .subtitle {
            text-align: center;
            color: #666;
            margin-bottom: 30px;
        }
        .file-list {
            list-style: none;
            padding: 0;
        }
        .file-item {
            background-color: #f8f9fa;
            padding: 15px 20px;
            margin-bottom: 10px;
            border-radius: 6px;
            border-left: 4px solid #4CAF50;
            transition: all 0.3s ease;
        }
        .file-item:hover {
            background-color: #e9ecef;
            transform: translateX(5px);
        }
        .file-item a {
            text-decoration: none;
            color: #333;
            font-weight: 500;
            display: block;
        }
        .no-files {
            text-align: center;
            padding: 30px;
            color: #999;
        }
        .info-box {
            background-color: #e3f2fd;
            padding: 15px;
            border-radius: 6px;
            margin-bottom: 20px;
            border-left: 4px solid #2196F3;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>📊 DuckDB Parquet Viewer</h1>
        <p class="subtitle">View and explore Parquet files with DuckDB</p>
        
        <div class="info-box">
            <strong>Database folder:</strong> <?php echo htmlspecialchars($db1_path); ?>
        </div>
        
        <?php if (empty($parquet_files)): ?>
            <div class="no-files">
                No parquet files found in the db1 folder.
            </div>
        <?php else: ?>
            <h3>Available Parquet Files:</h3>
            <ul class="file-list">
                <?php foreach ($parquet_files as $file): ?>
                    <li class="file-item">
                        <a href="table.php?file=<?php echo urlencode($file); ?>">
                            📄 <?php echo htmlspecialchars($file); ?>
                        </a>
                    </li>
                <?php endforeach; ?>
            </ul>
        <?php endif; ?>
    </div>
</body>
</html>
