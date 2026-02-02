<?php
/**
 * Get Form API Endpoint
 * Retrieves submitted form for editing
 * Decrypts patient data before returning
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
$editToken = $input['edit_token'] ?? '';

if (empty($editToken) || !preg_match('/^[a-f0-9]{64}$/', $editToken)) {
    http_response_code(400);
    echo json_encode(['error' => 'Token invalide']);
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

// Decrypt form data
$formData = [];
if (!empty($formRecord['form_data_encrypted'])) {
    $formData = decryptFormData($formRecord['form_data_encrypted']);
} elseif (!empty($formRecord['form_data'])) {
    // Fallback for legacy unencrypted data
    $formData = $formRecord['form_data'];
}

// Decrypt email
$email = '';
if (!empty($formRecord['email_encrypted'])) {
    $email = decryptData($formRecord['email_encrypted']);
} elseif (!empty($formRecord['email']) && $formRecord['email'] !== '[encrypted]') {
    // Fallback for legacy unencrypted data
    $email = $formRecord['email'];
}

// Decrypt patient name
$patientName = '';
if (!empty($formRecord['patient_name_encrypted'])) {
    $patientName = decryptData($formRecord['patient_name_encrypted']);
} elseif (!empty($formRecord['patient_name']) && $formRecord['patient_name'] !== '[encrypted]') {
    $patientName = $formRecord['patient_name'];
}

echo json_encode([
    'success' => true,
    'form_id' => $formRecord['id'],
    'email' => $email,
    'patient_name' => $patientName,
    'form_data' => $formData,
    'language' => $formRecord['language'] ?? 'fr',
    'status' => $formRecord['status'] ?? 'submitted'
]);
