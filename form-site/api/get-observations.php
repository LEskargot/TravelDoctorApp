<?php
/**
 * Get Observations API
 * Returns decrypted observations for a patient
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

$patientId = $_GET['patient_id'] ?? '';

if (empty($patientId)) {
    http_response_code(400);
    echo json_encode(['error' => 'ID du patient requis']);
    exit;
}

validatePbId($patientId, 'patient_id');

$adminToken = pbAdminAuth();
if (!$adminToken) {
    http_response_code(500);
    echo json_encode(['error' => 'Erreur de connexion à la base de données']);
    exit;
}

$filter = urlencode("patient = '{$patientId}'");
$response = pbRequest(
    "/api/collections/observations/records?filter={$filter}&sort=-date",
    'GET',
    null,
    $adminToken
);

$observations = [];
if ($response && !empty($response['items'])) {
    foreach ($response['items'] as $obs) {
        $value = null;
        if (!empty($obs['value_encrypted'])) {
            try {
                $value = decryptData($obs['value_encrypted']);
            } catch (Exception $e) {
                error_log('Failed to decrypt observation: ' . $e->getMessage());
            }
        }

        $observations[] = [
            'id' => $obs['id'],
            'type' => $obs['type'] ?? '',
            'value' => $value,
            'unit' => $obs['unit'] ?? '',
            'date' => $obs['date'] ?? '',
            'consultation' => $obs['consultation'] ?? null
        ];
    }
}

echo json_encode([
    'success' => true,
    'observations' => $observations
]);
