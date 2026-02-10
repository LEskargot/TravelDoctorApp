<?php
/**
 * Save Patient Medical Data API
 * Encrypts and saves medical data to patient's medical_encrypted field
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
$medical = $input['medical'] ?? null;

if (empty($patientId)) {
    http_response_code(400);
    echo json_encode(['error' => 'ID du patient requis']);
    exit;
}

validatePbId($patientId, 'patient_id');

if ($medical === null) {
    http_response_code(400);
    echo json_encode(['error' => 'Données médicales requises']);
    exit;
}

$adminToken = pbAdminAuth();
if (!$adminToken) {
    http_response_code(500);
    echo json_encode(['error' => 'Erreur de connexion à la base de données']);
    exit;
}

// Encrypt medical data
$encrypted = encryptFormData($medical);

// Update patient
$result = pbRequest(
    "/api/collections/patients/records/{$patientId}",
    'PATCH',
    ['medical_encrypted' => $encrypted],
    $adminToken
);

if (!$result || isset($result['code'])) {
    http_response_code(500);
    echo json_encode(['error' => 'Erreur lors de la sauvegarde']);
    exit;
}

echo json_encode([
    'success' => true
]);
