<?php
/**
 * Batch Decrypt Data API
 * Decrypts multiple encrypted items in a single request.
 * Used by practitioner app when reading encrypted fields from PocketBase.
 *
 * POST {items: [{key: "medical", encrypted: "base64..."}, ...]}
 * Returns {success: true, decrypted: {medical: {...}, medications: [...]}}
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
    $decrypted = [];
    foreach ($items as $item) {
        $key = $item['key'] ?? null;
        $encrypted = $item['encrypted'] ?? null;

        if (!$key) continue;

        if (empty($encrypted)) {
            $decrypted[$key] = null;
        } else {
            $decrypted[$key] = decryptFormData($encrypted);
        }
    }

    echo json_encode([
        'success' => true,
        'decrypted' => $decrypted
    ]);
} catch (Exception $e) {
    error_log('Decrypt error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Decryption failed']);
}
