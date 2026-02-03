<?php
/**
 * Mark Form Processed API
 * Marks a submitted form as processed after import into main app
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

// Get JSON body
$input = json_decode(file_get_contents('php://input'), true);

$formId = $input['form_id'] ?? '';
$patientId = $input['patient_id'] ?? null; // ID of patient created/linked
$action = $input['action'] ?? 'process'; // 'process' or 'delete'

if (empty($formId)) {
    http_response_code(400);
    echo json_encode(['error' => 'ID du formulaire requis']);
    exit;
}

// Authenticate with PocketBase
$adminToken = pbAdminAuth();
if (!$adminToken) {
    http_response_code(500);
    echo json_encode(['error' => 'Erreur de connexion à la base de données']);
    exit;
}

// Verify form exists
$formResponse = pbRequest(
    "/api/collections/patient_forms/records/{$formId}",
    'GET',
    null,
    $adminToken
);

if (!$formResponse || isset($formResponse['code'])) {
    http_response_code(404);
    echo json_encode(['error' => 'Formulaire non trouvé']);
    exit;
}

if ($action === 'delete') {
    // Delete the form entirely
    $deleteResponse = pbRequest(
        "/api/collections/patient_forms/records/{$formId}",
        'DELETE',
        null,
        $adminToken
    );

    if ($deleteResponse === false) {
        http_response_code(500);
        echo json_encode(['error' => 'Erreur lors de la suppression du formulaire']);
        exit;
    }

    // Also delete associated vaccination files
    if (!empty($formResponse['vaccination_files'])) {
        foreach ($formResponse['vaccination_files'] as $fileId) {
            pbRequest(
                "/api/collections/vaccination_files/records/{$fileId}",
                'DELETE',
                null,
                $adminToken
            );
        }
    }

    echo json_encode([
        'success' => true,
        'message' => 'Formulaire supprimé'
    ]);
    exit;
}

// Default action: mark as processed
$updateData = [
    'status' => 'processed',
    'processed_at' => date('Y-m-d H:i:s')
];

if (!empty($patientId)) {
    $updateData['linked_patient'] = $patientId;
}

$updateResponse = pbRequest(
    "/api/collections/patient_forms/records/{$formId}",
    'PATCH',
    $updateData,
    $adminToken
);

if (!$updateResponse || isset($updateResponse['code'])) {
    http_response_code(500);
    echo json_encode(['error' => 'Erreur lors de la mise à jour du formulaire']);
    exit;
}

echo json_encode([
    'success' => true,
    'message' => 'Formulaire marqué comme traité',
    'form_id' => $formId,
    'patient_id' => $patientId
]);
