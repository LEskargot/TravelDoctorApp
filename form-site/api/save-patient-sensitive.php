<?php
/**
 * Save Patient Sensitive Fields API
 * Updates sensitive patient fields (AVS, email, telephone, adresse)
 * via admin auth
 */

require_once 'config.php';
require_once 'helpers.php';

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

$patientId = $input['patient_id'] ?? '';

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

// Build update data from provided fields
$updateData = [];
$allowedFields = ['avs', 'email', 'telephone', 'adresse'];

foreach ($allowedFields as $field) {
    if (isset($input[$field])) {
        $updateData[$field] = $input[$field];
    }
}

if (empty($updateData)) {
    http_response_code(400);
    echo json_encode(['error' => 'Aucun champ à mettre à jour']);
    exit;
}

$result = pbRequest(
    "/api/collections/patients/records/{$patientId}",
    'PATCH',
    $updateData,
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
