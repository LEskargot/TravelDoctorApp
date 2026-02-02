<?php
/**
 * File Upload API Endpoint
 * Handles vaccination document uploads (PDF & images)
 */

require_once 'config.php';
require_once 'helpers.php';

header('Content-Type: application/json');
corsHeaders();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

// Configuration
$maxFiles = 10;
$maxFileSize = 10 * 1024 * 1024; // 10 MB
$allowedTypes = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/heic',
    'image/heif'
];
$allowedExtensions = ['pdf', 'jpg', 'jpeg', 'png', 'heic', 'heif'];

// Check if files were uploaded
if (empty($_FILES['files'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Aucun fichier reçu']);
    exit;
}

$files = $_FILES['files'];
$token = $_POST['token'] ?? '';

// Authenticate with PocketBase
$adminToken = pbAdminAuth();
if (!$adminToken) {
    http_response_code(500);
    echo json_encode(['error' => 'Erreur de connexion à la base de données']);
    exit;
}

// Process uploaded files
$uploadedFileIds = [];
$errors = [];

// Handle both single and multiple file uploads
$fileCount = is_array($files['name']) ? count($files['name']) : 1;

if ($fileCount > $maxFiles) {
    http_response_code(400);
    echo json_encode(['error' => "Maximum {$maxFiles} fichiers autorisés"]);
    exit;
}

for ($i = 0; $i < $fileCount; $i++) {
    // Get file info (handle both single and multiple)
    $fileName = is_array($files['name']) ? $files['name'][$i] : $files['name'];
    $fileTmpName = is_array($files['tmp_name']) ? $files['tmp_name'][$i] : $files['tmp_name'];
    $fileSize = is_array($files['size']) ? $files['size'][$i] : $files['size'];
    $fileType = is_array($files['type']) ? $files['type'][$i] : $files['type'];
    $fileError = is_array($files['error']) ? $files['error'][$i] : $files['error'];

    // Skip empty files
    if (empty($fileName) || $fileError === UPLOAD_ERR_NO_FILE) {
        continue;
    }

    // Check for upload errors
    if ($fileError !== UPLOAD_ERR_OK) {
        $errors[] = "Erreur lors du téléchargement de {$fileName}";
        continue;
    }

    // Check file size
    if ($fileSize > $maxFileSize) {
        $errors[] = "Le fichier {$fileName} dépasse la taille maximale de 10 MB";
        continue;
    }

    // Check file extension
    $extension = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));
    if (!in_array($extension, $allowedExtensions)) {
        $errors[] = "Type de fichier non autorisé: {$fileName}";
        continue;
    }

    // Check MIME type (allow HEIC/HEIF which may report as application/octet-stream)
    if (!in_array($fileType, $allowedTypes) &&
        !in_array($extension, ['heic', 'heif'])) {
        // Double-check with finfo
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $detectedType = finfo_file($finfo, $fileTmpName);
        finfo_close($finfo);

        if (!in_array($detectedType, $allowedTypes) &&
            !in_array($extension, ['heic', 'heif'])) {
            $errors[] = "Type MIME non autorisé: {$fileName}";
            continue;
        }
    }

    // Upload to PocketBase
    $fileId = uploadToPocketBase($fileTmpName, $fileName, $adminToken);

    if ($fileId) {
        $uploadedFileIds[] = $fileId;
    } else {
        $errors[] = "Échec du téléchargement de {$fileName}";
    }
}

// Return results
if (count($uploadedFileIds) > 0) {
    $response = [
        'success' => true,
        'file_ids' => $uploadedFileIds,
        'count' => count($uploadedFileIds)
    ];

    if (!empty($errors)) {
        $response['warnings'] = $errors;
    }

    echo json_encode($response);
} else {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => 'Aucun fichier n\'a pu être téléchargé',
        'details' => $errors
    ]);
}

/**
 * Upload file to PocketBase storage
 */
function uploadToPocketBase($tmpPath, $fileName, $adminToken) {
    $url = POCKETBASE_URL . '/api/collections/vaccination_files/records';

    // Create a unique filename
    $uniqueName = uniqid() . '_' . preg_replace('/[^a-zA-Z0-9._-]/', '_', $fileName);

    // Prepare multipart form data
    $boundary = uniqid();
    $delimiter = '-------------' . $boundary;

    $fileContent = file_get_contents($tmpPath);
    $extension = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));

    // Determine MIME type
    $mimeTypes = [
        'pdf' => 'application/pdf',
        'jpg' => 'image/jpeg',
        'jpeg' => 'image/jpeg',
        'png' => 'image/png',
        'heic' => 'image/heic',
        'heif' => 'image/heif'
    ];
    $mimeType = $mimeTypes[$extension] ?? 'application/octet-stream';

    // Build multipart body
    $body = '';

    // Add original_name field
    $body .= "--{$delimiter}\r\n";
    $body .= "Content-Disposition: form-data; name=\"original_name\"\r\n\r\n";
    $body .= $fileName . "\r\n";

    // Add file field
    $body .= "--{$delimiter}\r\n";
    $body .= "Content-Disposition: form-data; name=\"file\"; filename=\"{$uniqueName}\"\r\n";
    $body .= "Content-Type: {$mimeType}\r\n\r\n";
    $body .= $fileContent . "\r\n";

    $body .= "--{$delimiter}--\r\n";

    // Make request
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Authorization: ' . $adminToken,
        'Content-Type: multipart/form-data; boundary=' . $delimiter,
        'Content-Length: ' . strlen($body)
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);

    if ($error) {
        error_log("PocketBase upload error: $error");
        return null;
    }

    $result = json_decode($response, true);

    if ($httpCode === 200 && isset($result['id'])) {
        return $result['id'];
    }

    error_log("PocketBase upload failed: " . $response);
    return null;
}
