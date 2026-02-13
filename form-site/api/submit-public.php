<?php
/**
 * Submit Public Form API Endpoint (with hCaptcha)
 * Handles public form submissions with spam protection
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
$captchaToken = $input['captcha_token'] ?? '';
$formData = $input['form_data'] ?? [];
$patientEmail = filter_var($formData['email'] ?? '', FILTER_VALIDATE_EMAIL);
$patientAvs = $formData['avs'] ?? '';
$insuranceCardNumber = $formData['insurance_card_number'] ?? '';
$vaccinationFileIds = $formData['vaccination_file_ids'] ?? [];
$language = in_array($formData['language'] ?? '', ['fr', 'en', 'it', 'es'], true)
    ? $formData['language'] : 'fr';

// Validate vaccination file IDs
if (!empty($vaccinationFileIds)) {
    $vaccinationFileIds = array_filter($vaccinationFileIds, function($id) {
        return preg_match('/^[a-z0-9]{15}$/', $id);
    });
}

// Remove file IDs, AVS, and insurance card from form_data to store separately (encrypted)
unset($formData['vaccination_file_ids']);
unset($formData['avs']);
unset($formData['insurance_card_number']);

// Verify CAPTCHA
if (empty($captchaToken)) {
    http_response_code(400);
    echo json_encode(['error' => getCaptchaError($language)]);
    exit;
}

$captchaValid = verifyCaptcha($captchaToken);
if (!$captchaValid) {
    http_response_code(400);
    echo json_encode(['error' => getCaptchaInvalidError($language)]);
    exit;
}

// Check rate limit
$clientIP = $_SERVER['HTTP_X_REAL_IP'] ?? $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? 'unknown';
if (str_contains($clientIP, ',')) $clientIP = trim(explode(',', $clientIP)[0]);
if (!checkRateLimit($clientIP)) {
    http_response_code(429);
    echo json_encode(['error' => getRateLimitError($language)]);
    exit;
}

if (!$patientEmail) {
    http_response_code(400);
    echo json_encode(['error' => getEmailError($language)]);
    exit;
}

// Validate AVS format (digits, dots, spaces only) if provided
if (!empty($patientAvs) && !preg_match('/^[\d.\s]+$/', $patientAvs)) {
    http_response_code(400);
    echo json_encode(['error' => 'Format AVS invalide']);
    exit;
}

// Validate birthdate format if provided
$birthdate = $formData['birthdate'] ?? '';
if (!empty($birthdate) && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $birthdate)) {
    http_response_code(400);
    echo json_encode(['error' => 'Format de date de naissance invalide']);
    exit;
}

// Authenticate with PocketBase
$adminToken = pbAdminAuth();
if (!$adminToken) {
    http_response_code(500);
    echo json_encode(['error' => 'Erreur de connexion à la base de données']);
    exit;
}

// Extract patient name for display
$patientName = $formData['full_name'] ?? 'Patient';

// Check if a matching OneDOC draft exists — merge instead of create+cancel
$existingDraft = findMatchingOnedocDraft($adminToken, $patientEmail);
$mergedWithDraft = false;

if ($existingDraft) {
    // Preserve onedoc_* fields from draft
    $draftFormData = [];
    if (!empty($existingDraft['form_data_encrypted'])) {
        $draftFormData = decryptFormData($existingDraft['form_data_encrypted']);
    }
    $onedocFields = ['onedoc_appointment', 'onedoc_location', 'onedoc_consultation', 'onedoc_notes'];
    foreach ($onedocFields as $field) {
        if (!empty($draftFormData[$field]) && empty($formData[$field])) {
            $formData[$field] = $draftFormData[$field];
        }
    }

    // Update the existing draft in-place
    $updateData = [
        'patient_name' => '[encrypted]',
        'patient_name_encrypted' => encryptData($patientName),
        'email' => '[encrypted]',
        'email_encrypted' => encryptData($patientEmail),
        'avs_encrypted' => !empty($patientAvs) ? encryptData($patientAvs) : '',
        'insurance_card_encrypted' => !empty($insuranceCardNumber) ? encryptData($insuranceCardNumber) : '',
        'form_data' => null,
        'form_data_encrypted' => encryptFormData($formData),
        'status' => 'submitted',
        'submitted_at' => date('c')
    ];
    if (!empty($vaccinationFileIds)) {
        $updateData['vaccination_files'] = $vaccinationFileIds;
    }

    $createResponse = pbRequest(
        '/api/collections/patient_forms/records/' . $existingDraft['id'],
        'PATCH',
        $updateData,
        $adminToken
    );

    if (!$createResponse || isset($createResponse['code'])) {
        http_response_code(500);
        echo json_encode(['error' => 'Erreur lors de l\'enregistrement']);
        exit;
    }

    $formRecordId = $existingDraft['id'];
    $editToken = $existingDraft['edit_token'];
    $mergedWithDraft = true;
} else {
    // No matching draft — create new form
    $editToken = bin2hex(random_bytes(32));

    $formRecord = [
        'edit_token' => $editToken,
        'patient_name' => '[encrypted]',
        'patient_name_encrypted' => encryptData($patientName),
        'email' => '[encrypted]',
        'email_encrypted' => encryptData($patientEmail),
        'avs_encrypted' => !empty($patientAvs) ? encryptData($patientAvs) : '',
        'insurance_card_encrypted' => !empty($insuranceCardNumber) ? encryptData($insuranceCardNumber) : '',
        'form_data' => null,
        'form_data_encrypted' => encryptFormData($formData),
        'vaccination_files' => $vaccinationFileIds,
        'language' => $language,
        'source' => 'public',
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

    $formRecordId = $createResponse['id'];
}

// Link vaccination files to this form
if (!empty($vaccinationFileIds)) {
    foreach ($vaccinationFileIds as $fileId) {
        pbRequest(
            '/api/collections/vaccination_files/records/' . $fileId,
            'PATCH',
            ['form_id' => $formRecordId],
            $adminToken
        );
    }
}

// Find or create patient record
$patientId = findOrCreatePatient($adminToken, $patientName, $patientEmail, $patientAvs, $formData);

// Link patient to form
if ($patientId) {
    pbRequest(
        "/api/collections/patient_forms/records/{$formRecordId}",
        'PATCH',
        ['linked_patient' => $patientId],
        $adminToken
    );

    // Create case linked to patient and form (only if no case already exists from draft)
    $caseFilter = urlencode("patient_form = '{$formRecordId}'");
    $existingCase = pbRequest(
        "/api/collections/cases/records?filter={$caseFilter}&perPage=1",
        'GET',
        null,
        $adminToken
    );
    if (!$existingCase || empty($existingCase['items'])) {
        pbRequest(
            '/api/collections/cases/records',
            'POST',
            [
                'patient' => $patientId,
                'patient_form' => $formRecordId,
                'status' => 'ouvert',
                'opened_at' => date('c'),
                'type' => 'conseil_voyage'
            ],
            $adminToken
        );
    }
}

// Cancel other stale drafts only if we didn't merge
if (!$mergedWithDraft) {
    cancelStaleDrafts($adminToken, $patientEmail, $formRecordId);
}

// Increment rate limit counter
incrementRateLimit($clientIP);

// Send confirmation email with edit link
sendPublicConfirmationEmail($patientEmail, $editToken, $language);

echo json_encode([
    'success' => true,
    'message' => 'Formulaire enregistré'
]);

/**
 * Cancel stale draft forms for the same email.
 * When a patient submits directly (not via edit link), any existing OneDOC draft
 * for the same email becomes stale and should be cancelled to avoid confusion.
 */
