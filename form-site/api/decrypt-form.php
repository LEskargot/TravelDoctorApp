<?php
/**
 * Decrypt Form API
 * Returns full decrypted form data for import into main app
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

$formId = $_GET['id'] ?? '';

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

// Fetch the form
$response = pbRequest(
    "/api/collections/patient_forms/records/{$formId}",
    'GET',
    null,
    $adminToken
);

if (!$response || isset($response['code'])) {
    http_response_code(404);
    echo json_encode(['error' => 'Formulaire non trouvé']);
    exit;
}

// Decrypt all data
$patientName = '';
if (!empty($response['patient_name_encrypted'])) {
    $patientName = decryptData($response['patient_name_encrypted']);
}

$email = '';
if (!empty($response['email_encrypted'])) {
    $email = decryptData($response['email_encrypted']);
}

$avs = '';
if (!empty($response['avs_encrypted'])) {
    $avs = decryptData($response['avs_encrypted']);
}

$formData = [];
if (!empty($response['form_data_encrypted'])) {
    $formData = decryptFormData($response['form_data_encrypted']);
}

// Get vaccination files info
$vaccinationFiles = [];
if (!empty($response['vaccination_files'])) {
    foreach ($response['vaccination_files'] as $fileId) {
        $fileResponse = pbRequest(
            "/api/collections/vaccination_files/records/{$fileId}",
            'GET',
            null,
            $adminToken
        );

        if ($fileResponse && !isset($fileResponse['code'])) {
            $vaccinationFiles[] = [
                'id' => $fileResponse['id'],
                'original_name' => $fileResponse['original_name'],
                'file' => $fileResponse['file'],
                'url' => POCKETBASE_URL . "/api/files/vaccination_files/{$fileResponse['id']}/{$fileResponse['file']}"
            ];
        }
    }
}

// Check if patient exists
$existingPatient = null;

// First try AVS match
if (!empty($avs)) {
    $avsFilter = urlencode("avs = '{$avs}'");
    $patientSearch = pbRequest(
        "/api/collections/patients/records?filter={$avsFilter}&perPage=1",
        'GET',
        null,
        $adminToken
    );

    if ($patientSearch && !empty($patientSearch['items'])) {
        $existingPatient = $patientSearch['items'][0];
    }
}

// If no AVS match, try DOB + name with normalization
if (!$existingPatient && !empty($formData['birthdate']) && !empty($patientName)) {
    $nameParts = explode(' ', trim($patientName), 2);
    $prenomForm = $nameParts[0] ?? '';
    $nomForm = $nameParts[1] ?? $nameParts[0] ?? '';
    $dobFormatted = date('Y-m-d', strtotime($formData['birthdate']));

    // Fetch all patients with same DOB, then compare names with normalization
    $dobFilter = urlencode("dob = '{$dobFormatted}'");
    $patientSearch = pbRequest(
        "/api/collections/patients/records?filter={$dobFilter}&perPage=50",
        'GET',
        null,
        $adminToken
    );

    if ($patientSearch && !empty($patientSearch['items'])) {
        foreach ($patientSearch['items'] as $patient) {
            // Compare with accent/case normalization
            $prenomMatch = normalizedContains($patient['prenom'], $prenomForm) ||
                           normalizedContains($prenomForm, $patient['prenom']);
            $nomMatch = normalizedContains($patient['nom'], $nomForm) ||
                        normalizedContains($nomForm, $patient['nom']);

            if ($prenomMatch && $nomMatch) {
                $existingPatient = $patient;
                break;
            }
        }
    }
}

echo json_encode([
    'success' => true,
    'form' => [
        'id' => $response['id'],
        'patient_name' => $patientName,
        'email' => $email,
        'avs' => $avs,
        'form_data' => $formData,
        'vaccination_files' => $vaccinationFiles,
        'language' => $response['language'],
        'source' => $response['source'],
        'submitted_at' => $response['submitted_at']
    ],
    'existing_patient' => $existingPatient
]);
