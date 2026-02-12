<?php
/**
 * Update Form API Endpoint
 * Updates a previously submitted form using the edit token
 * All patient data is encrypted before storage
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
$formData = $input['form_data'] ?? [];
$patientEmail = filter_var($formData['email'] ?? '', FILTER_VALIDATE_EMAIL);
$patientAvs = $formData['avs'] ?? '';
$insuranceCardNumber = $formData['insurance_card_number'] ?? '';
$vaccinationFileIds = $formData['vaccination_file_ids'] ?? [];

// Remove file IDs, AVS, and insurance card from form_data to store separately (encrypted)
unset($formData['vaccination_file_ids']);
unset($formData['avs']);
unset($formData['insurance_card_number']);

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

// Extract patient name for display
$patientName = $formData['full_name'] ?? 'Patient';

// Prepare update with encrypted data
$updateData = [
    'patient_name' => '[encrypted]',
    'patient_name_encrypted' => encryptData($patientName),
    'email' => '[encrypted]',
    'email_encrypted' => encryptData($patientEmail),
    'avs_encrypted' => !empty($patientAvs) ? encryptData($patientAvs) : '',
    'insurance_card_encrypted' => !empty($insuranceCardNumber) ? encryptData($insuranceCardNumber) : '',
    'form_data' => null,
    'form_data_encrypted' => encryptFormData($formData),
    'updated_at' => date('c')
];

// Include vaccination files if provided
if (!empty($vaccinationFileIds)) {
    $updateData['vaccination_files'] = $vaccinationFileIds;
}

// Update form
$updateResponse = pbRequest(
    '/api/collections/patient_forms/records/' . $formRecord['id'],
    'PATCH',
    $updateData,
    $adminToken
);

if (!$updateResponse || isset($updateResponse['code'])) {
    http_response_code(500);
    echo json_encode(['error' => 'Erreur lors de la mise à jour']);
    exit;
}

// Link new vaccination files to this form
if (!empty($vaccinationFileIds)) {
    foreach ($vaccinationFileIds as $fileId) {
        pbRequest(
            '/api/collections/vaccination_files/records/' . $fileId,
            'PATCH',
            ['form_id' => $formRecord['id']],
            $adminToken
        );
    }
}

// Sync updated data to linked patient record
$linkedPatientId = $formRecord['linked_patient'] ?? '';
if (!empty($linkedPatientId)) {
    $patientUpdate = [];

    // Parse name: form uses "Prénom Nom" format
    $nameParts = explode(' ', trim($patientName), 2);
    $prenom = $nameParts[0] ?? '';
    $nom = $nameParts[1] ?? $nameParts[0] ?? '';
    $patientUpdate['nom'] = $nom;
    $patientUpdate['prenom'] = $prenom;

    // DOB
    $dob = $formData['birthdate'] ?? '';
    if (!empty($dob) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $dob)) {
        $patientUpdate['dob'] = $dob;
    }

    // Email & phone
    if ($patientEmail) {
        $patientUpdate['email'] = $patientEmail;
    }
    if (!empty($formData['phone'])) {
        $patientUpdate['telephone'] = $formData['phone'];
    }

    // Address
    $addressParts = [];
    if (!empty($formData['street'])) $addressParts[] = $formData['street'];
    if (!empty($formData['postal_code']) || !empty($formData['city'])) {
        $addressParts[] = trim(($formData['postal_code'] ?? '') . ' ' . ($formData['city'] ?? ''));
    }
    if (!empty($addressParts)) {
        $patientUpdate['adresse'] = implode(', ', $addressParts);
    }

    // Gender
    if (!empty($formData['gender'])) {
        $genderMap = ['homme' => 'm', 'femme' => 'f', 'non_binaire' => 'autre', 'autre' => 'autre'];
        $patientUpdate['sexe'] = $genderMap[$formData['gender']] ?? null;
    }

    // Weight
    if (isset($formData['weight'])) {
        $patientUpdate['poids'] = (float)$formData['weight'];
    }

    // AVS
    if (!empty($patientAvs)) {
        $patientUpdate['avs'] = $patientAvs;
    }

    pbRequest(
        '/api/collections/patients/records/' . $linkedPatientId,
        'PATCH',
        $patientUpdate,
        $adminToken
    );
}

echo json_encode([
    'success' => true,
    'message' => 'Formulaire mis à jour'
]);
