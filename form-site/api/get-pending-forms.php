<?php
/**
 * Get Pending Forms API
 * Returns list of forms awaiting processing:
 * - Submitted forms (patient has filled in the form)
 * - OneDoc draft forms (patient has appointment but hasn't filled form yet)
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

$authUser = requireAuth();

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

// Fetch submitted forms + onedoc drafts (not yet processed)
$filter = urlencode("status = 'submitted' || (source = 'onedoc' && status = 'draft')");
$response = pbRequest(
    "/api/collections/patient_forms/records?filter={$filter}&sort=-created&perPage=50",
    'GET',
    null,
    $adminToken
);

if (!$response || isset($response['code'])) {
    http_response_code(500);
    echo json_encode(['error' => 'Erreur lors de la récupération des formulaires']);
    exit;
}

// French month names for parsing appointment dates
$frenchMonths = [
    'janvier'=>1,'février'=>2,'mars'=>3,'avril'=>4,'mai'=>5,'juin'=>6,
    'juillet'=>7,'août'=>8,'septembre'=>9,'octobre'=>10,'novembre'=>11,'décembre'=>12
];

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

    // Extract appointment date/time from OneDoc data
    $appointmentDate = '';
    $appointmentTime = '';
    if (!empty($formData['onedoc_appointment'])) {
        $appt = $formData['onedoc_appointment'];
        // Format 1: "5 février 2026 12:35" (from email body)
        if (preg_match('/(\d{1,2})\s+(\w+)\s+(\d{4})\s+(\d{1,2}:\d{2})/', $appt, $am)) {
            $monthNum = $frenchMonths[strtolower($am[2])] ?? null;
            if ($monthNum) {
                $appointmentDate = sprintf('%04d-%02d-%02d', $am[3], $monthNum, $am[1]);
                $appointmentTime = $am[4];
            }
        }
        // Format 2: "09.03.2026 11:45" (from email subject)
        elseif (preg_match('/(\d{2})\.(\d{2})\.(\d{4})\s+(\d{1,2}:\d{2})/', $appt, $am)) {
            $appointmentDate = $am[3] . '-' . $am[2] . '-' . $am[1];
            $appointmentTime = $am[4];
        }
    }

    // Check linked patient (created at form submission)
    $isKnownPatient = false;
    $existingPatientId = null;
    $caseId = null;

    if (!empty($item['linked_patient'])) {
        $existingPatientId = $item['linked_patient'];
        // Check if this patient has prior consultations (= truly "known")
        $consultFilter = urlencode("patient = '{$existingPatientId}'");
        $consultCheck = pbRequest(
            "/api/collections/consultations/records?filter={$consultFilter}&perPage=1",
            'GET',
            null,
            $adminToken
        );
        $isKnownPatient = $consultCheck && !empty($consultCheck['items']);
    }

    // Get linked case
    $caseFilter = urlencode("patient_form = '{$item['id']}'");
    $caseSearch = pbRequest(
        "/api/collections/cases/records?filter={$caseFilter}&perPage=1",
        'GET',
        null,
        $adminToken
    );
    if ($caseSearch && !empty($caseSearch['items'])) {
        $caseId = $caseSearch['items'][0]['id'];
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
        'status' => $item['status'],
        'is_known_patient' => $isKnownPatient,
        'existing_patient_id' => $existingPatientId,
        'case_id' => $caseId,
        'appointment_date' => $appointmentDate,
        'appointment_time' => $appointmentTime
    ];
}

// Sort by appointment date (chronological), forms without appointment go last
usort($forms, function($a, $b) {
    $aDate = $a['appointment_date'] ?: '9999-99-99';
    $bDate = $b['appointment_date'] ?: '9999-99-99';
    $aKey = $aDate . ' ' . ($a['appointment_time'] ?: '99:99');
    $bKey = $bDate . ' ' . ($b['appointment_time'] ?: '99:99');
    return strcmp($aKey, $bKey);
});

echo json_encode([
    'success' => true,
    'forms' => $forms
]);
