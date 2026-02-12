<?php
// Shared helper functions

/**
 * Normalize a string for comparison (remove accents, lowercase, trim)
 * Used for patient name matching
 */
function normalizeString($str) {
    if (empty($str)) return '';

    // Convert to lowercase
    $str = mb_strtolower($str, 'UTF-8');

    // Remove accents using transliteration
    $accents = [
        'à' => 'a', 'á' => 'a', 'â' => 'a', 'ã' => 'a', 'ä' => 'a', 'å' => 'a', 'æ' => 'ae',
        'ç' => 'c',
        'è' => 'e', 'é' => 'e', 'ê' => 'e', 'ë' => 'e',
        'ì' => 'i', 'í' => 'i', 'î' => 'i', 'ï' => 'i',
        'ñ' => 'n',
        'ò' => 'o', 'ó' => 'o', 'ô' => 'o', 'õ' => 'o', 'ö' => 'o', 'ø' => 'o', 'œ' => 'oe',
        'ù' => 'u', 'ú' => 'u', 'û' => 'u', 'ü' => 'u',
        'ý' => 'y', 'ÿ' => 'y',
        'ß' => 'ss'
    ];
    $str = strtr($str, $accents);

    // Remove extra whitespace
    $str = preg_replace('/\s+/', ' ', $str);
    $str = trim($str);

    return $str;
}

/**
 * Compare two strings with normalization
 * Returns true if they match (ignoring accents, case)
 */
function stringsMatch($str1, $str2) {
    return normalizeString($str1) === normalizeString($str2);
}

/**
 * Check if normalized $needle is contained in normalized $haystack
 */
function normalizedContains($haystack, $needle) {
    if (empty($needle)) return true;
    return strpos(normalizeString($haystack), normalizeString($needle)) !== false;
}

/**
 * Normalize a phone number for comparison.
 * Strips formatting, removes +41/0041/leading 0, returns last 9 digits.
 */
function normalizePhone($phone) {
    if (empty($phone)) return '';

    // Strip all non-digit characters
    $digits = preg_replace('/\D/', '', $phone);

    // Remove country code: 41 (Swiss) or 0041
    if (str_starts_with($digits, '0041')) {
        $digits = substr($digits, 4);
    } elseif (str_starts_with($digits, '41') && strlen($digits) > 10) {
        $digits = substr($digits, 2);
    } elseif (str_starts_with($digits, '0')) {
        $digits = substr($digits, 1);
    }

    // Return last 9 digits (standard Swiss mobile/landline)
    return substr($digits, -9);
}

function corsHeaders() {
    // TODO: restrict when deployed — replace * with actual domains
    // $allowed = ['https://app.traveldoctor.ch', 'https://form.traveldoctor.ch'];
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');

    // Handle OPTIONS preflight and exit early
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(200);
        exit;
    }
}

/**
 * Verify caller is an authenticated practitioner via PocketBase token.
 * Expects: Authorization: Bearer <pb_auth_token>
 * Returns the user record (id, name, email, role) or exits with 401.
 */
function requireAuth() {
    $header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (!$header && function_exists('apache_request_headers')) {
        $apacheHeaders = apache_request_headers();
        $header = $apacheHeaders['Authorization'] ?? $apacheHeaders['authorization'] ?? '';
    }
    if (!preg_match('/^Bearer\s+(.+)$/i', $header, $matches)) {
        http_response_code(401);
        echo json_encode(['error' => 'Authentication required']);
        exit;
    }
    $token = $matches[1];
    $result = pbRequest('/api/collections/users/auth-refresh', 'POST', null, $token);
    if (!$result || !isset($result['record']['id'])) {
        http_response_code(401);
        echo json_encode(['error' => 'Invalid or expired token']);
        exit;
    }
    return $result['record'];
}

/**
 * Validate a PocketBase record ID (exactly 15 lowercase alphanumeric chars).
 * Prevents filter injection since validated IDs cannot contain quotes or operators.
 */
