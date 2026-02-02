<?php
// Shared helper functions

function corsHeaders() {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
}

function pbAdminAuth() {
    $response = pbRequest('/api/admins/auth-with-password', 'POST', [
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

function smtpMail($to, $subject, $message) {
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
    $email .= "Content-Type: text/plain; charset=UTF-8\r\n";
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
