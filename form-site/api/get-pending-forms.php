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
header('Cache-Control: no-store, no-cache, must-revalidate');
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
$today = (new DateTime('now', new DateTimeZone('Europe/Zurich')))->format('Y-m-d');

// --- Phase 1: Decrypt all forms and collect IDs for batch queries ---
$decryptedForms = [];
$linkedPatientIds = [];
$formIds = [];

foreach ($response['items'] as $item) {
    $patientName = '';
    if (!empty($item['patient_name_encrypted'])) {
        $patientName = decryptData($item['patient_name_encrypted']);
    }

    $formData = [];
    $birthdate = '';
    $destination = '';
    $avs = '';

    if (!empty($item['form_data_encrypted'])) {
        $formData = decryptFormData($item['form_data_encrypted']);
        $birthdate = $formData['birthdate'] ?? '';
        if (!empty($formData['destinations']) && is_array($formData['destinations'])) {
            $destination = $formData['destinations'][0]['country'] ?? '';
        }
    }

    if (!empty($item['avs_encrypted'])) {
        $avs = decryptData($item['avs_encrypted']);
    }

    // Extract appointment date/time
    $appointmentDate = '';
    $appointmentTime = '';
    if (!empty($formData['onedoc_appointment'])) {
        $appt = $formData['onedoc_appointment'];
        if (preg_match('/(\d{1,2})\s+(\w+)\s+(\d{4})\s+(\d{1,2}:\d{2})/', $appt, $am)) {
            $monthNum = $frenchMonths[strtolower($am[2])] ?? null;
            if ($monthNum) {
                $appointmentDate = sprintf('%04d-%02d-%02d', $am[3], $monthNum, $am[1]);
                $appointmentTime = $am[4];
            }
        } elseif (preg_match('/(\d{2})\.(\d{2})\.(\d{4})\s+(\d{1,2}:\d{2})/', $appt, $am)) {
            $appointmentDate = $am[3] . '-' . $am[2] . '-' . $am[1];
            $appointmentTime = $am[4];
        }
    }
    if (empty($appointmentDate) && !empty($formData['appointment_datetime'])) {
        $parts = explode('T', $formData['appointment_datetime']);
        if (count($parts) === 2) {
            $appointmentDate = $parts[0];
            $appointmentTime = substr($parts[1], 0, 5);
        }
    }

    // Filter stale OneDOC drafts
    if ($item['status'] === 'draft' && $item['source'] === 'onedoc' && !empty($appointmentDate)) {
        if ($appointmentDate < $today) {
            continue;
        }
    }

    // Apply search filter
    if (!empty($search)) {
        $searchLower = strtolower($search);
        $nameMatch = strpos(strtolower($patientName), $searchLower) !== false;
        $dobMatch = strpos($birthdate, $search) !== false;
        $avsMatch = strpos($avs, $search) !== false;
        if (!$nameMatch && !$dobMatch && !$avsMatch) {
            continue;
        }
    }

    // Collect IDs for batch queries
    if (!empty($item['linked_patient'])) {
        $linkedPatientIds[$item['linked_patient']] = true;
    }
    $formIds[] = $item['id'];

    $decryptedForms[] = [
        'item' => $item,
        'patientName' => $patientName,
        'birthdate' => $birthdate,
        'destination' => $destination,
        'avs' => $avs,
        'appointmentDate' => $appointmentDate,
        'appointmentTime' => $appointmentTime
    ];
}

// --- Phase 2: Batch query for known patients (have consultations) ---
$knownPatients = [];
$uniquePatientIds = array_keys($linkedPatientIds);
if (!empty($uniquePatientIds)) {
    $patientIdList = "'" . implode("','", $uniquePatientIds) . "'";
    $consultFilter = urlencode("patient IN ({$patientIdList})");
    $consultCheck = pbRequest(
        "/api/collections/consultations/records?filter={$consultFilter}&perPage=200&fields=patient",
        'GET',
        null,
        $adminToken
    );
    if ($consultCheck && !empty($consultCheck['items'])) {
        foreach ($consultCheck['items'] as $c) {
            $knownPatients[$c['patient']] = true;
        }
    }
}

// --- Phase 3: Batch query for linked cases ---
$casesByFormId = [];
if (!empty($formIds)) {
    $formIdList = "'" . implode("','", $formIds) . "'";
    $caseFilter = urlencode("patient_form IN ({$formIdList})");
    $caseSearch = pbRequest(
        "/api/collections/cases/records?filter={$caseFilter}&perPage=200&fields=id,patient_form",
        'GET',
        null,
        $adminToken
    );
    if ($caseSearch && !empty($caseSearch['items'])) {
        foreach ($caseSearch['items'] as $cs) {
            $casesByFormId[$cs['patient_form']] = $cs['id'];
        }
    }
}

// --- Phase 4: Assemble response ---
foreach ($decryptedForms as $df) {
    $item = $df['item'];
    $existingPatientId = $item['linked_patient'] ?? null;

    $forms[] = [
        'id' => $item['id'],
        'patient_name' => $df['patientName'],
        'birthdate' => $df['birthdate'],
        'destination' => $df['destination'],
        'avs' => $df['avs'] ? substr($df['avs'], 0, 8) . '...' : '',
        'submitted_at' => $item['submitted_at'],
        'source' => $item['source'],
        'status' => $item['status'],
        'is_known_patient' => isset($knownPatients[$existingPatientId]),
        'existing_patient_id' => $existingPatientId,
        'case_id' => $casesByFormId[$item['id']] ?? null,
        'appointment_date' => $df['appointmentDate'],
        'appointment_time' => $df['appointmentTime']
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
