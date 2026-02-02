<?php
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
$editToken = $input['edit_token'] ?? '';
$formData = $input['form_data'] ?? [];
$patientEmail = filter_var($formData['email'] ?? '', FILTER_VALIDATE_EMAIL);

if (empty($editToken) || !preg_match('/^[a-f0-9]{64}$/', $editToken)) {
    http_response_code(400);
    echo json_encode(['error' => 'Token invalide']);
    exit;
}

if (!$patientEmail) {
    http_response_code(400);
    echo json_encode(['error' => 'Email du patient invalide']);
    exit;
}

// Authenticate with PocketBase
$adminToken = pbAdminAuth();
if (!$adminToken) {
    http_response_code(500);
    echo json_encode(['error' => 'Erreur de connexion à la base de données']);
    exit;
}

// Find form by edit token
$filter = urlencode("edit_token = '{$editToken}'");
$searchResponse = pbRequest(
    '/api/collections/patient_forms/records?filter=' . $filter,
    'GET',
    null,
    $adminToken
);

if (!$searchResponse || empty($searchResponse['items'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Formulaire non trouvé']);
    exit;
}

$formRecord = $searchResponse['items'][0];

// Update form
$updateResponse = pbRequest(
    '/api/collections/patient_forms/records/' . $formRecord['id'],
    'PATCH',
    [
        'email' => $patientEmail,
        'form_data' => $formData
    ],
    $adminToken
);

if (!$updateResponse || isset($updateResponse['code'])) {
    http_response_code(500);
    echo json_encode(['error' => 'Erreur lors de la mise à jour']);
    exit;
}

echo json_encode([
    'success' => true,
    'message' => 'Formulaire mis à jour'
]);
