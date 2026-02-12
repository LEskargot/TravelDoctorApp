<?php
/**
 * Update Form API Endpoint
 * Updates a form using the edit token.
 * Handles two cases:
 *   1. Draft → Submitted: upgrades status, creates patient + case, sends confirmation email
 *   2. Already submitted → Re-edit: updates data, syncs to linked patient
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
$language = $formData['language'] ?? 'fr';

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
$wasDraft = ($formRecord['status'] === 'draft');

// Preserve onedoc_* fields from existing form data (they're not in collectFormData())
if (!empty($formRecord['form_data_encrypted'])) {
    $existingFormData = decryptFormData($formRecord['form_data_encrypted']);
    $onedocFields = ['onedoc_appointment', 'onedoc_location', 'onedoc_consultation', 'onedoc_notes'];
    foreach ($onedocFields as $field) {
        if (!empty($existingFormData[$field]) && empty($formData[$field])) {
            $formData[$field] = $existingFormData[$field];
        }
    }
}

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

// Draft → Submitted: upgrade status
if ($wasDraft) {
    $updateData['status'] = 'submitted';
    $updateData['submitted_at'] = date('c');
}

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

// ==================== Draft → Submitted: create patient + case ====================
if ($wasDraft) {
    $patientId = findOrCreatePatient($adminToken, $patientName, $patientEmail, $patientAvs, $formData);

    if ($patientId) {
        // Link patient to form
        pbRequest(
            "/api/collections/patient_forms/records/{$formRecord['id']}",
            'PATCH',
            ['linked_patient' => $patientId],
            $adminToken
        );

        // Create case linked to patient and form
        pbRequest(
            '/api/collections/cases/records',
            'POST',
            [
                'patient' => $patientId,
                'patient_form' => $formRecord['id'],
                'status' => 'ouvert',
                'opened_at' => date('c'),
                'type' => 'conseil_voyage'
            ],
            $adminToken
        );
    }

    // Send confirmation email with edit link
    sendConfirmationEmail($patientEmail, $editToken, $language);
}

// ==================== Already submitted: sync patient data ====================
if (!$wasDraft) {
    $linkedPatientId = $formRecord['linked_patient'] ?? '';
    if (!empty($linkedPatientId)) {
        $patientUpdate = buildPatientUpdate($patientName, $patientEmail, $patientAvs, $formData);
        pbRequest(
            '/api/collections/patients/records/' . $linkedPatientId,
            'PATCH',
            $patientUpdate,
            $adminToken
        );
    }
}

echo json_encode([
    'success' => true,
    'message' => $wasDraft ? 'Formulaire enregistré' : 'Formulaire mis à jour'
]);

// ==================== Helper functions ====================

/**
 * Find existing patient or create a new one.
 * Matches by AVS first, then DOB + name.
 */
function findOrCreatePatient($adminToken, $patientName, $email, $avs, $formData) {
    $nameParts = explode(' ', trim($patientName), 2);
    $prenom = $nameParts[0] ?? '';
    $nom = $nameParts[1] ?? $nameParts[0] ?? '';

    $dobRaw = $formData['birthdate'] ?? '';
    $dob = $dobRaw ? date('Y-m-d', strtotime($dobRaw)) : '';

    // 1. Try AVS match
    if (!empty($avs)) {
        $avs = sanitizePbFilterValue($avs);
        $avsFilter = urlencode("avs = '{$avs}'");
        $search = pbRequest(
            "/api/collections/patients/records?filter={$avsFilter}&perPage=1",
            'GET',
            null,
            $adminToken
        );
        if ($search && !empty($search['items'])) {
            return $search['items'][0]['id'];
        }
    }

    // 2. Try DOB + name match
    if (!empty($dob) && !empty($patientName)) {
        $dob = sanitizePbFilterValue($dob);
        $dobFilter = urlencode("dob = '{$dob}'");
        $search = pbRequest(
            "/api/collections/patients/records?filter={$dobFilter}&perPage=50",
            'GET',
            null,
            $adminToken
        );
        if ($search && !empty($search['items'])) {
            foreach ($search['items'] as $patient) {
                $prenomMatch = normalizedContains($patient['prenom'], $prenom) ||
                               normalizedContains($prenom, $patient['prenom']);
                $nomMatch = normalizedContains($patient['nom'], $nom) ||
                            normalizedContains($nom, $patient['nom']);
                if ($prenomMatch && $nomMatch) {
                    return $patient['id'];
                }
            }
        }
    }

    // 3. No match — create new patient
    $patientData = buildPatientUpdate($patientName, $email, $avs, $formData);
    $patientData['dob'] = $dob;

    $newPatient = pbRequest(
        '/api/collections/patients/records',
        'POST',
        $patientData,
        $adminToken
    );

    if ($newPatient && !isset($newPatient['code'])) {
        return $newPatient['id'];
    }

    error_log('Failed to create patient: ' . json_encode($newPatient));
    return null;
}

