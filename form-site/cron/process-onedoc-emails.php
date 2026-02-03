<?php
/**
 * OneDoc Email Processor
 *
 * Monitors inbox for OneDoc booking notifications and sends
 * prefilled form invitations to patients.
 *
 * Run via cron every 2-3 minutes:
 * php /path/to/process-onedoc-emails.php
 */

// Load composer autoload
require_once __DIR__ . '/../vendor/autoload.php';

require_once __DIR__ . '/../api/config.php';
require_once __DIR__ . '/../api/helpers.php';
require_once __DIR__ . '/../api/encryption.php';

use Webklex\PHPIMAP\ClientManager;

// IMAP Configuration (Infomaniak)
define('IMAP_HOST', 'mail.infomaniak.com');
define('IMAP_PORT', 993);
define('IMAP_USER', SMTP_USER); // Same as SMTP: contact@traveldoctor.ch
define('IMAP_PASSWORD', SMTP_PASSWORD);
define('IMAP_FOLDER', 'Notifications RDV OneDoc');

// OneDoc subject patterns to filter
define('ONEDOC_SUBJECTS', ['Nouveau RDV en ligne', 'Nouvelle consultation vidéo en ligne']);

// Lock file to prevent concurrent runs
define('LOCK_FILE', sys_get_temp_dir() . '/onedoc_processor.lock');

/**
 * Main execution
 */
function main() {
    // Prevent concurrent execution
    if (!acquireLock()) {
        logMessage("Another instance is running. Exiting.");
        exit(0);
    }

    try {
        logMessage("Starting OneDoc email processor...");

        // Connect to IMAP
        $client = connectImap();
        if (!$client) {
            throw new Exception("Failed to connect to IMAP server");
        }

        // Get inbox folder
        $folder = $client->getFolder(IMAP_FOLDER);
        if (!$folder) {
            throw new Exception("Failed to open INBOX");
        }

        // Search for emails matching OneDoc subject patterns (including read, for testing)
        $allEmails = $folder->query()
            ->all()
            ->get();

        // Filter by subject
        $emails = [];
        foreach ($allEmails as $email) {
            $subject = $email->getSubject();
            foreach (ONEDOC_SUBJECTS as $pattern) {
                if (stripos($subject, $pattern) !== false) {
                    $emails[] = $email;
                    break;
                }
            }
        }

        if (count($emails) === 0) {
            logMessage("No new OneDoc emails found.");
            $client->disconnect();
            releaseLock();
            return;
        }

        logMessage("Found " . count($emails) . " new OneDoc email(s).");

        foreach ($emails as $email) {
            try {
                processEmail($email);
            } catch (Exception $e) {
                logMessage("Error processing email: " . $e->getMessage());
            }
        }

        $client->disconnect();
        logMessage("Processing complete.");

    } catch (Exception $e) {
        logMessage("Fatal error: " . $e->getMessage());
    }

    releaseLock();
}

/**
 * Connect to IMAP server using webklex/php-imap
 */
function connectImap() {
    try {
        $cm = new ClientManager();

        $client = $cm->make([
            'host'          => IMAP_HOST,
            'port'          => IMAP_PORT,
            'encryption'    => 'ssl',
            'validate_cert' => true,
            'username'      => IMAP_USER,
            'password'      => IMAP_PASSWORD,
            'protocol'      => 'imap'
        ]);

        $client->connect();

        if (!$client->isConnected()) {
            logMessage("IMAP connection failed");
            return false;
        }

        logMessage("IMAP connected successfully");
        return $client;

    } catch (Exception $e) {
        logMessage("IMAP connection error: " . $e->getMessage());
        return false;
    }
}

/**
 * Process a single OneDoc email
 */
