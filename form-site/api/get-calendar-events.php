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

$locationId = $_GET['location_id'] ?? '';
if (empty($locationId)) {
    http_response_code(400);
    echo json_encode(['error' => 'location_id is required']);
    exit;
}

validatePbId($locationId, 'location_id');

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
$filter = urlencode("status = 'submitted' || status = 'processed' || (source = 'onedoc' && status = 'draft')");
$formsResponse = pbRequest(
    "/api/collections/patient_forms/records?filter={$filter}&sort=-created&perPage=100",
    'GET',
    null,
    $adminToken
);

// Build lookup maps for forms — used for multi-tier matching
$formsByEmail = [];
$formsByPhone = [];
$formsByName = [];
$formsByNameDob = []; // "normalized_name|YYYY-MM-DD" => formInfo
$formsByAppointment = []; // "YYYY-MM-DD HH:MM" => formInfo
$formsData = []; // form_id => decrypted data

// French month names for parsing onedoc_appointment
$frenchMonths = [
    'janvier'=>1,'février'=>2,'fevrier'=>2,'mars'=>3,'avril'=>4,'mai'=>5,'juin'=>6,
    'juillet'=>7,'août'=>8,'aout'=>8,'septembre'=>9,'octobre'=>10,'novembre'=>11,'décembre'=>12,'decembre'=>12
];

if ($formsResponse && !empty($formsResponse['items'])) {
    foreach ($formsResponse['items'] as $item) {
        $patientName = '';
        if (!empty($item['patient_name_encrypted'])) {
            $patientName = decryptData($item['patient_name_encrypted']);
        }

        $formData = [];
        $email = '';
        $phone = '';
        if (!empty($item['form_data_encrypted'])) {
            $formData = decryptFormData($item['form_data_encrypted']);
            $email = $formData['email'] ?? '';
            $phone = $formData['phone'] ?? '';
        }

        // Extract DOB from form data
        $birthdate = $formData['birthdate'] ?? '';
        $dobIso = '';
        if (!empty($birthdate)) {
            $ts = strtotime($birthdate);
            if ($ts) $dobIso = date('Y-m-d', $ts);
        }

        // Extract appointment date+time from form data
        $apptDate = '';
        $apptTime = '';
        // Priority: appointment_datetime field (ISO format)
        if (!empty($formData['appointment_datetime'])) {
            $parts = explode('T', $formData['appointment_datetime']);
            if (count($parts) === 2) {
                $apptDate = $parts[0];
                $apptTime = substr($parts[1], 0, 5);
            }
        }
        // Fallback: onedoc_appointment (French format)
        if (empty($apptDate) && !empty($formData['onedoc_appointment'])) {
            $appt = $formData['onedoc_appointment'];
            if (preg_match('/(\d{1,2})\s+(\w+)\s+(\d{4})\s+(\d{1,2}:\d{2})/', $appt, $am)) {
                $monthNum = $frenchMonths[strtolower($am[2])] ?? null;
                if ($monthNum) {
                    $apptDate = sprintf('%04d-%02d-%02d', $am[3], $monthNum, $am[1]);
                    $apptTime = $am[4];
                }
            } elseif (preg_match('/(\d{2})\.(\d{2})\.(\d{4})\s+(\d{1,2}:\d{2})/', $appt, $am)) {
                $apptDate = $am[3] . '-' . $am[2] . '-' . $am[1];
                $apptTime = $am[4];
            }
        }

        $formInfo = [
            'id' => $item['id'],
            'patient_name' => $patientName,
            'status' => $item['status'],
            'source' => $item['source'],
            'dob' => $dobIso,
            'email' => $email,
            'phone' => $phone,
            'appointment_date' => $apptDate,
            'appointment_time' => $apptTime,
            'appointment_location' => $formData['appointment_location'] ?? '',
            'linked_patient' => $item['linked_patient'] ?? ''
        ];

        $formsData[$item['id']] = $formInfo;

        // When multiple forms exist for the same key, prefer submitted over draft
        if (!empty($email)) {
            $emailKey = strtolower(trim($email));
            if (!isset($formsByEmail[$emailKey]) || $item['status'] === 'submitted') {
                $formsByEmail[$emailKey] = $formInfo;
            }
        }

        // Phone lookup (normalized)
        if (!empty($phone)) {
            $phoneKey = normalizePhone($phone);
            if (!empty($phoneKey)) {
                if (!isset($formsByPhone[$phoneKey]) || $item['status'] === 'submitted') {
                    $formsByPhone[$phoneKey] = $formInfo;
                }
            }
        }

        if (!empty($patientName)) {
            $nameKey = normalizeString($patientName);
            if (!isset($formsByName[$nameKey]) || $item['status'] === 'submitted') {
                $formsByName[$nameKey] = $formInfo;
            }
        }

        // Composite name+DOB lookup for stronger matching
        if (!empty($patientName) && !empty($dobIso)) {
            $nameKey = normalizeString($patientName);
            $compositeKey = $nameKey . '|' . $dobIso;
            if (!isset($formsByNameDob[$compositeKey]) || $item['status'] === 'submitted') {
                $formsByNameDob[$compositeKey] = $formInfo;
            }
        }

        // Appointment date+time lookup
        if (!empty($apptDate) && !empty($apptTime)) {
            $apptKey = $apptDate . ' ' . $apptTime;
            if (!isset($formsByAppointment[$apptKey]) || $item['status'] === 'submitted') {
                $formsByAppointment[$apptKey] = $formInfo;
            }
        }
    }
}

