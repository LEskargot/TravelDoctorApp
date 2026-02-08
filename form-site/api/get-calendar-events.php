<?php
/**
 * Get Calendar Events API
 * Fetches today's appointments from Google Calendar for a given location,
 * then matches against PocketBase pending forms.
 *
 * Query params:
 *   - location_id (required): PocketBase location record ID
 *   - date (optional): YYYY-MM-DD, defaults to today (Europe/Zurich)
 */

require_once 'config.php';
require_once 'helpers.php';
require_once 'encryption.php';
require_once 'google-calendar.php';

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

$locationId = $_GET['location_id'] ?? '';
if (empty($locationId)) {
    http_response_code(400);
    echo json_encode(['error' => 'location_id is required']);
    exit;
}

// Date range: defaults to today → +30 days (Europe/Zurich)
$tz = new DateTimeZone('Europe/Zurich');
$today = (new DateTime('now', $tz))->format('Y-m-d');
$dateFrom = $_GET['date_from'] ?? $today;
$dateTo = $_GET['date_to'] ?? (new DateTime('+30 days', $tz))->format('Y-m-d');

// Validate date format
if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $dateFrom) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $dateTo)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid date format. Use YYYY-MM-DD']);
    exit;
}

// Authenticate with PocketBase
$adminToken = pbAdminAuth();
if (!$adminToken) {
    http_response_code(500);
    echo json_encode(['error' => 'Erreur de connexion à la base de données']);
    exit;
}

// Fetch location to get google_calendar_id
$location = pbRequest(
    "/api/collections/locations/records/$locationId",
    'GET',
    null,
    $adminToken
);

if (!$location || isset($location['code'])) {
    http_response_code(404);
    echo json_encode(['error' => 'Location not found']);
    exit;
}

$calendarId = $location['google_calendar_id'] ?? '';
if (empty($calendarId)) {
    // No calendar configured for this location — return empty (not an error)
    echo json_encode(['success' => true, 'events' => [], 'calendar_configured' => false]);
    exit;
}

// Fetch calendar events for the date range
$calendarEvents = fetchCalendarEvents($calendarId, $dateFrom, $dateTo);
if ($calendarEvents === null) {
    // Calendar API error — return gracefully so the UI can fall back to forms-only
    echo json_encode(['success' => true, 'events' => [], 'calendar_error' => true]);
    exit;
}

// Fetch pending forms to match against calendar events
$filter = urlencode("status = 'submitted' || (source = 'onedoc' && status = 'draft')");
$formsResponse = pbRequest(
    "/api/collections/patient_forms/records?filter={$filter}&sort=-created&perPage=100",
    'GET',
    null,
    $adminToken
);

// Build lookup of forms by email and by normalized name
$formsByEmail = [];
$formsByName = [];
$formsByNameDob = []; // "normalized_name|YYYY-MM-DD" => formInfo
$formsData = []; // form_id => decrypted data

if ($formsResponse && !empty($formsResponse['items'])) {
    foreach ($formsResponse['items'] as $item) {
        $patientName = '';
        if (!empty($item['patient_name_encrypted'])) {
            $patientName = decryptData($item['patient_name_encrypted']);
        }

        $formData = [];
        $email = '';
        if (!empty($item['form_data_encrypted'])) {
            $formData = decryptFormData($item['form_data_encrypted']);
            $email = $formData['email'] ?? '';
        }

        // Extract DOB from form data
        $birthdate = $formData['birthdate'] ?? '';
        $dobIso = '';
        if (!empty($birthdate)) {
            $ts = strtotime($birthdate);
            if ($ts) $dobIso = date('Y-m-d', $ts);
        }

        $formInfo = [
            'id' => $item['id'],
            'patient_name' => $patientName,
            'status' => $item['status'],
            'source' => $item['source'],
            'dob' => $dobIso,
            'email' => $email
        ];

        $formsData[$item['id']] = $formInfo;

        if (!empty($email)) {
            $emailKey = strtolower(trim($email));
            $formsByEmail[$emailKey] = $formInfo;
        }

        if (!empty($patientName)) {
            $nameKey = normalizeString($patientName);
            $formsByName[$nameKey] = $formInfo;
        }

        // Composite name+DOB lookup for stronger matching
        if (!empty($patientName) && !empty($dobIso)) {
            $nameKey = normalizeString($patientName);
            $formsByNameDob[$nameKey . '|' . $dobIso] = $formInfo;
        }
    }
}

