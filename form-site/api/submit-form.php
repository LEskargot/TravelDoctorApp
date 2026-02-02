<?php
/**
 * Submit Form API Endpoint (authenticated via email token)
 * Handles final form submission with vaccination file associations
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
$token = $input['token'] ?? '';
$formData = $input['form_data'] ?? [];
$patientEmail = filter_var($formData['email'] ?? '', FILTER_VALIDATE_EMAIL);
$vaccinationFileIds = $formData['vaccination_file_ids'] ?? [];
$language = $formData['language'] ?? 'fr';

// Remove file IDs from form_data to store separately
unset($formData['vaccination_file_ids']);

if (empty($token) || !preg_match('/^[a-f0-9]{64}$/', $token)) {
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

// First, check if this is an edit token (for updating existing submission)
$filter = urlencode("edit_token = '{$token}'");
$existingForm = pbRequest(
    '/api/collections/patient_forms/records?filter=' . $filter,
    'GET',
    null,
    $adminToken
);

if ($existingForm && !empty($existingForm['items'])) {
    // Update existing form
    $formId = $existingForm['items'][0]['id'];

    // Extract patient name before encryption
    $patientName = $formData['full_name'] ?? 'Patient';

    // Encrypt sensitive data
    $updateData = [
        'patient_name' => '[encrypted]',
        'patient_name_encrypted' => encryptData($patientName),
        'email' => '[encrypted]',
        'email_encrypted' => encryptData($patientEmail),
        'form_data' => null,
        'form_data_encrypted' => encryptFormData($formData),
        'vaccination_files' => $vaccinationFileIds,
        'language' => $language,
        'status' => 'submitted',
        'submitted_at' => date('c')
    ];

    $updateResponse = pbRequest(
        '/api/collections/patient_forms/records/' . $formId,
        'PATCH',
        $updateData,
        $adminToken
    );

    if (!$updateResponse || isset($updateResponse['code'])) {
        http_response_code(500);
        echo json_encode(['error' => 'Erreur lors de la mise à jour']);
        exit;
    }

    // Clean up any associated draft
    cleanupDraft($token, $adminToken);

    // Send confirmation email
    sendConfirmationEmail($patientEmail, $token, $language);

    echo json_encode([
        'success' => true,
        'message' => 'Formulaire mis à jour'
    ]);
    exit;
}

// Check if token is an email access token
$filter = urlencode("token = '{$token}'");
$searchResponse = pbRequest(
    '/api/collections/email_tokens/records?filter=' . $filter,
    'GET',
    null,
    $adminToken
);

if (!$searchResponse || empty($searchResponse['items'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Token invalide']);
    exit;
}

$tokenRecord = $searchResponse['items'][0];

// Check expiry
if (time() > strtotime($tokenRecord['expires_at'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Token expiré']);
    exit;
}

// Check submission count
$submissionCount = intval($tokenRecord['submission_count']);
$maxSubmissions = intval($tokenRecord['max_submissions']);

if ($submissionCount >= $maxSubmissions) {
    http_response_code(400);
    echo json_encode(['error' => 'Nombre maximum de soumissions atteint']);
    exit;
}

// Generate edit token
$editToken = bin2hex(random_bytes(32));

// Extract patient name for display
$patientName = $formData['full_name'] ?? 'Patient';

// Save form to PocketBase with encrypted sensitive data
$formRecord = [
    'token_id' => $tokenRecord['id'],
    'edit_token' => $editToken,
    'patient_name' => '[encrypted]',
    'patient_name_encrypted' => encryptData($patientName),
    'email' => '[encrypted]',
    'email_encrypted' => encryptData($patientEmail),
    'form_data' => null,
    'form_data_encrypted' => encryptFormData($formData),
    'vaccination_files' => $vaccinationFileIds,
    'language' => $language,
    'source' => 'email',
    'status' => 'submitted',
    'submitted_at' => date('c')
];

$createResponse = pbRequest(
    '/api/collections/patient_forms/records',
    'POST',
    $formRecord,
    $adminToken
);

if (!$createResponse || isset($createResponse['code'])) {
    http_response_code(500);
    echo json_encode(['error' => 'Erreur lors de l\'enregistrement']);
    exit;
}

// Increment submission count
pbRequest(
    '/api/collections/email_tokens/records/' . $tokenRecord['id'],
    'PATCH',
    ['submission_count' => $submissionCount + 1],
    $adminToken
);

// Link vaccination files to this form
if (!empty($vaccinationFileIds)) {
    foreach ($vaccinationFileIds as $fileId) {
        pbRequest(
            '/api/collections/vaccination_files/records/' . $fileId,
            'PATCH',
            ['form_id' => $createResponse['id']],
            $adminToken
        );
    }
}

// Clean up draft if exists
cleanupDraftByTokenId($tokenRecord['id'], $adminToken);

// Send confirmation email with edit link
sendConfirmationEmail($patientEmail, $editToken, $language);

// Calculate remaining
$remaining = $maxSubmissions - $submissionCount - 1;

echo json_encode([
    'success' => true,
    'message' => 'Formulaire enregistré',
    'submissions_remaining' => $remaining
]);

/**
 * Send confirmation email in the appropriate language
 */
function sendConfirmationEmail($email, $editToken, $language) {
    $editLink = FORM_URL . '?edit=' . $editToken;

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

/**
 * Clean up draft by edit token
 */
function cleanupDraft($editToken, $adminToken) {
    $filter = urlencode("edit_token = '{$editToken}'");
    $draftResponse = pbRequest(
        '/api/collections/form_drafts/records?filter=' . $filter,
        'GET',
        null,
        $adminToken
    );

    if ($draftResponse && !empty($draftResponse['items'])) {
        pbRequest(
            '/api/collections/form_drafts/records/' . $draftResponse['items'][0]['id'],
            'DELETE',
            null,
            $adminToken
        );
    }
}

/**
 * Clean up draft by token_id
 */
function cleanupDraftByTokenId($tokenId, $adminToken) {
    $filter = urlencode("token_id = '{$tokenId}'");
    $draftResponse = pbRequest(
        '/api/collections/form_drafts/records?filter=' . $filter,
        'GET',
        null,
        $adminToken
    );

    if ($draftResponse && !empty($draftResponse['items'])) {
        pbRequest(
            '/api/collections/form_drafts/records/' . $draftResponse['items'][0]['id'],
            'DELETE',
            null,
            $adminToken
        );
    }
}
