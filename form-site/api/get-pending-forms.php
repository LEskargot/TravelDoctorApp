<?php
/**
 * Get Pending Forms API
 * Returns list of submitted forms awaiting processing
 * Decrypts patient name and basic info for display
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

// Authenticate with PocketBase
$adminToken = pbAdminAuth();
if (!$adminToken) {
    http_response_code(500);
    echo json_encode(['error' => 'Erreur de connexion à la base de données']);
    exit;
}

// Get query parameters
$search = $_GET['search'] ?? '';
$page = max(1, intval($_GET['page'] ?? 1));
$perPage = min(50, max(10, intval($_GET['perPage'] ?? 20)));

// Fetch submitted forms (not yet processed)
$filter = urlencode("status = 'submitted'");
$response = pbRequest(
    "/api/collections/patient_forms/records?filter={$filter}&sort=-submitted_at&page={$page}&perPage={$perPage}",
    'GET',
    null,
    $adminToken
);

if (!$response || isset($response['code'])) {
    http_response_code(500);
    echo json_encode(['error' => 'Erreur lors de la récupération des formulaires']);
    exit;
}

$forms = [];

foreach ($response['items'] as $item) {
    // Decrypt patient name
    $patientName = '';
    if (!empty($item['patient_name_encrypted'])) {
        $patientName = decryptData($item['patient_name_encrypted']);
    }

    // Decrypt form data to get DOB and destination
    $formData = [];
    $birthdate = '';
    $destination = '';
    $avs = '';

    if (!empty($item['form_data_encrypted'])) {
        $formData = decryptFormData($item['form_data_encrypted']);
        $birthdate = $formData['birthdate'] ?? '';

        // Get first destination country
        if (!empty($formData['destinations']) && is_array($formData['destinations'])) {
            $destination = $formData['destinations'][0]['country'] ?? '';
        }
    }

    // Decrypt AVS if present
    if (!empty($item['avs_encrypted'])) {
        $avs = decryptData($item['avs_encrypted']);
    }

    // Check if patient exists in patients collection
    $isKnownPatient = false;
    $existingPatientId = null;

    // First try to match by AVS
    if (!empty($avs)) {
        $avsFilter = urlencode("avs = '{$avs}'");
        $patientSearch = pbRequest(
            "/api/collections/patients/records?filter={$avsFilter}&perPage=1",
            'GET',
            null,
            $adminToken
        );

        if ($patientSearch && !empty($patientSearch['items'])) {
            $isKnownPatient = true;
            $existingPatientId = $patientSearch['items'][0]['id'];
        }
    }

    // If no AVS match, try DOB + name with normalization
    if (!$isKnownPatient && !empty($birthdate) && !empty($patientName)) {
        // Parse name (assumes "Prénom Nom" format)
        $nameParts = explode(' ', trim($patientName), 2);
        $prenomForm = $nameParts[0] ?? '';
        $nomForm = $nameParts[1] ?? $nameParts[0] ?? '';

        // Format birthdate for PocketBase (expects ISO format)
        $dobFormatted = date('Y-m-d', strtotime($birthdate));

        // Fetch all patients with same DOB, then compare names with normalization
        $dobFilter = urlencode("dob = '{$dobFormatted}'");
        $patientSearch = pbRequest(
            "/api/collections/patients/records?filter={$dobFilter}&perPage=50",
            'GET',
            null,
            $adminToken
        );

        if ($patientSearch && !empty($patientSearch['items'])) {
            foreach ($patientSearch['items'] as $patient) {
                // Compare with accent/case normalization
                $prenomMatch = normalizedContains($patient['prenom'], $prenomForm) ||
                               normalizedContains($prenomForm, $patient['prenom']);
                $nomMatch = normalizedContains($patient['nom'], $nomForm) ||
                            normalizedContains($nomForm, $patient['nom']);

                if ($prenomMatch && $nomMatch) {
                    $isKnownPatient = true;
                    $existingPatientId = $patient['id'];
                    break;
                }
            }
        }
    }

    // Apply search filter (client-side for encrypted data)
    if (!empty($search)) {
        $searchLower = strtolower($search);
        $nameMatch = strpos(strtolower($patientName), $searchLower) !== false;
        $dobMatch = strpos($birthdate, $search) !== false;
        $avsMatch = strpos($avs, $search) !== false;

        if (!$nameMatch && !$dobMatch && !$avsMatch) {
            continue; // Skip this form if no match
        }
    }

    $forms[] = [
        'id' => $item['id'],
        'patient_name' => $patientName,
        'birthdate' => $birthdate,
        'destination' => $destination,
        'avs' => $avs ? substr($avs, 0, 8) . '...' : '', // Partial AVS for display
        'submitted_at' => $item['submitted_at'],
        'source' => $item['source'],
        'is_known_patient' => $isKnownPatient,
        'existing_patient_id' => $existingPatientId
    ];
}

echo json_encode([
    'success' => true,
    'forms' => $forms,
    'total' => $response['totalItems'],
    'page' => $response['page'],
    'totalPages' => $response['totalPages']
]);