function processEmail($email) {
    $subject = $email->getSubject();
    logMessage("Processing email: $subject");

    // Get email body (prefer plain text)
    $body = $email->getTextBody();
    if (empty($body)) {
        $body = strip_tags($email->getHTMLBody());
    }

    if (empty($body)) {
        throw new Exception("Could not extract email body");
    }

    // Parse patient data from email
    $patientData = parseOnedocEmail($body);

    if (empty($patientData['email'])) {
        throw new Exception("Could not extract patient email");
    }

    logMessage("Extracted patient: " . $patientData['name'] . " <" . $patientData['email'] . ">");

    // Check if we already sent a form for this patient + appointment combination
    $appointmentKey = $patientData['appointment_date'] . ' ' . $patientData['appointment_time'];
    if (formAlreadySent($patientData['email'], $appointmentKey)) {
        logMessage("Form already sent to " . $patientData['email'] . " for appointment $appointmentKey. Skipping.");
        $email->setFlag('Seen');
        return;
    }

    // Create prefilled form draft
    $editToken = createPrefilledForm($patientData);

    if (!$editToken) {
        throw new Exception("Failed to create prefilled form");
    }

    // Send invitation email to patient
    $sent = sendFormInvitation($patientData, $editToken);

    if ($sent) {
        logMessage("Form invitation sent to " . $patientData['email']);
        // Mark email as read
        $email->setFlag('Seen');
    } else {
        throw new Exception("Failed to send invitation email");
    }
}

/**
 * Parse OneDoc email to extract patient data
 */
function parseOnedocEmail($body) {
    $data = [
        'name' => '',
        'firstname' => '',
        'lastname' => '',
        'birthdate' => '',
        'phone' => '',
        'email' => '',
        'insurance_card_number' => '', // Full 20-digit insurance card number
        'avs' => '', // Extracted AVS (756.XXXX.XXXX.XX format)
        'address' => '',
        'street' => '',
        'postal_code' => '',
        'city' => '',
        'appointment_date' => '',
        'appointment_time' => '',
        'consultation_type' => '',
        'location' => '',
        'travel_notes' => ''
    ];

    // Split into lines
    $lines = explode("\n", $body);
    $inPatientSection = false;
    $patientLines = [];
    $appointmentLines = [];

    foreach ($lines as $line) {
        $line = trim($line);

        // Detect sections
        if (strpos($line, 'Informations sur le patient') !== false) {
            $inPatientSection = true;
            continue;
        }

        if (strpos($line, 'nouveau rendez-vous') !== false) {
            $inPatientSection = false;
            continue;
        }

        // Collect lines starting with "- "
        if (strpos($line, '- ') === 0) {
            $value = trim(substr($line, 2));
            if ($inPatientSection) {
                $patientLines[] = $value;
            } else {
                $appointmentLines[] = $value;
            }
        }
    }

    // Parse appointment info
    foreach ($appointmentLines as $index => $line) {
        // First line is usually date/time: "Jeudi 5 février 2026 à 15:15"
        if ($index === 0 && preg_match('/(\d{1,2})\s+(\w+)\s+(\d{4})\s+à\s+(\d{1,2}:\d{2})/', $line, $matches)) {
            $data['appointment_date'] = $matches[1] . ' ' . $matches[2] . ' ' . $matches[3];
            $data['appointment_time'] = $matches[4];
        }
        // Second line is consultation type
        elseif ($index === 1) {
            $data['consultation_type'] = $line;
        }
        // Third line is location
        elseif ($index === 2) {
            $data['location'] = $line;
        }
        // Lines after that might be travel notes
        elseif ($index > 3 && !empty($line)) {
            $data['travel_notes'] = $line;
        }
    }

    // Parse patient info (order: name, birthdate, phone, email, AVS, address)
    foreach ($patientLines as $index => $line) {
        switch ($index) {
            case 0: // Name: "Nina SAGER"
                $data['name'] = $line;
                $nameParts = explode(' ', $line, 2);
                $data['firstname'] = $nameParts[0] ?? '';
                $data['lastname'] = $nameParts[1] ?? '';
                break;

            case 1: // Birthdate: "21.08.2002"
                $data['birthdate'] = $line;
                // Convert to ISO format
                if (preg_match('/(\d{2})\.(\d{2})\.(\d{4})/', $line, $matches)) {
                    $data['birthdate_iso'] = $matches[3] . '-' . $matches[2] . '-' . $matches[1];
                }
                break;

            case 2: // Phone: "079 454 97 02"
                $data['phone'] = $line;
                break;

            case 3: // Email
                $data['email'] = $line;
                break;

            case 4: // Insurance card number: "80756013840033231589"
                $data['insurance_card_number'] = preg_replace('/[^\d]/', '', $line);
                // Extract AVS from insurance card number
                $data['avs'] = extractAvsFromInsuranceCard($data['insurance_card_number']);
                break;

            case 5: // Address: "Route de Reynet 4, 1615 Bossonnens"
                $data['address'] = $line;
                // Try to parse address
                if (preg_match('/^(.+),\s*(\d{4})\s+(.+)$/', $line, $matches)) {
                    $data['street'] = trim($matches[1]);
                    $data['postal_code'] = $matches[2];
                    $data['city'] = trim($matches[3]);
                }
                break;
        }
    }

    return $data;
}

