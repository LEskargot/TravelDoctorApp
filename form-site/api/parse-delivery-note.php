<?php
/**
 * AI-Powered Delivery Note Parser
 * Receives a PDF delivery note, sends it to Claude API for structured extraction,
 * validates response against the 27-vaccine allowlist, and returns JSON.
 *
 * Cost optimization: extracts PDF text layer via pdftotext first (text-only API call).
 * Falls back to full PDF document/vision mode only for scanned PDFs without a text layer.
 *
 * POST multipart/form-data with 'pdf' file
 * Returns {success: true, lots: [...], mode: "text"|"vision"}
 * On failure returns {success: false, error: "...", fallback: true} so frontend uses local parsing
 */

require_once 'config.php';
require_once 'helpers.php';

header('Content-Type: application/json');
corsHeaders();

$authUser = requireAuth();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

// Check API key is configured
if (!defined('ANTHROPIC_API_KEY') || empty(ANTHROPIC_API_KEY)) {
    http_response_code(501);
    echo json_encode(['success' => false, 'error' => 'AI parsing not configured', 'fallback' => true]);
    exit;
}

// Check PDF file was uploaded
if (!isset($_FILES['pdf']) || $_FILES['pdf']['error'] !== UPLOAD_ERR_OK) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'No PDF file uploaded', 'fallback' => true]);
    exit;
}

// Limit file size (10 MB)
$maxSize = 10 * 1024 * 1024;
if ($_FILES['pdf']['size'] > $maxSize) {
    http_response_code(413);
    echo json_encode(['success' => false, 'error' => 'PDF too large (max 10 MB)', 'fallback' => true]);
    exit;
}

// The 27 allowed vaccine names (must match VACCINE_SCHEDULES keys exactly)
$allowedVaccines = [
    'Adacel', 'Adacel Polio', 'Boostrix', 'Boostrix polio', 'Comirnaty',
    'Efluelda', 'Encepur adultes', 'Encepur enfants', 'Engerix B-20',
    'FSME-Immun CC', 'FSME-Immun Junior', 'Havrix 1440', 'Havrix 720',
    'IPV Polio', 'Ixiaro', 'Menveo', 'Priorix', 'Qdenga', 'Rabipur',
    'Revaxis', 'Shingrix', 'Stamaril', 'Twinrix 720/20', 'Typhim',
    'Varilrix', 'VaxigripTetra', 'Vivotif'
];

$vaccineList = implode(', ', $allowedVaccines);

// Step 1: Try to extract text layer from PDF using pdftotext (poppler-utils)
$pdfPath = $_FILES['pdf']['tmp_name'];
$extractedText = '';
$useVision = false;

$pdftotextBin = trim(shell_exec('which pdftotext 2>/dev/null') ?? '');
if ($pdftotextBin) {
    $escapedPath = escapeshellarg($pdfPath);
    $extractedText = shell_exec("$pdftotextBin -layout $escapedPath - 2>/dev/null") ?? '';
}

// If text layer is too sparse (<50 non-whitespace chars), fall back to full PDF vision
$strippedLen = strlen(preg_replace('/\s+/', '', $extractedText));
if ($strippedLen < 50) {
    $useVision = true;
    error_log("parse-delivery-note: text layer too sparse ({$strippedLen} chars), using PDF vision");
} else {
    error_log("parse-delivery-note: using text layer ({$strippedLen} chars)");
}

// Build the extraction prompt (shared between text and vision modes)
$instructions = <<<INSTRUCTIONS
Parse this document containing one or more Swiss pharmaceutical delivery notes (bons de livraison). The document may contain multiple pages from different suppliers. Each page is a separate delivery note.

STEP 1 — Identify each vaccine product and match it to EXACTLY one name from this list:
$vaccineList

Name mapping (delivery notes use commercial/German/descriptive names):
- "HAVRIX 1440 Erwachsene" or "HAVRIX 1440 susp inj" -> "Havrix 1440"
- "HAVRIX 720 Junior" or "HAVRIX 720 Kinder" -> "Havrix 720"
- "ENCEPUR N Kinder" or "ENCEPUR enfants" -> "Encepur enfants"
- "ENCEPUR N Erwachsene" or "ENCEPUR adultes" -> "Encepur adultes"
- "FSME-IMMUN CC" or "FSME-Immun 0.5ml" -> "FSME-Immun CC"
- "FSME-IMMUN Junior" or "FSME-Immun 0.25ml" -> "FSME-Immun Junior"
- "BOOSTRIX Polio" -> "Boostrix polio" (lowercase p)
- "ADACEL-POLIO" or "ADACEL POLIO" -> "Adacel Polio"
- "TWINRIX 720/20" or "TWINRIX adulte" -> "Twinrix 720/20"
- "ENGERIX-B 20" or "ENGERIX B20" -> "Engerix B-20"
- "VAXIGRIPTETRA" or "VaxigripTetra" -> "VaxigripTetra"
- "IPV Polio" or "Imovax Polio" -> "IPV Polio"
- "RABIPUR VIAL..." or "RABIPUR VACCIN RABIQUE..." -> "Rabipur"
- "TYPHIM VI SOL INJ..." -> "Typhim"

