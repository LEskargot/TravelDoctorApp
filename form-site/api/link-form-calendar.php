<?php
/**
 * Link Form to Calendar Event API
 * Manually links a patient form to a Google Calendar event.
 *
 * POST params:
 *   - form_id (required): PocketBase patient_forms record ID
 *   - calendar_event_id (required): Google Calendar event ID string
 */

require_once 'config.php';
require_once 'helpers.php';

header('Content-Type: application/json');
corsHeaders();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$authUser = requireAuth();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$formId = $input['form_id'] ?? '';
$calendarEventId = $input['calendar_event_id'] ?? '';

if (empty($formId) || empty($calendarEventId)) {
    http_response_code(400);
    echo json_encode(['error' => 'form_id and calendar_event_id are required']);
    exit;
}

validatePbId($formId, 'form_id');

// Sanitize calendar event ID (Google Calendar IDs are alphanumeric + some special chars)
if (!preg_match('/^[a-zA-Z0-9_\-]+$/', $calendarEventId)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid calendar_event_id format']);
    exit;
}

// Authenticate with PocketBase
$adminToken = pbAdminAuth();
if (!$adminToken) {
    http_response_code(500);
    echo json_encode(['error' => 'Erreur de connexion à la base de données']);
    exit;
}

// Clear calendar_event_id from any other forms that had this same value
$filter = urlencode("calendar_event_id = '" . sanitizePbFilterValue($calendarEventId) . "' && id != '" . sanitizePbFilterValue($formId) . "'");
$oldLinks = pbRequest(
    "/api/collections/patient_forms/records?filter={$filter}&perPage=50",
    'GET',
    null,
    $adminToken
);
if ($oldLinks && !empty($oldLinks['items'])) {
    foreach ($oldLinks['items'] as $oldForm) {
        pbRequest(
            "/api/collections/patient_forms/records/{$oldForm['id']}",
            'PATCH',
            ['calendar_event_id' => ''],
            $adminToken
        );
    }
}

// Update patient_forms record with calendar_event_id
$updateResponse = pbRequest(
    "/api/collections/patient_forms/records/{$formId}",
    'PATCH',
    ['calendar_event_id' => $calendarEventId],
    $adminToken
);

if (!$updateResponse || isset($updateResponse['code'])) {
    http_response_code(500);
    echo json_encode(['error' => 'Erreur lors de la mise à jour', 'details' => $updateResponse]);
    exit;
}

echo json_encode([
    'success' => true,
    'message' => 'Formulaire lié à l\'événement calendrier'
]);
