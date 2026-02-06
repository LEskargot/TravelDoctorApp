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
define('IMAP_FOLDER', 'OneDoc');

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

        // Get all emails in folder
        $allEmails = $folder->query()
            ->all()
            ->get();

        logMessage("Total emails in folder: " . $allEmails->count());

        // Filter by subject
        $emails = [];
        foreach ($allEmails as $email) {
            $subject = $email->getSubject();
            // Decode MIME-encoded subject (=?UTF-8?Q?...?=)
            $decodedSubject = iconv_mime_decode($subject, ICONV_MIME_DECODE_CONTINUE_ON_ERROR, 'UTF-8');
            if ($decodedSubject === false) {
                $decodedSubject = $subject;
            }
            foreach (ONEDOC_SUBJECTS as $pattern) {
                if (stripos($decodedSubject, $pattern) !== false) {
                    $emails[] = $email;
                    break;
                }
            }
        }

        if (count($emails) === 0) {
            logMessage("No matching OneDoc emails found.");
            $client->disconnect();
            releaseLock();
            return;
        }

        logMessage("Found " . count($emails) . " matching email(s).");

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

    // Get email body (prefer HTML for parsing)
    $body = $email->getHTMLBody();
    if (empty($body)) {
        throw new Exception("Could not extract email HTML body");
    }

    // Parse patient data from email
    $patientData = parseOnedocEmail($body);

    // Debug: log all extracted data
    logMessage("Extracted data:");
    logMessage("  - Name: " . $patientData['name']);
    logMessage("  - Email: " . $patientData['email']);
    logMessage("  - Phone: " . $patientData['phone']);
    logMessage("  - Birthdate: " . $patientData['birthdate']);
    logMessage("  - Address: " . $patientData['address']);
    logMessage("  - Insurance: " . $patientData['insurance_card_number']);
    logMessage("  - AVS: " . $patientData['avs']);
    logMessage("  - Appointment: " . $patientData['appointment_date'] . " " . $patientData['appointment_time']);
    logMessage("  - Location: " . $patientData['location']);
    logMessage("  - Consultation: " . $patientData['consultation_type']);
    logMessage("  - Travel notes: " . $patientData['travel_notes']);

    if (empty($patientData['email'])) {
        throw new Exception("Could not extract patient email");
    }

    // DISABLED FOR TESTING: duplicate check
    // $appointmentKey = $patientData['appointment_date'] . ' ' . $patientData['appointment_time'];
    // if (formAlreadySent($patientData['email'], $appointmentKey)) {
    //     logMessage("Form already sent to " . $patientData['email'] . " for appointment $appointmentKey. Skipping.");
    //     $email->setFlag('Seen');
    //     return;
    // }

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
 * Uses HTML body and identifies fields by icon images
 */
