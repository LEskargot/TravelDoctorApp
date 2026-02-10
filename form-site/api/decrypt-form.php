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

$authUser = requireAuth();

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

validatePbId($formId, 'id');

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

// Get linked patient (created at form submission)
$existingPatient = null;
if (!empty($response['linked_patient'])) {
    $patientResponse = pbRequest(
        "/api/collections/patients/records/{$response['linked_patient']}",
        'GET',
        null,
        $adminToken
    );
    if ($patientResponse && !isset($patientResponse['code'])) {
        $existingPatient = $patientResponse;
    }
}

// Get linked case
$caseId = null;
$caseFilter = urlencode("patient_form = '{$formId}'");
$casesResponse = pbRequest(
    "/api/collections/cases/records?filter={$caseFilter}&perPage=1",
    'GET',
    null,
    $adminToken
);
if ($casesResponse && !empty($casesResponse['items'])) {
    $caseId = $casesResponse['items'][0]['id'];
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
    'existing_patient' => $existingPatient,
    'case_id' => $caseId
]);
