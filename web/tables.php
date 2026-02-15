<?php
// Database connection
$db_path = '../db/test1.duckdb';

require_once 'misc_duckdb.php';

// Handle table deletion
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['delete_table'])) {
    $table_to_delete = $_POST['delete_table'];
    
    // Call the delete function
    $result = deleteTable($db_path, $table_to_delete);
    
    $message = $result['message'];
    $message_type = $result['success'] ? 'success' : 'error';
    
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
    
} catch (Exception $e) {
    die("Error: " . $e->getMessage());
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Database Tables List</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div class="container">
        <h1>📊 Database Tables</h1>
        
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
        </div>
        
        <div class="table-wrapper">
            <table>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Table Name</th>
                        <th style="text-align: center;">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($tables as $index => $table_name): ?>
                        <tr>
                            <td><?php echo $index + 1; ?></td>
                            <td><strong><?php echo htmlspecialchars($table_name); ?></strong></td>
                            <td style="text-align: center;">
                                <div style="display: flex; gap: 10px; justify-content: center;">
                                    <a href="schema.php?table=<?php echo urlencode($table_name); ?>" class="view-btn" style="text-decoration: none;">
                                        📋 View Schema
                                    </a>
                                    <button class="delete-btn" onclick="confirmDelete('<?php echo htmlspecialchars($table_name); ?>')">
                                        🗑️ Delete
                                    </button>
                                </div>
                            </td>
                        </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </div>
        
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
