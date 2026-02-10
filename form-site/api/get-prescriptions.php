<?php
/**
 * Get Prescriptions API
 * Returns prescriptions for a patient with decrypted medications
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

// Get consultations for patient to find prescriptions
$consultFilter = urlencode("patient = '{$patientId}'");
$consultations = pbRequest(
    "/api/collections/consultations/records?filter={$consultFilter}&fields=id",
    'GET',
    null,
    $adminToken
);

$prescriptions = [];

if ($consultations && !empty($consultations['items'])) {
    $consultIds = array_map(fn($c) => $c['id'], $consultations['items']);
    $prescFilter = urlencode("consultation IN ('" . implode("','", $consultIds) . "')");

    $response = pbRequest(
        "/api/collections/prescriptions/records?filter={$prescFilter}&sort=-created",
        'GET',
        null,
        $adminToken
    );

    if ($response && !empty($response['items'])) {
        foreach ($response['items'] as $rx) {
            $medications = [];
            if (!empty($rx['medications_encrypted'])) {
                try {
                    $medications = decryptFormData($rx['medications_encrypted']);
                } catch (Exception $e) {
                    error_log('Failed to decrypt prescription: ' . $e->getMessage());
                }
            }

            $prescriptions[] = [
                'id' => $rx['id'],
                'consultation_id' => $rx['consultation'],
                'date' => $rx['date'] ?? '',
                'medications' => $medications
            ];
        }
    }
}

echo json_encode([
    'success' => true,
    'prescriptions' => $prescriptions
]);
