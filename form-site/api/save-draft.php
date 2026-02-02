<?php
/**
 * Save Draft API Endpoint
 * Saves partial form data with 48h expiration
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
$stepReached = intval($input['step_reached'] ?? 1);
$formData = $input['form_data'] ?? [];
$language = $input['language'] ?? 'fr';

// Validate token format (either access token or edit token)
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

// Check if this is an existing draft (edit token)
$filter = urlencode("edit_token = '{$token}'");
$existingDraft = pbRequest(
    '/api/collections/form_drafts/records?filter=' . $filter,
    'GET',
    null,
    $adminToken
);

if ($existingDraft && !empty($existingDraft['items'])) {
    // Update existing draft with encrypted data
    $draftId = $existingDraft['items'][0]['id'];

    $updateData = [
        'step_reached' => $stepReached,
        'form_data' => null,
        'form_data_encrypted' => encryptFormData($formData),
        'language' => $language,
        'updated' => date('c')
    ];

    $response = pbRequest(
        '/api/collections/form_drafts/records/' . $draftId,
        'PATCH',
        $updateData,
        $adminToken
    );

    if ($response && !isset($response['code'])) {
        echo json_encode([
            'success' => true,
            'message' => 'Brouillon mis à jour',
            'edit_token' => $token
        ]);
        exit;
    }
}

// Check if token is an email access token
$filter = urlencode("token = '{$token}'");
$tokenRecord = pbRequest(
    '/api/collections/email_tokens/records?filter=' . $filter,
    'GET',
    null,
    $adminToken
);

if (!$tokenRecord || empty($tokenRecord['items'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Token non reconnu']);
    exit;
}

$emailToken = $tokenRecord['items'][0];

// Check if draft already exists for this email token
$filter = urlencode("token_id = '{$emailToken['id']}'");
$existingForToken = pbRequest(
    '/api/collections/form_drafts/records?filter=' . $filter,
    'GET',
    null,
    $adminToken
);

if ($existingForToken && !empty($existingForToken['items'])) {
    // Update existing draft with encrypted data
    $draftId = $existingForToken['items'][0]['id'];

    $updateData = [
        'step_reached' => $stepReached,
        'form_data' => null,
        'form_data_encrypted' => encryptFormData($formData),
        'language' => $language,
        'updated' => date('c')
    ];

    $response = pbRequest(
        '/api/collections/form_drafts/records/' . $draftId,
        'PATCH',
        $updateData,
        $adminToken
    );

    if ($response && !isset($response['code'])) {
        echo json_encode([
            'success' => true,
            'message' => 'Brouillon mis à jour',
            'edit_token' => $existingForToken['items'][0]['edit_token']
        ]);
        exit;
    }
} else {
    // Create new draft with encrypted data
    $editToken = bin2hex(random_bytes(32));
    $expiresAt = date('c', strtotime('+48 hours'));
    $email = $emailToken['email'] ?? '';

    $draftData = [
        'token_id' => $emailToken['id'],
        'edit_token' => $editToken,
        'email' => '[encrypted]',
        'email_encrypted' => encryptData($email),
        'step_reached' => $stepReached,
        'form_data' => null,
        'form_data_encrypted' => encryptFormData($formData),
        'language' => $language,
        'expires_at' => $expiresAt
    ];

    $response = pbRequest(
        '/api/collections/form_drafts/records',
        'POST',
        $draftData,
        $adminToken
    );

    if ($response && !isset($response['code'])) {
        echo json_encode([
            'success' => true,
            'message' => 'Brouillon créé',
            'edit_token' => $editToken
        ]);
        exit;
    }
}

http_response_code(500);
echo json_encode(['error' => 'Erreur lors de la sauvegarde du brouillon']);