// Match each calendar event against forms
$events = [];
$matchedFormIds = [];

foreach ($calendarEvents as $event) {
    $formId = null;
    $formStatus = null;

    // Match by email first (most reliable)
    if (!empty($event['email'])) {
        $emailKey = strtolower(trim($event['email']));
        if (isset($formsByEmail[$emailKey])) {
            $match = $formsByEmail[$emailKey];
            $formId = $match['id'];
            $formStatus = $match['status'];
            $matchedFormIds[] = $formId;
        }
    }

    // If no email match, try name + DOB composite match (strong)
    if (!$formId && !empty($event['patient_name']) && !empty($event['dob'])) {
        $cleanName = preg_replace('/^\[OD\]\s*-?\s*/i', '', $event['patient_name']);
        $compositeKey = normalizeString($cleanName) . '|' . $event['dob'];
        if (isset($formsByNameDob[$compositeKey])) {
            $match = $formsByNameDob[$compositeKey];
            $formId = $match['id'];
            $formStatus = $match['status'];
            $matchedFormIds[] = $formId;
        }
    }

    // Fallback: name-only match
    if (!$formId && !empty($event['patient_name'])) {
        $cleanName = preg_replace('/^\[OD\]\s*-?\s*/i', '', $event['patient_name']);
        $nameKey = normalizeString($cleanName);
        if (isset($formsByName[$nameKey])) {
            $match = $formsByName[$nameKey];
            $formId = $match['id'];
            $formStatus = $match['status'];
            $matchedFormIds[] = $formId;
        }
    }

    // Check if patient exists in patients collection
    $isKnownPatient = false;
    $existingPatientId = null;

    if (!empty($event['email'])) {
        $emailFilter = urlencode("email = '" . addslashes($event['email']) . "'");
        $patientSearch = pbRequest(
            "/api/collections/patients/records?filter={$emailFilter}&perPage=1",
            'GET',
            null,
            $adminToken
        );
        if ($patientSearch && !empty($patientSearch['items'])) {
            $isKnownPatient = true;
            $existingPatientId = $patientSearch['items'][0]['id'];
        }
    }

    // If no email match on patient, try DOB + name
    if (!$isKnownPatient && !empty($event['dob']) && !empty($event['patient_name'])) {
        $dobFilter = urlencode("dob = '" . $event['dob'] . "'");
        $patientSearch = pbRequest(
            "/api/collections/patients/records?filter={$dobFilter}&perPage=50",
            'GET',
            null,
            $adminToken
        );
        if ($patientSearch && !empty($patientSearch['items'])) {
            $nameParts = explode(' ', trim($event['patient_name']), 2);
            $prenomCal = $nameParts[0] ?? '';
            $nomCal = $nameParts[1] ?? $nameParts[0] ?? '';

            foreach ($patientSearch['items'] as $patient) {
                $prenomMatch = normalizedContains($patient['prenom'], $prenomCal) ||
                               normalizedContains($prenomCal, $patient['prenom']);
                $nomMatch = normalizedContains($patient['nom'], $nomCal) ||
                            normalizedContains($nomCal, $patient['nom']);

                if ($prenomMatch && $nomMatch) {
                    $isKnownPatient = true;
                    $existingPatientId = $patient['id'];
                    break;
                }
            }
        }
    }

    $events[] = [
        'patient_name' => $event['patient_name'],
        'appointment_date' => $event['appointment_date'],
        'appointment_time' => $event['appointment_time'],
        'sex' => $event['sex'],
        'dob' => $event['dob'],
        'email' => $event['email'],
        'phone' => $event['phone'],
        'form_id' => $formId,
        'form_status' => $formStatus,
        'is_known_patient' => $isKnownPatient,
        'existing_patient_id' => $existingPatientId,
        'calendar_event_id' => $event['calendar_event_id']
    ];
}

echo json_encode([
    'success' => true,
    'events' => $events,
    'calendar_configured' => true,
    'matched_form_ids' => $matchedFormIds
]);
