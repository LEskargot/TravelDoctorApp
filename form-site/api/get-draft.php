<?php
/**
 * Get Draft API Endpoint
 * Retrieves saved form by edit token
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

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$token = $_GET['token'] ?? '';

// Validate token format
if (empty($token) || !preg_match('/^[a-f0-9]{64}$/', $token)) {
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

// Search for form by edit_token
$filter = urlencode("edit_token = '{$token}'");
$formResponse = pbRequest(
    '/api/collections/patient_forms/records?filter=' . $filter,
    'GET',
    null,
    $adminToken
);

if (!$formResponse || empty($formResponse['items'])) {
    http_response_code(404);
    echo json_encode(['error' => 'Formulaire non trouvé']);
    exit;
}

$form = $formResponse['items'][0];

// Decrypt form data
$formData = [];
if (!empty($form['form_data_encrypted'])) {
    $formData = decryptFormData($form['form_data_encrypted']);
}

// Decrypt email
$email = '';
if (!empty($form['email_encrypted'])) {
    $email = decryptData($form['email_encrypted']);
}
$formData['email'] = $email;

// Decrypt patient name
if (!empty($form['patient_name_encrypted'])) {
    $formData['full_name'] = decryptData($form['patient_name_encrypted']);
}

// Decrypt AVS
if (!empty($form['avs_encrypted'])) {
    $formData['avs'] = decryptData($form['avs_encrypted']);
}

// Decrypt insurance card number
if (!empty($form['insurance_card_encrypted'])) {
    $formData['insurance_card_number'] = decryptData($form['insurance_card_encrypted']);
}

// Determine step_reached: start at 1 for draft forms, otherwise use stored value or default
$stepReached = 1;
if ($form['status'] === 'submitted') {
    $stepReached = 6; // Go to summary for submitted forms
} elseif (!empty($form['step_reached'])) {
    $stepReached = intval($form['step_reached']);
}

// Return decrypted data
echo json_encode([
    'success' => true,
    'form_data' => $formData,
    'step_reached' => $stepReached,
    'language' => $form['language'] ?? 'fr',
    'email' => $email,
    'is_submitted' => ($form['status'] === 'submitted'),
    'form_id' => $form['id'],
    'created' => $form['created'] ?? null,
    'updated' => $form['updated'] ?? null
]);
