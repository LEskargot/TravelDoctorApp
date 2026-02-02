<?php
/**
 * Get Draft API Endpoint
 * Retrieves saved form draft by edit token
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

// Search for draft by edit_token
$filter = urlencode("edit_token = '{$token}'");
$draftResponse = pbRequest(
    '/api/collections/form_drafts/records?filter=' . $filter,
    'GET',
    null,
    $adminToken
);

if (!$draftResponse || empty($draftResponse['items'])) {
    http_response_code(404);
    echo json_encode(['error' => 'Brouillon non trouvé']);
    exit;
}

$draft = $draftResponse['items'][0];

// Check if draft has expired
if (isset($draft['expires_at']) && time() > strtotime($draft['expires_at'])) {
    // Delete expired draft
    pbRequest(
        '/api/collections/form_drafts/records/' . $draft['id'],
        'DELETE',
        null,
        $adminToken
    );

    http_response_code(410);
    echo json_encode(['error' => 'Ce brouillon a expiré']);
    exit;
}

// Decrypt form data
$formData = [];
if (!empty($draft['form_data_encrypted'])) {
    $formData = decryptFormData($draft['form_data_encrypted']);
} elseif (!empty($draft['form_data'])) {
    // Fallback for legacy unencrypted data
    $formData = $draft['form_data'];
}

// Decrypt email
$email = '';
if (!empty($draft['email_encrypted'])) {
    $email = decryptData($draft['email_encrypted']);
} elseif (!empty($draft['email']) && $draft['email'] !== '[encrypted]') {
    // Fallback for legacy unencrypted data
    $email = $draft['email'];
}

// Return decrypted draft data
echo json_encode([
    'success' => true,
    'form_data' => $formData,
    'step_reached' => $draft['step_reached'] ?? 1,
    'language' => $draft['language'] ?? 'fr',
    'email' => $email,
    'created' => $draft['created'] ?? null,
    'updated' => $draft['updated'] ?? null
]);