Skip products not in the list (e.g. PROQUAD, syringes, diluents).

STEP 2 — For each matched product, extract these fields:

- vaccine: the EXACT name from the list (case-sensitive)
- lot: the batch/lot number. This is a short alphanumeric code like "AHAVC169AA", "FDP00689", "Y3E772V", "5PT27", "3004288".
  IMPORTANT: The lot number is NOT the product description, NOT the dosage, NOT the packaging info.
  These are NOT lot numbers: "RABIPUR_VIAL_X1_+PFS_+2N_CH", "25MCG/0.5ML", "SUSP INJ SER PRE", "VACCIN RABIQUE C SOLV".
  Look for fields labeled "Charge:", "Ch.-B.:", "Lot:", or a code in the format "XXXX / DD.MM.YYYY".
  If no lot number is present on the delivery note, use "" (empty string).
- expiration: the expiry date in YYYY-MM-DD format. Look for "Verfall:", "Exp. Date:", "EXP", or a date after a slash following the lot code.
  If no expiration date is present, use "" (empty string).
- quantity: number of units delivered (integer). Look for "Menge:", "Pce", "Stk", or a quantity column.

STEP 3 — If the same vaccine appears on multiple pages (different delivery notes), output one entry per occurrence. Do NOT merge them.

Return ONLY a JSON array, no explanation:
[{"vaccine": "...", "lot": "...", "expiration": "...", "quantity": N}]

If no matching vaccines are found, return: []
INSTRUCTIONS;

// Step 2: Build Claude API request — text-only or full PDF vision
if ($useVision) {
    // Scanned PDF: send full document for vision processing
    $pdfData = base64_encode(file_get_contents($pdfPath));
    $messageContent = [
        [
            'type' => 'document',
            'source' => [
                'type' => 'base64',
                'media_type' => 'application/pdf',
                'data' => $pdfData
            ]
        ],
        [
            'type' => 'text',
            'text' => $instructions
        ]
    ];
} else {
    // Text layer available: send extracted text only (much cheaper)
    $messageContent = [
        [
            'type' => 'text',
            'text' => "Here is the text extracted from a Swiss pharmaceutical delivery note:\n\n" . $extractedText . "\n\n" . $instructions
        ]
    ];
}

$requestBody = [
    'model' => 'claude-sonnet-4-20250514',
    'max_tokens' => 1024,
    'messages' => [
        [
            'role' => 'user',
            'content' => $messageContent
        ]
    ]
];

// Call Claude API
$ch = curl_init('https://api.anthropic.com/v1/messages');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 60);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'x-api-key: ' . ANTHROPIC_API_KEY,
    'anthropic-version: 2023-06-01'
]);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($requestBody));

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

if ($curlError) {
    error_log("Claude API curl error: $curlError");
    http_response_code(502);
    echo json_encode(['success' => false, 'error' => 'AI service unavailable', 'fallback' => true]);
    exit;
}

if ($httpCode !== 200) {
    error_log("Claude API HTTP $httpCode: " . substr($response, 0, 500));
    http_response_code(502);
    echo json_encode(['success' => false, 'error' => "AI service error (HTTP $httpCode)", 'fallback' => true]);
    exit;
}

$apiResult = json_decode($response, true);
if (!$apiResult || !isset($apiResult['content'][0]['text'])) {
    error_log("Claude API unexpected response: " . substr($response, 0, 500));
    http_response_code(502);
    echo json_encode(['success' => false, 'error' => 'AI returned unexpected format', 'fallback' => true]);
    exit;
}

$rawText = $apiResult['content'][0]['text'];

// Strip markdown code fences if present (Claude sometimes wraps JSON)
$rawText = preg_replace('/^```(?:json)?\s*/i', '', $rawText);
$rawText = preg_replace('/\s*```\s*$/', '', $rawText);
$rawText = trim($rawText);

$lots = json_decode($rawText, true);

if (!is_array($lots)) {
    error_log("Claude API returned non-array JSON: " . substr($rawText, 0, 300));
    http_response_code(502);
    echo json_encode(['success' => false, 'error' => 'AI returned invalid data', 'fallback' => true]);
    exit;
}

// Validate and filter each lot against the allowlist
$allowedSet = array_flip($allowedVaccines);
$validLots = [];

foreach ($lots as $entry) {
    if (!is_array($entry)) continue;

    $vaccineName = $entry['vaccine'] ?? '';
    if (!isset($allowedSet[$vaccineName])) continue; // skip hallucinated names

    // Validate date format
    $expiration = $entry['expiration'] ?? '';
    if ($expiration && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $expiration)) {
        $expiration = '';
    }

    // Clamp quantity
    $quantity = max(0, intval($entry['quantity'] ?? 0));

    $validLots[] = [
        'vaccine' => $vaccineName,
        'lot' => (string)($entry['lot'] ?? ''),
        'expiration' => $expiration,
        'quantity' => $quantity
    ];
}

echo json_encode([
    'success' => true,
    'lots' => $validLots,
    'mode' => $useVision ? 'vision' : 'text'
]);
