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
$vaccinationFileIds = $formData['vaccination_file_ids'] ?? [];
$language = $formData['language'] ?? 'fr';

// Remove file IDs from form_data to store separately
unset($formData['vaccination_file_ids']);

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
$clientIP = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
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

// Authenticate with PocketBase
$adminToken = pbAdminAuth();
if (!$adminToken) {
    http_response_code(500);
    echo json_encode(['error' => 'Erreur de connexion à la base de données']);
    exit;
}

// Generate edit token
$editToken = bin2hex(random_bytes(32));

// Extract patient name for display
$patientName = $formData['full_name'] ?? 'Patient';

// Save form to PocketBase with encrypted sensitive data
$formRecord = [
    'edit_token' => $editToken,
    'patient_name' => '[encrypted]',
    'patient_name_encrypted' => encryptData($patientName),
    'email' => '[encrypted]',
    'email_encrypted' => encryptData($patientEmail),
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

// Increment rate limit counter
incrementRateLimit($clientIP);

// Send confirmation email with edit link
sendPublicConfirmationEmail($patientEmail, $editToken, $language);

echo json_encode([
    'success' => true,
    'message' => 'Formulaire enregistré'
]);

/**
 * Send confirmation email in the appropriate language
 */
function sendPublicConfirmationEmail($email, $editToken, $language) {
    $editLink = FORM_URL . '/public.html?edit=' . $editToken;

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