/**
 * Extract AVS number from Swiss insurance card number
 * Insurance card format (20 digits): 80 + AVS(13 digits) + sequence(5 digits)
 * AVS format: 756.XXXX.XXXX.XX (13 digits)
 */
function extractAvsFromInsuranceCard($cardNumber) {
    $cardNumber = preg_replace('/[^\d]/', '', $cardNumber);

    // 20-digit insurance card: extract AVS from positions 2-14
    if (strlen($cardNumber) === 20 && substr($cardNumber, 0, 2) === '80') {
        $avs = substr($cardNumber, 2, 13); // Get 13-digit AVS
        return formatAvs($avs);
    }

    // Already a 13-digit AVS
    if (strlen($cardNumber) === 13) {
        return formatAvs($cardNumber);
    }

    return $cardNumber;
}

/**
 * Format AVS number with dots: 756.1234.5678.90
 */
function formatAvs($avs) {
    $avs = preg_replace('/[^\d]/', '', $avs);
    if (strlen($avs) === 13) {
        return substr($avs, 0, 3) . '.' . substr($avs, 3, 4) . '.' . substr($avs, 7, 4) . '.' . substr($avs, 11, 2);
    }
    return $avs;
}

/**
 * Check if we already sent a form for this email + appointment combination
 * This allows the same patient to have multiple appointments
 */
function formAlreadySent($email, $appointmentKey) {
    $adminToken = pbAdminAuth();
    if (!$adminToken) return false;

    // Check for forms from OneDoc source (no time limit - appointment is the unique key)
    $filter = urlencode("source = 'onedoc' && email_encrypted != ''");

    $response = pbRequest(
        "/api/collections/patient_forms/records?filter=$filter&perPage=500&sort=-created",
        'GET',
        null,
        $adminToken
    );

    if (!$response || empty($response['items'])) {
        return false;
    }

    // Check each form's decrypted email AND appointment
    foreach ($response['items'] as $form) {
        if (!empty($form['email_encrypted'])) {
            $formEmail = decryptData($form['email_encrypted']);
            if (strtolower($formEmail) === strtolower($email)) {
                // Email matches, now check appointment
                if (!empty($form['form_data_encrypted'])) {
                    $formData = decryptFormData($form['form_data_encrypted']);
                    $formAppointment = $formData['onedoc_appointment'] ?? '';
                    if ($formAppointment === $appointmentKey) {
                        return true; // Same email AND same appointment = duplicate
                    }
                }
            }
        }
    }

    return false;
}

/**
 * Create a prefilled form in the database
 */