function cancelStaleDrafts($adminToken, $email, $excludeFormId) {
    if (empty($email)) return;

    // Find draft forms with matching encrypted email
    $filter = urlencode("status = 'draft' && id != '{$excludeFormId}'");
    $drafts = pbRequest(
        "/api/collections/patient_forms/records?filter={$filter}&perPage=50",
        'GET',
        null,
        $adminToken
    );

    if (!$drafts || empty($drafts['items'])) return;

    foreach ($drafts['items'] as $draft) {
        // Decrypt email to compare
        $draftEmail = '';
        if (!empty($draft['email_encrypted'])) {
            $draftEmail = decryptData($draft['email_encrypted']);
        }

        if (strtolower(trim($draftEmail)) === strtolower(trim($email))) {
            pbRequest(
                '/api/collections/patient_forms/records/' . $draft['id'],
                'PATCH',
                ['status' => 'cancelled'],
                $adminToken
            );
        }
    }
}

/**
 * Find a matching OneDOC draft for this email.
 * Returns the draft record or null if none found.
 */
function findMatchingOnedocDraft($adminToken, $email) {
    if (empty($email)) return null;

    $filter = urlencode("source = 'onedoc' && status = 'draft'");
    $drafts = pbRequest(
        "/api/collections/patient_forms/records?filter={$filter}&sort=-created&perPage=50",
        'GET',
        null,
        $adminToken
    );

    if (!$drafts || empty($drafts['items'])) return null;

    foreach ($drafts['items'] as $draft) {
        $draftEmail = '';
        if (!empty($draft['email_encrypted'])) {
            $draftEmail = decryptData($draft['email_encrypted']);
        }
        if (strtolower(trim($draftEmail)) === strtolower(trim($email))) {
            return $draft;
        }
    }

    return null;
}

