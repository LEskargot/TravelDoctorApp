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
$token = $input['token'] ?? '';

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

// Find token in PocketBase
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
$expiresAt = strtotime($tokenRecord['expires_at']);
if (time() > $expiresAt) {
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

echo json_encode([
    'success' => true,
    'email' => $tokenRecord['email'],
    'token_id' => $tokenRecord['id'],
    'submissions_remaining' => $maxSubmissions - $submissionCount,
    'max_submissions' => $maxSubmissions
]);
