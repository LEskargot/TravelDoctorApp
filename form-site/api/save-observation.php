<?php
/**
 * Save Observation API
 * Encrypts value and creates an observation record
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

$patientId = $input['patient_id'] ?? '';
$type = $input['type'] ?? '';
$value = $input['value'] ?? null;
$unit = $input['unit'] ?? '';
$date = $input['date'] ?? date('Y-m-d');
$consultationId = $input['consultation_id'] ?? null;

if (empty($patientId) || empty($type) || $value === null) {
    http_response_code(400);
    echo json_encode(['error' => 'patient_id, type et value requis']);
    exit;
}

validatePbId($patientId, 'patient_id');
if ($consultationId) {
    validatePbId($consultationId, 'consultation_id');
}

$adminToken = pbAdminAuth();
if (!$adminToken) {
    http_response_code(500);
    echo json_encode(['error' => 'Erreur de connexion à la base de données']);
    exit;
}

// Encrypt the value
$encryptedValue = encryptData(is_string($value) ? $value : json_encode($value));

$data = [
    'patient' => $patientId,
    'type' => $type,
    'value_encrypted' => $encryptedValue,
    'unit' => $unit,
    'date' => $date
];

if ($consultationId) {
    $data['consultation'] = $consultationId;
}

$result = pbRequest(
    '/api/collections/observations/records',
    'POST',
    $data,
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