function validatePbId($id, $paramName = 'id') {
    if (!preg_match('/^[a-z0-9]{15}$/', $id)) {
        http_response_code(400);
        echo json_encode(['error' => "Invalid $paramName format"]);
        exit;
    }
    return $id;
}

/**
 * Sanitize a value before interpolating into a PocketBase filter string.
 * Strips single quotes and backslashes to prevent filter injection.
 */
function sanitizePbFilterValue($value) {
    return str_replace(["'", "\\"], '', $value);
}

function pbAdminAuth() {
    // PocketBase v0.20+ uses _superusers collection
    $response = pbRequest('/api/collections/_superusers/auth-with-password', 'POST', [
        'identity' => POCKETBASE_ADMIN_EMAIL,
        'password' => POCKETBASE_ADMIN_PASSWORD
    ]);

    return $response['token'] ?? null;
}

function pbRequest($endpoint, $method, $data = null, $authToken = null) {
    $url = POCKETBASE_URL . $endpoint;

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);

    $headers = ['Content-Type: application/json'];
    if ($authToken) {
        $headers[] = 'Authorization: ' . $authToken;
    }
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

    if ($data) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    }

    $response = curl_exec($ch);
    $error = curl_error($ch);
    curl_close($ch);

    if ($error) {
        error_log("PocketBase request error: $error");
        return null;
    }

    return json_decode($response, true);
}

function smtpMail($to, $subject, $message, $isHtml = false) {
    $subject = '=?UTF-8?B?' . base64_encode($subject) . '?=';

    $socket = @fsockopen(SMTP_HOST, SMTP_PORT, $errno, $errstr, 30);
    if (!$socket) {
        error_log("SMTP connection failed: $errstr ($errno)");
        return false;
    }

    // Helper to get response
    $getResponse = function() use ($socket) {
        $response = '';
        while ($line = fgets($socket, 512)) {
            $response .= $line;
            if (substr($line, 3, 1) === ' ') break;
        }
        return $response;
    };

    $sendCmd = function($cmd) use ($socket, $getResponse) {
        fwrite($socket, $cmd . "\r\n");
        return $getResponse();
    };

    // Get greeting
    $getResponse();

    // EHLO
    $sendCmd('EHLO ' . gethostname());

    // STARTTLS
    $sendCmd('STARTTLS');

    // Enable TLS
    if (!stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLSv1_2_CLIENT)) {
        error_log("SMTP TLS failed");
        fclose($socket);
        return false;
    }

    // EHLO again after TLS
    $sendCmd('EHLO ' . gethostname());

    // AUTH LOGIN
    $sendCmd('AUTH LOGIN');
    $sendCmd(base64_encode(SMTP_USER));
    $authResult = $sendCmd(base64_encode(SMTP_PASSWORD));

    if (strpos($authResult, '235') === false) {
        error_log("SMTP auth failed: $authResult");
        fclose($socket);
        return false;
    }

    // MAIL FROM
    $sendCmd('MAIL FROM:<' . SMTP_FROM_EMAIL . '>');

    // RCPT TO
    $sendCmd('RCPT TO:<' . $to . '>');

    // DATA
    $sendCmd('DATA');

    // Email content
    $email = "From: " . SMTP_FROM_NAME . " <" . SMTP_FROM_EMAIL . ">\r\n";
    $email .= "To: <" . $to . ">\r\n";
    $email .= "Subject: " . $subject . "\r\n";
    $email .= "MIME-Version: 1.0\r\n";
    $contentType = $isHtml ? "text/html" : "text/plain";
    $email .= "Content-Type: " . $contentType . "; charset=UTF-8\r\n";
    $email .= "Content-Transfer-Encoding: 8bit\r\n";
    $email .= "\r\n";
    $email .= $message;
    $email .= "\r\n.\r\n";

    fwrite($socket, $email);
    $dataResult = $getResponse();

    $sendCmd('QUIT');
    fclose($socket);

    return strpos($dataResult, '250') !== false;
}
