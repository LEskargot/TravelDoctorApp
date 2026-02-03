<?php
/**
 * Get Patient History API
 * Returns consultation history, vaccines administered, and scheduled boosters
 */

require_once 'config.php';
require_once 'helpers.php';

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

$patientId = $_GET['patient_id'] ?? '';

if (empty($patientId)) {
    http_response_code(400);
    echo json_encode(['error' => 'ID du patient requis']);
    exit;
}

// Authenticate with PocketBase
$adminToken = pbAdminAuth();
if (!$adminToken) {
    http_response_code(500);
    echo json_encode(['error' => 'Erreur de connexion à la base de données']);
    exit;
}

// Fetch patient basic info
$patientResponse = pbRequest(
    "/api/collections/patients/records/{$patientId}",
    'GET',
    null,
    $adminToken
);

if (!$patientResponse || isset($patientResponse['code'])) {
    http_response_code(404);
    echo json_encode(['error' => 'Patient non trouvé']);
    exit;
}

// Fetch consultations
$consultFilter = urlencode("patient = '{$patientId}'");
$consultations = pbRequest(
    "/api/collections/consultations/records?filter={$consultFilter}&sort=-date_consultation&expand=location,practitioner",
    'GET',
    null,
    $adminToken
);

$consultationList = [];
$consultationIds = [];

if ($consultations && !empty($consultations['items'])) {
    foreach ($consultations['items'] as $consult) {
        $consultationIds[] = $consult['id'];

        $locationName = '';
        if (isset($consult['expand']['location'])) {
            $locationName = $consult['expand']['location']['name'];
        }

        $practitionerName = '';
        if (isset($consult['expand']['practitioner'])) {
            $practitionerName = $consult['expand']['practitioner']['name'];
        }

        // Parse destinations from notes or dedicated field
        $destinations = [];
        if (!empty($consult['destinations'])) {
            $destinations = is_array($consult['destinations'])
                ? $consult['destinations']
                : json_decode($consult['destinations'], true);
        }

        $consultationList[] = [
            'id' => $consult['id'],
            'date' => $consult['date_consultation'],
            'destinations' => $destinations,
            'notes' => $consult['notes'] ?? '',
            'location' => $locationName,
            'practitioner' => $practitionerName
        ];
    }
}

// Fetch vaccines administered for all consultations
$vaccinesList = [];
if (!empty($consultationIds)) {
    $vaccineFilter = urlencode("consultation IN ('" . implode("','", $consultationIds) . "')");
    $vaccines = pbRequest(
        "/api/collections/vaccines_administered/records?filter={$vaccineFilter}&sort=-date_administration",
        'GET',
        null,
        $adminToken
    );

    if ($vaccines && !empty($vaccines['items'])) {
        foreach ($vaccines['items'] as $vaccine) {
            $vaccinesList[] = [
                'id' => $vaccine['id'],
                'consultation_id' => $vaccine['consultation'],
                'name' => $vaccine['vaccine_name'],
                'lot' => $vaccine['lot_number'] ?? '',
                'date' => $vaccine['date_administration'],
                'dose' => $vaccine['dose_number'] ?? null
            ];
        }
    }
}

// Fetch scheduled boosters
$boosterFilter = urlencode("patient = '{$patientId}'");
$boosters = pbRequest(
    "/api/collections/boosters_scheduled/records?filter={$boosterFilter}&sort=date_rappel",
    'GET',
    null,
    $adminToken
);

$boostersList = [];
$overdueBooters = [];
$today = date('Y-m-d');

if ($boosters && !empty($boosters['items'])) {
    foreach ($boosters['items'] as $booster) {
        $boosterData = [
            'id' => $booster['id'],
            'vaccine_name' => $booster['vaccine_name'],
            'dose_number' => $booster['dose_number'] ?? null,
            'date_rappel' => $booster['date_rappel'],
            'completed' => $booster['completed'] ?? false
        ];

        // Check if overdue
        if (!$booster['completed'] && $booster['date_rappel'] < $today) {
            $boosterData['overdue'] = true;
            $overdueBooters[] = $boosterData;
        }

        $boostersList[] = $boosterData;
    }
}

// Fetch prescriptions
$prescriptionFilter = urlencode("consultation IN ('" . implode("','", $consultationIds) . "')");
$prescriptions = pbRequest(
    "/api/collections/prescriptions/records?filter={$prescriptionFilter}&sort=-created",
    'GET',
    null,
    $adminToken
);

$prescriptionsList = [];
if ($prescriptions && !empty($prescriptions['items'])) {
    foreach ($prescriptions['items'] as $prescription) {
        $prescriptionsList[] = [
            'id' => $prescription['id'],
            'consultation_id' => $prescription['consultation'],
            'medication' => $prescription['medication_name'],
            'dosage' => $prescription['dosage'] ?? '',
            'quantity' => $prescription['quantity'] ?? '',
            'instructions' => $prescription['instructions'] ?? ''
        ];
    }
}

// Build timeline (combines all events chronologically)
$timeline = [];

// Add consultations to timeline
foreach ($consultationList as $consult) {
    $timeline[] = [
        'type' => 'consultation',
        'date' => $consult['date'],
        'data' => $consult
    ];
}

// Add boosters to timeline
foreach ($boostersList as $booster) {
    $timeline[] = [
        'type' => 'booster',
        'date' => $booster['date_rappel'],
        'data' => $booster
    ];
}

// Sort timeline by date (newest first)
usort($timeline, function($a, $b) {
    return strtotime($b['date']) - strtotime($a['date']);
});

echo json_encode([
    'success' => true,
    'patient' => [
        'id' => $patientResponse['id'],
        'nom' => $patientResponse['nom'],
        'prenom' => $patientResponse['prenom'],
        'dob' => $patientResponse['dob'],
        'avs' => $patientResponse['avs'] ?? '',
        'email' => $patientResponse['email'] ?? '',
        'phone' => $patientResponse['phone'] ?? '',
        'first_consultation' => !empty($consultationList)
            ? end($consultationList)['date']
            : null
    ],
    'consultations' => $consultationList,
    'vaccines' => $vaccinesList,
    'boosters' => $boostersList,
    'overdue_boosters' => $overdueBooters,
    'prescriptions' => $prescriptionsList,
    'timeline' => $timeline
]);