/**
 * Find existing patient or create a new one.
 * Matches by AVS first, then DOB + name.
 */
function findOrCreatePatient($adminToken, $patientName, $email, $avs, $formData) {
    // Parse name: form uses "Prénom Nom" format
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
    $patientData = [
        'nom' => $nom,
        'prenom' => $prenom,
        'dob' => $dob,
        'email' => $email ?: null,
        'telephone' => $formData['phone'] ?? null,
        'poids' => isset($formData['weight']) ? (float)$formData['weight'] : null,
        'avs' => $avs ?: null
    ];

    // Build address
    $addressParts = [];
    if (!empty($formData['street'])) $addressParts[] = $formData['street'];
    if (!empty($formData['postal_code']) || !empty($formData['city'])) {
        $addressParts[] = trim(($formData['postal_code'] ?? '') . ' ' . ($formData['city'] ?? ''));
    }
    if (!empty($addressParts)) {
        $patientData['adresse'] = implode(', ', $addressParts);
    }

    // Set sex
    if (!empty($formData['gender'])) {
        $genderMap = ['homme' => 'm', 'femme' => 'f', 'non_binaire' => 'autre', 'autre' => 'autre'];
        $patientData['sexe'] = $genderMap[$formData['gender']] ?? null;
    }

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
 * Send confirmation email in the appropriate language
 */
function sendPublicConfirmationEmail($email, $editToken, $language) {
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

/**
 * Get localized error messages
 */
function getCaptchaError($language) {
    $messages = [
        'fr' => 'Veuillez compléter le CAPTCHA',
        'en' => 'Please complete the CAPTCHA',
        'it' => 'Si prega di completare il CAPTCHA',
        'es' => 'Por favor complete el CAPTCHA'
    ];
    return $messages[$language] ?? $messages['fr'];
}

function getCaptchaInvalidError($language) {
    $messages = [
        'fr' => 'CAPTCHA invalide',
        'en' => 'Invalid CAPTCHA',
        'it' => 'CAPTCHA non valido',
        'es' => 'CAPTCHA inválido'
    ];
    return $messages[$language] ?? $messages['fr'];
}

function getRateLimitError($language) {
    $messages = [
        'fr' => 'Trop de soumissions. Veuillez réessayer plus tard.',
        'en' => 'Too many submissions. Please try again later.',
        'it' => 'Troppe richieste. Riprova più tardi.',
        'es' => 'Demasiados envíos. Inténtelo de nuevo más tarde.'
    ];
    return $messages[$language] ?? $messages['fr'];
}

function getEmailError($language) {
    $messages = [
        'fr' => 'Email du patient invalide',
        'en' => 'Invalid patient email',
        'it' => 'Email del paziente non valida',
        'es' => 'Email del paciente inválido'
    ];
    return $messages[$language] ?? $messages['fr'];
}

// Helper: Verify hCaptcha
function verifyCaptcha($token) {
    $data = [
        'secret' => HCAPTCHA_SECRET_KEY,
        'response' => $token
    ];

    $ch = curl_init('https://hcaptcha.com/siteverify');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($data));

    $response = curl_exec($ch);
    curl_close($ch);

    $result = json_decode($response, true);
    return isset($result['success']) && $result['success'] === true;
}

// Helper: Check rate limit (simple file-based)
function checkRateLimit($ip) {
    $file = sys_get_temp_dir() . '/rate_limit_' . md5($ip) . '.json';

    if (!file_exists($file)) {
        return true;
    }

    $data = json_decode(file_get_contents($file), true);

    // Reset if window expired
    if (time() - $data['timestamp'] > RATE_LIMIT_WINDOW) {
        return true;
    }

    return $data['count'] < RATE_LIMIT_MAX;
}

// Helper: Increment rate limit counter
function incrementRateLimit($ip) {
    $file = sys_get_temp_dir() . '/rate_limit_' . md5($ip) . '.json';

    $data = ['count' => 0, 'timestamp' => time()];

    if (file_exists($file)) {
        $existing = json_decode(file_get_contents($file), true);

        // Reset if window expired
        if (time() - $existing['timestamp'] <= RATE_LIMIT_WINDOW) {
            $data = $existing;
        }
    }

    $data['count']++;
    file_put_contents($file, json_encode($data));
}
