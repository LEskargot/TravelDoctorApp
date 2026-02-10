<?php
/**
 * Google Calendar API Helper
 * JWT-based authentication using service account (no google/apiclient needed)
 * Fetches calendar events via Google Calendar REST API
 */

require_once __DIR__ . '/config.php';

/**
 * Get a Google OAuth2 access token using service account JWT
 * Caches token in /tmp to avoid re-auth on every request
 */
function getGoogleAccessToken() {
    $cacheFile = sys_get_temp_dir() . '/google_cal_token.json';

    // Reuse cached token if still valid (< 50 min old)
    if (file_exists($cacheFile)) {
        $cached = json_decode(file_get_contents($cacheFile), true);
        if ($cached && isset($cached['access_token'], $cached['created_at'])) {
            if (time() - $cached['created_at'] < 3000) {
                return $cached['access_token'];
            }
        }
    }

    // Read service account key
    $keyPath = GOOGLE_SERVICE_ACCOUNT_KEY_PATH;
    if (!file_exists($keyPath)) {
        error_log("Google service account key not found: $keyPath");
        return null;
    }

    $sa = json_decode(file_get_contents($keyPath), true);
    if (!$sa || empty($sa['client_email']) || empty($sa['private_key'])) {
        error_log("Invalid Google service account key file");
        return null;
    }

    // Build JWT
    $now = time();
    $header = base64url_encode(json_encode(['alg' => 'RS256', 'typ' => 'JWT']));
    $claim = base64url_encode(json_encode([
        'iss' => $sa['client_email'],
        'scope' => 'https://www.googleapis.com/auth/calendar.readonly',
        'aud' => 'https://oauth2.googleapis.com/token',
        'iat' => $now,
        'exp' => $now + 3600
    ]));

    $signatureInput = "$header.$claim";
    $signature = '';
    if (!openssl_sign($signatureInput, $signature, $sa['private_key'], OPENSSL_ALGO_SHA256)) {
        error_log("Failed to sign JWT: " . openssl_error_string());
        return null;
    }

    $jwt = $signatureInput . '.' . base64url_encode($signature);

    // Exchange JWT for access token
    $ch = curl_init('https://oauth2.googleapis.com/token');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query([
        'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        'assertion' => $jwt
    ]));

    $response = curl_exec($ch);
    $error = curl_error($ch);
    curl_close($ch);

    if ($error) {
        error_log("Google token request failed: $error");
        return null;
    }

    $tokenData = json_decode($response, true);
    if (empty($tokenData['access_token'])) {
        error_log("Google token response error: " . ($tokenData['error_description'] ?? $response));
        return null;
    }

    // Cache the token
    file_put_contents($cacheFile, json_encode([
        'access_token' => $tokenData['access_token'],
        'created_at' => $now
    ]));

    return $tokenData['access_token'];
}

/**
 * Fetch calendar events for a date range
 * @param string $calendarId Google Calendar ID
 * @param string $dateFrom Start date in Y-m-d format
 * @param string|null $dateTo End date in Y-m-d format (defaults to same as dateFrom)
 * @return array|null Array of parsed events, or null on error
 */
function fetchCalendarEvents($calendarId, $dateFrom, $dateTo = null) {
    $token = getGoogleAccessToken();
    if (!$token) {
        return null;
    }

    if (!$dateTo) {
        $dateTo = $dateFrom;
    }

    // Build time range in Europe/Zurich timezone
    $tz = new DateTimeZone('Europe/Zurich');
    $dayStart = new DateTime("$dateFrom 00:00:00", $tz);
    $dayEnd = new DateTime("$dateTo 23:59:59", $tz);

    $params = http_build_query([
        'timeMin' => $dayStart->format('c'),
        'timeMax' => $dayEnd->format('c'),
        'singleEvents' => 'true',
        'orderBy' => 'startTime',
        'maxResults' => 250
    ]);

    $url = 'https://www.googleapis.com/calendar/v3/calendars/' . urlencode($calendarId) . "/events?$params";

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        "Authorization: Bearer $token"
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);

    if ($error) {
        error_log("Google Calendar API error: $error");
        return null;
    }

    if ($httpCode !== 200) {
        error_log("Google Calendar API HTTP $httpCode: $response");
        return null;
    }

    $data = json_decode($response, true);
    if (!isset($data['items'])) {
        return [];
    }

    $events = [];
    foreach ($data['items'] as $item) {
        // Skip cancelled events
        if (($item['status'] ?? '') === 'cancelled') {
            continue;
        }

        // Only include OneDoc events (title starts with [OD])
        $summary = $item['summary'] ?? '';
        if (stripos($summary, '[OD]') !== 0) {
            continue;
        }

        $parsed = parseCalendarEvent($item);
        if ($parsed) {
            $events[] = $parsed;
        }
    }

    return $events;
}

/**
 * Parse a single Google Calendar event into our format
 */