function createPrefilledForm($patientData) {
    $adminToken = pbAdminAuth();
    if (!$adminToken) {
        logMessage("Failed to authenticate with PocketBase");
        return false;
    }

    // Generate edit token
    $editToken = bin2hex(random_bytes(32));

    // Prepare form data
    $formData = [
        'full_name' => $patientData['name'],
        'birthdate' => $patientData['birthdate_iso'] ?? '',
        'email' => $patientData['email'],
        'phone' => $patientData['phone'],
        'street' => $patientData['street'],
        'postal_code' => $patientData['postal_code'],
        'city' => $patientData['city'],
        'insurance_card_number' => $patientData['insurance_card_number'],
        // Travel notes can be used as a hint for destinations
        'onedoc_notes' => $patientData['travel_notes'],
        'onedoc_appointment' => $patientData['appointment_date'] . ' ' . $patientData['appointment_time'],
        'onedoc_consultation' => $patientData['consultation_type'],
        'onedoc_location' => $patientData['location']
    ];

    // Create form record with encrypted data
    $formRecord = [
        'edit_token' => $editToken,
        'patient_name_encrypted' => encryptData($patientData['name']),
        'email_encrypted' => encryptData($patientData['email']),
        'avs_encrypted' => !empty($patientData['avs']) ? encryptData($patientData['avs']) : '',
        'insurance_card_encrypted' => !empty($patientData['insurance_card_number']) ? encryptData($patientData['insurance_card_number']) : '',
        'form_data_encrypted' => encryptFormData($formData),
        'language' => 'fr',
        'source' => 'onedoc',
        'status' => 'draft' // Not submitted yet, waiting for patient
    ];

    $response = pbRequest(
        '/api/collections/patient_forms/records',
        'POST',
        $formRecord,
        $adminToken
    );

    if (!$response || isset($response['code'])) {
        logMessage("Failed to create form record: " . json_encode($response));
        return false;
    }

    return $editToken;
}

/**
 * Send form invitation email to patient
 */
function sendFormInvitation($patientData, $editToken) {
    $formLink = FORM_URL . '/?edit=' . $editToken;

    $subject = 'Travel Doctor - Votre formulaire patient';

    $message = "Bonjour " . $patientData['firstname'] . ",\r\n\r\n";
    $message .= "Suite à votre prise de rendez-vous, nous vous invitons à compléter votre formulaire patient en ligne.\r\n\r\n";
    $message .= "Vos informations ont été pré-remplies. Merci de les vérifier et de compléter les sections manquantes.\r\n\r\n";
    $message .= "Cliquez sur ce lien pour accéder à votre formulaire:\r\n";
    $message .= $formLink . "\r\n\r\n";
    $message .= "Ce formulaire nous permettra de préparer au mieux votre consultation.\r\n\r\n";
    $message .= "Cordialement,\r\n";
    $message .= "Travel Doctor";

    return smtpMail($patientData['email'], $subject, $message);
}

/**
 * Acquire lock to prevent concurrent execution
 */
function acquireLock() {
    $fp = fopen(LOCK_FILE, 'c');
    if (!$fp) return false;

    if (!flock($fp, LOCK_EX | LOCK_NB)) {
        fclose($fp);
        return false;
    }

    // Store file pointer for later release
    $GLOBALS['lock_fp'] = $fp;
    return true;
}

/**
 * Release lock
 */
function releaseLock() {
    if (isset($GLOBALS['lock_fp'])) {
        flock($GLOBALS['lock_fp'], LOCK_UN);
        fclose($GLOBALS['lock_fp']);
        @unlink(LOCK_FILE);
    }
}

/**
 * Log message with timestamp
 */
function logMessage($message) {
    $timestamp = date('Y-m-d H:i:s');
    echo "[$timestamp] $message\n";

    // Also log to file
    $logDir = __DIR__ . '/logs';
    if (!is_dir($logDir)) {
        @mkdir($logDir, 0755, true);
    }
    $logFile = $logDir . '/onedoc-processor.log';
    file_put_contents($logFile, "[$timestamp] $message\n", FILE_APPEND);
}

// Run
main();
