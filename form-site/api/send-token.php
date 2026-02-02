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
$email = filter_var($input['email'] ?? '', FILTER_VALIDATE_EMAIL);
$maxSubmissions = intval($input['max_submissions'] ?? 1);

if (!$email) {
    http_response_code(400);
    echo json_encode(['error' => 'Email invalide']);
    exit;
}

if ($maxSubmissions < 1 || $maxSubmissions > 10) {
    $maxSubmissions = 1;
}

// Generate secure token
$token = bin2hex(random_bytes(32));
$expiresAt = date('Y-m-d H:i:s', strtotime('+' . TOKEN_EXPIRY_HOURS . ' hours'));

// Authenticate with PocketBase
$adminToken = pbAdminAuth();
if (!$adminToken) {
    http_response_code(500);
    echo json_encode(['error' => 'Erreur de connexion à la base de données']);
    exit;
}

// Store token in PocketBase
$tokenData = [
    'email' => $email,
    'token' => $token,
    'expires_at' => $expiresAt,
    'max_submissions' => $maxSubmissions,
    'submission_count' => 0
];

$createResponse = pbRequest(
    '/api/collections/email_tokens/records',
    'POST',
    $tokenData,
    $adminToken
);

if (!$createResponse || isset($createResponse['code'])) {
    http_response_code(500);
    echo json_encode(['error' => 'Erreur lors de la création du token']);
    exit;
}

// Send email
$verificationLink = FORM_URL . '?token=' . $token;
$emailBody = "Bonjour,\r\n\r\n";
$emailBody .= "Cliquez sur le lien ci-dessous pour accéder au formulaire patient:\r\n\r\n";
$emailBody .= $verificationLink . "\r\n\r\n";
$emailBody .= "Ce lien permet " . $maxSubmissions . " inscription(s) et expire dans " . TOKEN_EXPIRY_HOURS . " heures.\r\n";
if ($maxSubmissions > 1) {
    $emailBody .= "Vous pouvez partager ce lien avec les autres voyageurs de votre groupe.\r\n";
}
$emailBody .= "\r\nTravel Doctor\r\n";

$emailSent = smtpMail(
    $email,
    'Travel Doctor - Accès au formulaire patient',
    $emailBody
);

if (!$emailSent) {
    http_response_code(500);
    echo json_encode(['error' => "Erreur lors de l'envoi de l'email"]);
    exit;
}

echo json_encode(['success' => true, 'message' => 'Email envoyé']);