function parseCalendarEvent($item) {
    $summary = $item['summary'] ?? '';
    $description = $item['description'] ?? '';

    // Extract appointment time from start
    $appointmentTime = '';
    $appointmentDate = '';
    if (!empty($item['start']['dateTime'])) {
        $dt = new DateTime($item['start']['dateTime']);
        $dt->setTimezone(new DateTimeZone('Europe/Zurich'));
        $appointmentTime = $dt->format('H:i');
        $appointmentDate = $dt->format('Y-m-d');
    } elseif (!empty($item['start']['date'])) {
        $appointmentDate = $item['start']['date'];
    }

    // Parse description for patient details
    $parsed = parseEventDescription($description);

    // Patient name from description (structured OneDoc block), fall back to title
    $patientName = $parsed['patient_name'];
    if (empty($patientName)) {
        $patientName = trim(preg_replace('/^\[OD\]\s*-?\s*/i', '', $summary));
    }

    return [
        'patient_name' => $patientName,
        'appointment_date' => $appointmentDate,
        'appointment_time' => $appointmentTime,
        'sex' => $parsed['sex'],
        'dob' => $parsed['dob'],
        'email' => $parsed['email'],
        'phone' => $parsed['phone'],
        'calendar_event_id' => $item['id'] ?? '',
        'source' => 'calendar'
    ];
}

/**
 * Parse event description text for patient details
 * OneDoc typically includes: sex, DOB, email, phone in the event description
 */
function parseEventDescription($text) {
    $result = [
        'patient_name' => '',
        'sex' => '',
        'dob' => '',
        'email' => '',
        'phone' => ''
    ];

    if (empty($text)) {
        return $result;
    }

    // Strip HTML tags (Google Calendar descriptions can contain HTML)
    $text = strip_tags(str_replace(['<br>', '<br/>', '<br />'], "\n", $text));
    // Decode HTML entities
    $text = html_entity_decode($text, ENT_QUOTES, 'UTF-8');

    // Parse structured [OneDoc] block:
    // [OneDoc]\nAppointment type\n----------\nFirstName\nLastName\nsex\nDOB\nemail\nphone\n[/OneDoc]
    if (preg_match('/\[OneDoc\](.*?)\[\/OneDoc\]/si', $text, $block)) {
        $lines = array_values(array_filter(array_map('trim', explode("\n", $block[1])), function($l) {
            return $l !== '';
        }));
        // Find separator line position
        $sepIndex = -1;
        foreach ($lines as $i => $line) {
            if (preg_match('/^-{3,}$/', $line)) {
                $sepIndex = $i;
                break;
            }
        }
        // Extract all fields positionally: +1 firstName, +2 lastName, +3 sex, +4 DOB, +5 email, +6 phone
        if ($sepIndex >= 0 && isset($lines[$sepIndex + 1], $lines[$sepIndex + 2])) {
            $result['patient_name'] = trim($lines[$sepIndex + 1] . ' ' . $lines[$sepIndex + 2]);

            if (isset($lines[$sepIndex + 3])) {
                $sexLine = $lines[$sepIndex + 3];
                if (preg_match('/^(M|Homme|Masculin|Male|Mr\.?)$/i', $sexLine)) {
                    $result['sex'] = 'Homme';
                } elseif (preg_match('/^(F|Femme|Féminin|Female|Mme\.?|Madame)$/i', $sexLine)) {
                    $result['sex'] = 'Femme';
                }
            }
            if (isset($lines[$sepIndex + 4])) {
                if (preg_match('/(\d{2})[.\/-](\d{2})[.\/-](\d{4})/', $lines[$sepIndex + 4], $dm)) {
                    $result['dob'] = $dm[3] . '-' . $dm[2] . '-' . $dm[1];
                }
            }
            if (isset($lines[$sepIndex + 5])) {
                if (preg_match('/[\w.+-]+@[\w.-]+\.\w{2,}/', $lines[$sepIndex + 5], $em)) {
                    $result['email'] = $em[0];
                }
            }
            if (isset($lines[$sepIndex + 6])) {
                $phoneLine = $lines[$sepIndex + 6];
                if (!empty($phoneLine)) {
                    $result['phone'] = trim(preg_replace('/\s+/', ' ', $phoneLine));
                }
            }
        }

        return $result;
    }

    // Fallback: unstructured description — use regex
    if (preg_match('/[\w.+-]+@[\w.-]+\.\w{2,}/', $text, $m)) {
        $result['email'] = $m[0];
    }

    if (preg_match('/(\d{2})[.\/-](\d{2})[.\/-](\d{4})/', $text, $dobMatch)) {
        $result['dob'] = $dobMatch[3] . '-' . $dobMatch[2] . '-' . $dobMatch[1];
        // Strip DOB from text before phone regex to avoid false match
        $text = str_replace($dobMatch[0], '', $text);
    }

    if (preg_match('/(\+?\d[\d\s.\-()]{8,})/', $text, $pm)) {
        $result['phone'] = trim(preg_replace('/\s+/', ' ', $pm[1]));
    }

    if (preg_match('/\b(Homme|Masculin|Male|Mr\.?)\b/i', $text)) {
        $result['sex'] = 'Homme';
    } elseif (preg_match('/\b(Femme|Féminin|Female|Mme\.?|Madame)\b/i', $text)) {
        $result['sex'] = 'Femme';
    } elseif (preg_match('/\bM\b/', $text)) {
        $result['sex'] = 'Homme';
    } elseif (preg_match('/\bF\b/', $text)) {
        $result['sex'] = 'Femme';
    }

    return $result;
}

/**
 * Base64url encode (JWT-safe base64)
 */
function base64url_encode($data) {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}
