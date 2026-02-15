<?php

require_once __DIR__ . '/config.php';
require_once AUTOLOAD_PATH;

use Saturio\DuckDB\DuckDB;

header('Content-Type: application/json');

$duckDB = DuckDB::create(DB_PATH);

$response = [
    'success' => false,
    'data' => null,
    'error' => null,
    'executionTime' => null
];

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['sql'])) {
    $sql = trim($_POST['sql']);

    if (!empty($sql)) {
        try {
            $startTime = microtime(true);
            $result = $duckDB->query($sql);
            $executionTime = round((microtime(true) - $startTime) * 1000, 2);
            
            $response['success'] = true;
            $response['data'] = iterator_to_array($result->rows(columnNameAsKey: true));
            $response['executionTime'] = $executionTime;
        } catch (Exception $e) {
            $response['error'] = $e->getMessage();
        }
    } else {
        $response['error'] = 'SQL query is required';
    }
} else {
    $response['error'] = 'Invalid request method or missing SQL parameter';
}

echo json_encode($response);
