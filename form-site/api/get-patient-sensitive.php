<?php
/**
 * Get Patient Sensitive Fields API
 * Returns sensitive patient fields (AVS, email, telephone, adresse)
 * via admin auth (fields may be restricted in PB rules)
 */

require_once 'config.php';
require_once 'helpers.php';

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

echo json_encode([
    'success' => true,
    'fields' => [
        'avs' => $patient['avs'] ?? '',
        'email' => $patient['email'] ?? '',
        'telephone' => $patient['telephone'] ?? '',
        'adresse' => $patient['adresse'] ?? ''
    ]
]);