function parseOnedocEmail($body) {
    $data = [
        'name' => '',
        'firstname' => '',
        'lastname' => '',
        'birthdate' => '',
        'phone' => '',
        'email' => '',
        'insurance_card_number' => '',
        'avs' => '',
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

    // Map icon images to field names
    $iconMap = [
        'fa-calendar' => 'datetime',
        'fa-stethoscope' => 'consultation_type',
        'fa-hospital' => 'location',
        'fa-info' => 'travel_notes',
        'fa-user.png' => 'name',
        'fa-birthday' => 'birthdate',
        'fa-phone' => 'phone',
        'fa-envelope' => 'email',
        'fa-id-card' => 'insurance',
        'fa-map' => 'address'
    ];

    // Find all table rows with icons
    preg_match_all('/<img[^>]+src="[^"]*\/([^"\/]+\.png)"[^>]*>.*?<\/td>\s*<td[^>]*>(.*?)<\/td>/is', $body, $matches, PREG_SET_ORDER);

    foreach ($matches as $match) {
        $icon = $match[1];
        $value = trim(strip_tags(html_entity_decode($match[2], ENT_QUOTES, 'UTF-8')));
        $value = preg_replace('/\s+/', ' ', $value); // Normalize whitespace

        // Find which field this icon maps to
        foreach ($iconMap as $iconPattern => $field) {
            if (stripos($icon, $iconPattern) !== false || stripos($icon, str_replace('.png', '', $iconPattern)) !== false) {
                switch ($field) {
                    case 'datetime':
                        // Parse "Jeudi 5 février 2026 à 12:35"
                        if (preg_match('/(\d{1,2})\s+(\w+)\s+(\d{4})\s+[àa]\s*(\d{1,2}:\d{2})/', $value, $m)) {
                            $data['appointment_date'] = $m[1] . ' ' . $m[2] . ' ' . $m[3];
                            $data['appointment_time'] = $m[4];
                        }
                        break;

                    case 'consultation_type':
                        $data['consultation_type'] = $value;
                        break;

                    case 'location':
                        $data['location'] = $value;
                        break;

                    case 'travel_notes':
                        $data['travel_notes'] = $value;
                        break;

                    case 'name':
                        $data['name'] = $value;
                        $nameParts = explode(' ', $value, 2);
                        $data['firstname'] = $nameParts[0] ?? '';
                        $data['lastname'] = $nameParts[1] ?? '';
                        break;

                    case 'birthdate':
                        $data['birthdate'] = $value;
                        if (preg_match('/(\d{2})\.(\d{2})\.(\d{4})/', $value, $m)) {
                            $data['birthdate_iso'] = $m[3] . '-' . $m[2] . '-' . $m[1];
                        }
                        break;

                    case 'phone':
                        $data['phone'] = $value;
                        break;

                    case 'email':
                        // Extract email from value (might contain mailto: link text)
                        if (preg_match('/[\w.+-]+@[\w.-]+\.\w+/', $value, $m)) {
                            $data['email'] = $m[0];
                        } else {
                            $data['email'] = $value;
                        }
                        break;

                    case 'insurance':
                        $data['insurance_card_number'] = preg_replace('/[^\d]/', '', $value);
                        $data['avs'] = extractAvsFromInsuranceCard($data['insurance_card_number']);
                        break;

                    case 'address':
                        $data['address'] = $value;
                        if (preg_match('/^(.+),\s*(\d{4})\s+(.+)$/', $value, $m)) {
                            $data['street'] = trim($m[1]);
                            $data['postal_code'] = $m[2];
                            $data['city'] = trim($m[3]);
                        }
                        break;
                }
                break;
            }
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
    // Build KoBoToolbox prefilled URL
    $formLink = buildKoboUrl($patientData);

    $subject = 'Travel Doctor - Votre formulaire patient';

    $firstName = htmlspecialchars($patientData['firstname']);
    $appointmentInfo = '';
    if (!empty($patientData['appointment_date'])) {
        $appointmentInfo = htmlspecialchars($patientData['appointment_date']);
        if (!empty($patientData['appointment_time'])) {
            $appointmentInfo .= ' à ' . htmlspecialchars($patientData['appointment_time']);
        }
    }

    $message = '<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; background-color: #f4f4f4;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f4; padding: 20px 0;">
        <tr>
            <td align="center">
                <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="background-color: #2c5282; padding: 30px 40px; text-align: center;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Travel Doctor</h1>
                        </td>
                    </tr>
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px;">
                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                Bonjour ' . $firstName . ',
                            </p>
                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                Suite à votre prise de rendez-vous' . ($appointmentInfo ? ' du <strong>' . $appointmentInfo . '</strong>' : '') . ', nous vous invitons à compléter votre formulaire patient en ligne.
                            </p>
                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                                Vos informations ont été pré-remplies. Merci de les vérifier et de compléter les sections manquantes.
                            </p>
                            <!-- Button -->
                            <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto 30px auto;">
                                <tr>
                                    <td style="background-color: #38a169; border-radius: 6px;">
                                        <a href="' . htmlspecialchars($formLink) . '" target="_blank" style="display: inline-block; padding: 16px 32px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: bold;">
                                            Remplir le formulaire
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
                                Ce formulaire nous permettra de préparer au mieux votre consultation.
                            </p>
                            <!-- Group travel notice -->
                            <div style="background-color: #ebf8ff; border-left: 4px solid #2c5282; padding: 15px 20px; margin: 0 0 20px 0;">
                                <p style="color: #2c5282; font-size: 14px; line-height: 1.6; margin: 0 0 12px 0;">
                                    <strong>Vous voyagez à plusieurs ?</strong><br>
                                    Chaque membre du groupe doit remplir son propre formulaire.
                                </p>
                                <table role="presentation" cellspacing="0" cellpadding="0">
                                    <tr>
                                        <td style="padding-right: 10px;">
                                            <a href="https://wa.me/?text=Nous%20avons%20rendez-vous%20chez%20Travel%20Doctor.%20Merci%20de%20remplir%20ce%20formulaire%20avant%20la%20consultation%20%3A%20https%3A%2F%2Fwww.traveldoctor.ch/form" target="_blank" style="display: inline-block; padding: 8px 16px; background-color: #25d366; color: #ffffff; text-decoration: none; font-size: 13px; border-radius: 4px;">
                                                WhatsApp
                                            </a>
                                        </td>
                                        <td>
                                            <a href="mailto:?subject=Formulaire%20Travel%20Doctor&body=Nous%20avons%20rendez-vous%20chez%20Travel%20Doctor.%20Merci%20de%20remplir%20ce%20formulaire%20avant%20la%20consultation%20%3A%20https%3A%2F%2Fwww.traveldoctor.ch/form" target="_blank" style="display: inline-block; padding: 8px 16px; background-color: #666666; color: #ffffff; text-decoration: none; font-size: 13px; border-radius: 4px;">
                                                Email
                                            </a>
                                        </td>
                                    </tr>
                                </table>
                            </div>
                            <p style="color: #666666; font-size: 12px; line-height: 1.6; margin: 0; padding-top: 20px; border-top: 1px solid #eeeeee;">
                                Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur&nbsp;:<br>
                                <a href="' . htmlspecialchars($formLink) . '" style="color: #2c5282; word-break: break-all;">' . htmlspecialchars($formLink) . '</a>
                            </p>
                        </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8f9fa; padding: 20px 40px; text-align: center;">
                            <p style="color: #888888; font-size: 12px; margin: 0;">
                                Travel Doctor<br>
                                Médecine des voyages
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>';

    return smtpMail($patientData['email'], $subject, $message, true);
}

/**
 * Build KoBoToolbox prefilled URL from patient data
 */
function buildKoboUrl($patientData) {
    $baseUrl = 'https://ee-eu.kobotoolbox.org/x/Jyi1oJ0F';

    // Map patient data to KoBoToolbox field names
    $prefillData = [];

    if (!empty($patientData['name'])) {
        $prefillData['full_name'] = $patientData['name'];
    }
    if (!empty($patientData['birthdate_iso'])) {
        $prefillData['birthdate'] = $patientData['birthdate_iso'];
    }
    if (!empty($patientData['street'])) {
        $prefillData['street'] = $patientData['street'];
    }
    if (!empty($patientData['postal_code'])) {
        $prefillData['postal_code'] = $patientData['postal_code'];
    }
    if (!empty($patientData['city'])) {
        $prefillData['city'] = $patientData['city'];
    }
    if (!empty($patientData['phone'])) {
        $prefillData['phone'] = $patientData['phone'];
    }
    if (!empty($patientData['email'])) {
        $prefillData['email'] = $patientData['email'];
    }

    // Build query string with d[field]=value format
    $params = [];
    foreach ($prefillData as $field => $value) {
        $params[] = 'd[' . $field . ']=' . rawurlencode($value);
    }

    if (empty($params)) {
        return $baseUrl;
    }

    return $baseUrl . '?' . implode('&', $params);
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
