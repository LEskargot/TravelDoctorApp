<?php
/**
 * Batch Encrypt Data API
 * Encrypts multiple data items in a single request.
 * Used by practitioner app before saving encrypted fields to PocketBase.
 *
 * POST {items: [{key: "medical", data: {...}}, {key: "medications", data: [...]}]}
 * Returns {success: true, encrypted: {medical: "base64...", medications: "base64..."}}
 */

require_once 'config.php';
require_once 'helpers.php';
require_once 'encryption.php';

header('Content-Type: application/json');
corsHeaders();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$authUser = requireAuth();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$items = $input['items'] ?? [];

if (empty($items) || !is_array($items)) {
    http_response_code(400);
    echo json_encode(['error' => 'items array required']);
    exit;
}

try {
    $encrypted = [];
    foreach ($items as $item) {
        $key = $item['key'] ?? null;
        $data = $item['data'] ?? null;

        if (!$key) continue;

        if ($data === null) {
            $encrypted[$key] = '';
        } else {
            $encrypted[$key] = encryptFormData($data);
        }
    }

    echo json_encode([
        'success' => true,
        'encrypted' => $encrypted
    ]);
} catch (Exception $e) {
    error_log('Encrypt error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Encryption failed']);
}
