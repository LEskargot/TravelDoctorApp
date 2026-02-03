<?php
/**
 * Match Patient API
 * Search for existing patient by AVS or DOB+name
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

// Get search parameters
$avs = $_GET['avs'] ?? '';
$dob = $_GET['dob'] ?? '';
$prenom = $_GET['prenom'] ?? '';
$nom = $_GET['nom'] ?? '';

if (empty($avs) && (empty($dob) || (empty($prenom) && empty($nom)))) {
    http_response_code(400);
    echo json_encode(['error' => 'AVS ou date de naissance + nom requis']);
    exit;
}

// Authenticate with PocketBase
$adminToken = pbAdminAuth();
if (!$adminToken) {
    http_response_code(500);
    echo json_encode(['error' => 'Erreur de connexion à la base de données']);
    exit;
}

$matches = [];

// Priority 1: Search by AVS (exact match)
if (!empty($avs)) {
    // Clean AVS format (remove dots and spaces)
    $avsClean = preg_replace('/[.\s]/', '', $avs);

    // Search with both formats
    $avsFilter = urlencode("avs = '{$avs}' || avs = '{$avsClean}'");
    $response = pbRequest(
        "/api/collections/patients/records?filter={$avsFilter}&perPage=10",
        'GET',
        null,
        $adminToken
    );

    if ($response && !empty($response['items'])) {
        foreach ($response['items'] as $patient) {
            $matches[] = [
                'id' => $patient['id'],
                'nom' => $patient['nom'],
                'prenom' => $patient['prenom'],
                'dob' => $patient['dob'],
                'avs' => $patient['avs'] ?? '',
                'match_type' => 'avs',
                'match_score' => 100
            ];
        }
    }
}

// Priority 2: Search by DOB + name with normalization (if no AVS match or AVS not provided)
if (empty($matches) && !empty($dob)) {
    // Format date for PocketBase
    $dobFormatted = date('Y-m-d', strtotime($dob));

    // Fetch all patients with same DOB, then compare names with normalization
    $dobFilter = urlencode("dob = '{$dobFormatted}'");
    $response = pbRequest(
        "/api/collections/patients/records?filter={$dobFilter}&perPage=50",
        'GET',
        null,
        $adminToken
    );

    if ($response && !empty($response['items'])) {
        foreach ($response['items'] as $patient) {
            // Calculate match score with normalized comparison
            $score = 50; // Base score for DOB match

            $prenomMatch = !empty($prenom) && (
                normalizedContains($patient['prenom'], $prenom) ||
                normalizedContains($prenom, $patient['prenom'])
            );
            $nomMatch = !empty($nom) && (
                normalizedContains($patient['nom'], $nom) ||
                normalizedContains($nom, $patient['nom'])
            );

            if ($prenomMatch) {
                $score += 25;
            }
            if ($nomMatch) {
                $score += 25;
            }

            // Only include if at least one name part matches
            if (!$prenomMatch && !$nomMatch) {
                continue;
            }

            $matches[] = [
                'id' => $patient['id'],
                'nom' => $patient['nom'],
                'prenom' => $patient['prenom'],
                'dob' => $patient['dob'],
                'avs' => $patient['avs'] ?? '',
                'match_type' => 'dob_name',
                'match_score' => $score
            ];
        }
    }
}

// Sort by match score
usort($matches, function($a, $b) {
    return $b['match_score'] - $a['match_score'];
});

echo json_encode([
    'success' => true,
    'matches' => $matches,
    'exact_match' => count($matches) === 1 && $matches[0]['match_score'] === 100
]);
