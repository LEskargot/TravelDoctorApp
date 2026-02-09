<?php
/**
 * Save Prescription API
 * Encrypts medications and creates a prescription record
 */

require_once 'config.php';
require_once 'helpers.php';
require_once 'encryption.php';

header('Content-Type: application/json');
corsHeaders();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);

$consultationId = $input['consultation_id'] ?? '';
$date = $input['date'] ?? date('Y-m-d');
$medications = $input['medications'] ?? [];

if (empty($consultationId)) {
    http_response_code(400);
    echo json_encode(['error' => 'consultation_id requis']);
    exit;
}

if (empty($medications)) {
    http_response_code(400);
    echo json_encode(['error' => 'medications requis']);
    exit;
}

$adminToken = pbAdminAuth();
if (!$adminToken) {
    http_response_code(500);
    echo json_encode(['error' => 'Erreur de connexion à la base de données']);
    exit;
}

// Encrypt medications
$encrypted = encryptFormData($medications);

$result = pbRequest(
    '/api/collections/prescriptions/records',
    'POST',
    [
        'consultation' => $consultationId,
        'date' => $date,
        'medications_encrypted' => $encrypted
    ],
    $adminToken
);

if (!$result || isset($result['code'])) {
    http_response_code(500);
    echo json_encode(['error' => 'Erreur lors de la sauvegarde']);
    exit;
}

echo json_encode([
    'success' => true,
    'id' => $result['id']
]);
