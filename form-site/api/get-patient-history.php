<?php
/**
 * Get Patient History API
 * Returns consultation history with cases (voyage + medical), vaccines, boosters, prescriptions.
 * Handles decryption of medical_encrypted and medications_encrypted server-side.
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

// Decrypt patient medical data
$patientMedical = null;
if (!empty($patientResponse['medical_encrypted'])) {
    try {
        $patientMedical = decryptFormData($patientResponse['medical_encrypted']);
    } catch (Exception $e) {
        error_log('Failed to decrypt patient medical: ' . $e->getMessage());
    }
}

// Fetch cases for this patient
$caseFilter = urlencode("patient = '{$patientId}'");
$casesResponse = pbRequest(
    "/api/collections/cases/records?filter={$caseFilter}&sort=-opened_at",
    'GET',
    null,
    $adminToken
);

$casesList = [];
$casesById = [];
if ($casesResponse && !empty($casesResponse['items'])) {
    foreach ($casesResponse['items'] as $caseItem) {
        $caseMedical = null;
        if (!empty($caseItem['medical_encrypted'])) {
            try {
                $caseMedical = decryptFormData($caseItem['medical_encrypted']);
            } catch (Exception $e) {
                error_log('Failed to decrypt case medical: ' . $e->getMessage());
            }
        }

        $caseData = [
            'id' => $caseItem['id'],
            'type' => $caseItem['type'] ?? null,
            'status' => $caseItem['status'] ?? null,
            'voyage' => $caseItem['voyage'] ?? null,
            'medical' => $caseMedical,
            'opened_at' => $caseItem['opened_at'] ?? null,
            'closed_at' => $caseItem['closed_at'] ?? null,
            'notes' => $caseItem['notes'] ?? ''
        ];

        $casesList[] = $caseData;
        $casesById[$caseItem['id']] = $caseData;
    }
}

// Fetch consultations
$consultFilter = urlencode("patient = '{$patientId}'");
$consultations = pbRequest(
    "/api/collections/consultations/records?filter={$consultFilter}&sort=-date&expand=location,practitioner",
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

        // Attach case data (voyage + medical) to consultation
        $caseData = null;
        if (!empty($consult['case']) && isset($casesById[$consult['case']])) {
            $caseData = $casesById[$consult['case']];
        }

        $consultationList[] = [
            'id' => $consult['id'],
            'date' => $consult['date'],
            'type' => $consult['consultation_type'] ?? null,
            'duration_minutes' => $consult['duration_minutes'] ?? 0,
            'notes' => $consult['notes'] ?? '',
            'location' => $locationName,
            'practitioner' => $practitionerName,
            'case' => $caseData
        ];
    }
}

// Fetch vaccines administered for all consultations
$vaccinesList = [];
if (!empty($consultationIds)) {
    $vaccineFilter = urlencode("consultation IN ('" . implode("','", $consultationIds) . "')");
    $vaccines = pbRequest(
        "/api/collections/vaccines_administered/records?filter={$vaccineFilter}&sort=-date",
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
                'lot' => $vaccine['lot'] ?? '',
                'date' => $vaccine['date'],
                'dose' => $vaccine['dose_number'] ?? null
            ];
        }
    }
}

// Fetch scheduled boosters
$boosterFilter = urlencode("patient = '{$patientId}'");
$boosters = pbRequest(
    "/api/collections/boosters_scheduled/records?filter={$boosterFilter}&sort=due_date",
    'GET',
    null,
    $adminToken
);

$boostersList = [];
$overdueBoosters = [];
$today = date('Y-m-d');

if ($boosters && !empty($boosters['items'])) {
    foreach ($boosters['items'] as $booster) {
        $boosterData = [
            'id' => $booster['id'],
            'vaccine_name' => $booster['vaccine_name'],
            'dose_number' => $booster['dose_number'] ?? null,
            'due_date' => $booster['due_date'],
            'status' => $booster['status'] ?? 'planifie',
            'case' => $booster['case'] ?? null
        ];

        // Check if overdue
        $isCompleted = ($booster['status'] ?? '') === 'complete';
        if (!$isCompleted && $booster['due_date'] < $today) {
            $boosterData['overdue'] = true;
            $overdueBoosters[] = $boosterData;
        }

        $boostersList[] = $boosterData;
    }
}

// Fetch prescriptions with decrypted medications
$prescriptionsList = [];
if (!empty($consultationIds)) {
    $prescriptionFilter = urlencode("consultation IN ('" . implode("','", $consultationIds) . "')");
    $prescriptions = pbRequest(
        "/api/collections/prescriptions/records?filter={$prescriptionFilter}&sort=-created",
        'GET',
        null,
        $adminToken
    );

    if ($prescriptions && !empty($prescriptions['items'])) {
        foreach ($prescriptions['items'] as $prescription) {
            $medications = [];
            if (!empty($prescription['medications_encrypted'])) {
                try {
                    $medications = decryptFormData($prescription['medications_encrypted']);
                } catch (Exception $e) {
                    error_log('Failed to decrypt prescription: ' . $e->getMessage());
                }
            }

            $prescriptionsList[] = [
                'id' => $prescription['id'],
                'consultation_id' => $prescription['consultation'],
                'date' => $prescription['date'],
                'medications' => $medications
            ];
        }
    }
}

echo json_encode([
    'success' => true,
    'patient' => [
        'id' => $patientResponse['id'],
        'nom' => $patientResponse['nom'],
        'prenom' => $patientResponse['prenom'],
        'dob' => $patientResponse['dob'],
        'avs' => $patientResponse['avs'] ?? '',
        'email' => $patientResponse['email'] ?? '',
        'telephone' => $patientResponse['telephone'] ?? '',
        'adresse' => $patientResponse['adresse'] ?? '',
        'poids' => $patientResponse['poids'] ?? null,
        'sexe' => $patientResponse['sexe'] ?? null,
        'medical' => $patientMedical,
        'first_consultation' => !empty($consultationList)
            ? end($consultationList)['date']
            : null
    ],
    'cases' => $casesList,
    'consultations' => $consultationList,
    'vaccines' => $vaccinesList,
    'boosters' => $boostersList,
    'overdue_boosters' => $overdueBoosters,
    'prescriptions' => $prescriptionsList
]);
