<?php
require_once __DIR__ . '/../vendor/autoload.php';

use Saturio\DuckDB\DuckDB;

$dbPath = __DIR__ . '/../db/test1.duckdb';
$duckDB = DuckDB::create($dbPath);

$result = null;
$error = null;
$executionTime = null;

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['sql'])) {
    $sql = trim($_POST['sql']);
    
    if (!empty($sql)) {
        try {
            $startTime = microtime(true);
            $result = $duckDB->query($sql);
            $executionTime = round((microtime(true) - $startTime) * 1000, 2);
        } catch (Exception $e) {
            $error = $e->getMessage();
        }
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SQL Query Interface</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div class="container">
        <h1>🔍 SQL Query Interface</h1>
        
        <div class="info">
            <strong>Database:</strong> <?php echo htmlspecialchars($dbPath); ?>
        </div>
        
        <?php if ($error): ?>
            <div class="message error">
                ❌ <strong>Error:</strong> <?php echo htmlspecialchars($error); ?>
            </div>
        <?php endif; ?>
        
        <?php if ($result !== null && $error === null): ?>
            <div class="message success">
                ✅ <strong>Query executed successfully</strong><br>
                <small>Execution time: <?php echo $executionTime; ?> ms</small>
            </div>
        <?php endif; ?>
        
        <form method="POST">
            <label for="sql">SQL Query:</label>
            <textarea name="sql" id="sql" placeholder="Enter your SQL query here..."><?php echo isset($_POST['sql']) ? htmlspecialchars($_POST['sql']) : ''; ?></textarea>
            
            <div class="button-group">
                <button type="submit" class="btn-action">Execute Query</button>
                <button type="button" class="btn-cancel" onclick="document.getElementById('sql').value = '';">Clear</button>
            </div>
        </form>
        
        <?php if ($result !== null): ?>
            <div class="table-wrapper">
                <?php
                $rows = iterator_to_array($result->rows(columnNameAsKey: true));
                $rowCount = count($rows);
                ?>
                
                <?php if ($rowCount > 0): ?>
                    <table class="sql-results">
                        <thead>
                            <tr>
                                <?php foreach (array_keys($rows[0]) as $column): ?>
                                    <th class="alt-style"><?php echo htmlspecialchars($column); ?></th>
                                <?php endforeach; ?>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($rows as $row): ?>
                                <tr>
                                    <?php foreach ($row as $value): ?>
                                        <td><?php echo htmlspecialchars($value ?? 'NULL'); ?></td>
                                    <?php endforeach; ?>
                                </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                    <div class="record-count">
                        <?php echo $rowCount; ?> row<?php echo $rowCount !== 1 ? 's' : ''; ?> returned
                    </div>
                <?php else: ?>
                    <div class="info" style="text-align: center; font-style: italic;">
                        Query executed successfully but returned no results.
                    </div>
                <?php endif; ?>
            </div>
        <?php endif; ?>
        
        <div class="examples">
            <h3>Example Queries:</h3>
            <div class="example-query" onclick="setQuery(this)">SHOW TABLES;</div>
            <div class="example-query" onclick="setQuery(this)">SELECT * FROM information_schema.tables;</div>
            <div class="example-query" onclick="setQuery(this)">PRAGMA database_size;</div>
            <div class="example-query" onclick="setQuery(this)">SELECT current_timestamp;</div>
        </div>
    </div>
    
    <script>
        function setQuery(element) {
            document.getElementById('sql').value = element.textContent;
            document.getElementById('sql').focus();
        }
    </script>
</body>
</html>