/**
 * Build patient field array from form data
 */
function buildPatientUpdate($patientName, $email, $avs, $formData) {
    $nameParts = explode(' ', trim($patientName), 2);
    $prenom = $nameParts[0] ?? '';
    $nom = $nameParts[1] ?? $nameParts[0] ?? '';

    $update = [
        'nom' => $nom,
        'prenom' => $prenom,
    ];

    $dob = $formData['birthdate'] ?? '';
    if (!empty($dob) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $dob)) {
        $update['dob'] = $dob;
    }

    if ($email) {
        $update['email'] = $email;
    }
    if (!empty($formData['phone'])) {
        $update['telephone'] = $formData['phone'];
    }

    // Address
    $addressParts = [];
    if (!empty($formData['street'])) $addressParts[] = $formData['street'];
    if (!empty($formData['postal_code']) || !empty($formData['city'])) {
        $addressParts[] = trim(($formData['postal_code'] ?? '') . ' ' . ($formData['city'] ?? ''));
    }
    if (!empty($addressParts)) {
        $update['adresse'] = implode(', ', $addressParts);
    }

    // Gender
    if (!empty($formData['gender'])) {
        $genderMap = ['homme' => 'm', 'femme' => 'f', 'non_binaire' => 'autre', 'autre' => 'autre'];
        $update['sexe'] = $genderMap[$formData['gender']] ?? null;
    }

    // Weight
    if (isset($formData['weight'])) {
        $update['poids'] = (float)$formData['weight'];
    }

    // AVS
    if (!empty($avs)) {
        $update['avs'] = $avs;
    }

    return $update;
}

/**
 * Send confirmation email with edit link
 */
function sendConfirmationEmail($email, $editToken, $language) {
    $editLink = FORM_URL . '/?edit=' . $editToken;

    $subjects = [
        'fr' => 'Travel Doctor - Confirmation de votre formulaire',
        'en' => 'Travel Doctor - Form Confirmation',
        'it' => 'Travel Doctor - Conferma del modulo',
        'es' => 'Travel Doctor - Confirmación del formulario'
    ];

    $messages = [
        'fr' => "Bonjour,\r\n\r\nVotre formulaire patient a été enregistré avec succès.\r\n\r\nSi vous souhaitez modifier vos informations, utilisez ce lien:\r\n{$editLink}\r\n\r\nTravel Doctor",
        'en' => "Hello,\r\n\r\nYour patient form has been successfully submitted.\r\n\r\nIf you wish to modify your information, use this link:\r\n{$editLink}\r\n\r\nTravel Doctor",
        'it' => "Buongiorno,\r\n\r\nIl suo modulo paziente è stato registrato con successo.\r\n\r\nSe desidera modificare le sue informazioni, utilizzi questo link:\r\n{$editLink}\r\n\r\nTravel Doctor",
        'es' => "Hola,\r\n\r\nSu formulario de paciente ha sido registrado con éxito.\r\n\r\nSi desea modificar su información, utilice este enlace:\r\n{$editLink}\r\n\r\nTravel Doctor"
    ];

    $subject = $subjects[$language] ?? $subjects['fr'];
    $message = $messages[$language] ?? $messages['fr'];

    smtpMail($email, $subject, $message);
}