// Match each calendar event against forms
$events = [];
$matchedFormIds = [];

// Build persistent link map: calendar_event_id → formInfo (Tier 0)
$formsByCalendarEventId = [];
if ($formsResponse && !empty($formsResponse['items'])) {
    foreach ($formsResponse['items'] as $item) {
        if (!empty($item['calendar_event_id'])) {
            $formsByCalendarEventId[$item['calendar_event_id']] = $formsData[$item['id']] ?? null;
        }
    }
}

foreach ($calendarEvents as $event) {
    $formId = null;
    $formStatus = null;
    $suggestedForm = null;

    // Tier 0: Persistent link (manual linking via link-form-calendar.php)
    // Only tier that sets form_id directly (already confirmed by practitioner)
    if (!empty($event['id']) && isset($formsByCalendarEventId[$event['id']])) {
        $match = $formsByCalendarEventId[$event['id']];
        if ($match) {
            $formId = $match['id'];
            $formStatus = $match['status'];
            $matchedFormIds[] = $formId;
        }
    }

    // Tiers A-E: suggest a form (practitioner must confirm)
    // Each tier checks dedup: skip forms already matched by Tier 0 or suggested to another event
    if (!$formId && !$suggestedForm) {
        // Tier A: Appointment date+time + name (most specific)
        if (!empty($event['appointment_date']) && !empty($event['appointment_time']) && !empty($event['patient_name'])) {
            $apptKey = $event['appointment_date'] . ' ' . $event['appointment_time'];
            if (isset($formsByAppointment[$apptKey])) {
                $match = $formsByAppointment[$apptKey];
                if (!in_array($match['id'], $matchedFormIds)) {
                    $cleanName = preg_replace('/^\[OD\]\s*-?\s*/i', '', $event['patient_name']);
                    $calNameNorm = normalizeString($cleanName);
                    $formNameNorm = normalizeString($match['patient_name']);
                    if ($calNameNorm === $formNameNorm || normalizedContains($calNameNorm, $formNameNorm) || normalizedContains($formNameNorm, $calNameNorm)) {
                        $suggestedForm = ['id' => $match['id'], 'status' => $match['status'], 'tier' => 'appointment', 'match_field' => 'date+heure+nom'];
                        $matchedFormIds[] = $match['id'];
                    }
                }
            }
        }

        // Tier B: Email exact match
        if (!$suggestedForm && !empty($event['email'])) {
            $emailKey = strtolower(trim($event['email']));
            if (isset($formsByEmail[$emailKey])) {
                $match = $formsByEmail[$emailKey];
                if (!in_array($match['id'], $matchedFormIds)) {
                    $suggestedForm = ['id' => $match['id'], 'status' => $match['status'], 'tier' => 'email', 'match_field' => 'email'];
                    $matchedFormIds[] = $match['id'];
                }
            }
        }

        // Tier C: Phone normalized match
        if (!$suggestedForm && !empty($event['phone'])) {
            $phoneKey = normalizePhone($event['phone']);
            if (!empty($phoneKey) && isset($formsByPhone[$phoneKey])) {
                $match = $formsByPhone[$phoneKey];
                if (!in_array($match['id'], $matchedFormIds)) {
                    $suggestedForm = ['id' => $match['id'], 'status' => $match['status'], 'tier' => 'phone', 'match_field' => 'telephone'];
                    $matchedFormIds[] = $match['id'];
                }
            }
        }

        // Tier D: Name + DOB composite
        if (!$suggestedForm && !empty($event['patient_name']) && !empty($event['dob'])) {
            $cleanName = preg_replace('/^\[OD\]\s*-?\s*/i', '', $event['patient_name']);
            $compositeKey = normalizeString($cleanName) . '|' . $event['dob'];
            if (isset($formsByNameDob[$compositeKey])) {
                $match = $formsByNameDob[$compositeKey];
                if (!in_array($match['id'], $matchedFormIds)) {
                    $suggestedForm = ['id' => $match['id'], 'status' => $match['status'], 'tier' => 'name_dob', 'match_field' => 'nom+date de naissance'];
                    $matchedFormIds[] = $match['id'];
                }
            }
        }

        // Tier E: Name only (weakest)
        if (!$suggestedForm && !empty($event['patient_name'])) {
            $cleanName = preg_replace('/^\[OD\]\s*-?\s*/i', '', $event['patient_name']);
            $nameKey = normalizeString($cleanName);
            if (isset($formsByName[$nameKey])) {
                $match = $formsByName[$nameKey];
                if (!in_array($match['id'], $matchedFormIds)) {
                    $suggestedForm = ['id' => $match['id'], 'status' => $match['status'], 'tier' => 'name', 'match_field' => 'nom'];
                    $matchedFormIds[] = $match['id'];
                }
            }
        }
    }

    // Check if patient exists — first from matched/suggested form's linked_patient
    $isKnownPatient = false;
    $existingPatientId = null;
    $resolvedFormId = $formId ?? ($suggestedForm['id'] ?? null);

    if ($resolvedFormId && !empty($formsData[$resolvedFormId]['linked_patient'])) {
        $isKnownPatient = true;
        $existingPatientId = $formsData[$resolvedFormId]['linked_patient'];
    }

    if (!$isKnownPatient && !empty($event['email'])) {
        $emailFilter = urlencode("email = '" . sanitizePbFilterValue($event['email']) . "'");
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
        $dobFilter = urlencode("dob = '" . sanitizePbFilterValue($event['dob']) . "'");
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
        'consultation_type' => $event['consultation_type'] ?? 'consultation',
        'form_id' => $formId,
        'form_status' => $formStatus,
        'suggested_form' => $suggestedForm,
        'is_known_patient' => $isKnownPatient,
        'existing_patient_id' => $existingPatientId,
        'calendar_event_id' => $event['calendar_event_id']
    ];
}

// Build unlinked forms list (forms not matched to any calendar event)
$unlinkedForms = [];
foreach ($formsData as $fId => $fInfo) {
    if (!in_array($fId, $matchedFormIds) && $fInfo['status'] !== 'processed') {
        $unlinkedForms[] = [
            'id' => $fInfo['id'],
            'patient_name' => $fInfo['patient_name'],
            'dob' => $fInfo['dob'],
            'email' => $fInfo['email'],
            'phone' => $fInfo['phone'] ?? '',
            'appointment_date' => $fInfo['appointment_date'] ?? '',
            'appointment_time' => $fInfo['appointment_time'] ?? '',
            'status' => $fInfo['status']
        ];
    }
}

echo json_encode([
    'success' => true,
    'events' => $events,
    'calendar_configured' => true,
    'matched_form_ids' => $matchedFormIds,
    'unlinked_forms' => $unlinkedForms
]);
