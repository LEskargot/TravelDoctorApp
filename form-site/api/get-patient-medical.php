<?php
/**
 * Get Patient Medical Data API
 * Returns decrypted medical_encrypted from patient record
 */

require_once 'config.php';
require_once 'helpers.php';
require_once 'encryption.php';

header('Content-Type: application/json');
corsHeaders();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$patientId = $_GET['patient_id'] ?? '';

if (empty($patientId)) {
    http_response_code(400);
    echo json_encode(['error' => 'ID du patient requis']);
    exit;
}

$adminToken = pbAdminAuth();
if (!$adminToken) {
    http_response_code(500);
    echo json_encode(['error' => 'Erreur de connexion à la base de données']);
    exit;
}

$patient = pbRequest(
    "/api/collections/patients/records/{$patientId}",
    'GET',
    null,
    $adminToken
);

if (!$patient || isset($patient['code']) || empty($patient['id'])) {
    http_response_code(404);
    echo json_encode(['error' => 'Patient non trouvé']);
    exit;
}

$medical = null;
if (!empty($patient['medical_encrypted'])) {
    try {
        $medical = decryptFormData($patient['medical_encrypted']);
    } catch (Exception $e) {
        error_log('Failed to decrypt patient medical: ' . $e->getMessage());
    }
}

echo json_encode([
    'success' => true,
    'medical' => $medical
]);
