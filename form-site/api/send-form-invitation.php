<?php
/**
 * Send form invitation email to a patient
 * Called from the practitioner app when clicking "Envoyer le formulaire"
 *
 * POST JSON body:
 *   email          (required) - patient email
 *   patient_name   (required) - full name
 *   dob            (optional) - birthdate ISO
 *   phone          (optional) - phone number
 *   appointment_date (optional) - e.g. "2026-02-09"
 *   appointment_time (optional) - e.g. "10:30"
 *   form_id        (optional) - existing patient_forms record ID
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/helpers.php';

corsHeaders();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$authUser = requireAuth();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

header('Content-Type: application/json');

$input = json_decode(file_get_contents('php://input'), true);

if (empty($input['email']) || !filter_var($input['email'], FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Email valide requis']);
    exit;
}

if (empty($input['patient_name'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Nom du patient requis']);
    exit;
}

// Split name into firstname/lastname
$nameParts = explode(' ', trim($input['patient_name']), 2);
$firstname = $nameParts[0];
$lastname = isset($nameParts[1]) ? $nameParts[1] : '';

// Build patient data array matching the format expected by buildKoboUrl / email template
$patientData = [
    'name'             => trim($input['patient_name']),
    'firstname'        => $firstname,
    'lastname'         => $lastname,
    'email'            => $input['email'],
    'phone'            => $input['phone'] ?? '',
    'birthdate_iso'    => $input['dob'] ?? '',
    'appointment_date' => $input['appointment_date'] ?? '',
    'appointment_time' => $input['appointment_time'] ?? '',
    // Address fields not available from calendar events
    'street'           => '',
    'postal_code'      => '',
    'city'             => '',
];

// Build KoBoToolbox prefilled URL
$formLink = buildKoboUrl($patientData);

// Build and send email
$subject = 'Travel Doctor - Votre formulaire patient';

$firstName = htmlspecialchars($patientData['firstname']);
$appointmentInfo = '';
if (!empty($patientData['appointment_date'])) {
    $appointmentInfo = htmlspecialchars($patientData['appointment_date']);
    if (!empty($patientData['appointment_time'])) {
        $appointmentInfo .= ' &agrave; ' . htmlspecialchars($patientData['appointment_time']);
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
                            <img src="https://traveldoctor.ch/wp-content/uploads/2025/06/Travel_Doctor_Logos_Travel-doctor-horizontal.png" alt="Travel Doctor" style="max-width: 250px; height: auto;">
                        </td>
                    </tr>
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px;">
                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                Bonjour ' . $firstName . ',
                            </p>
                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                Suite &agrave; votre prise de rendez-vous' . ($appointmentInfo ? ' du <strong>' . $appointmentInfo . '</strong>' : '') . ', nous vous invitons &agrave; compl&eacute;ter votre formulaire patient en ligne.
                            </p>
                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                                Vos informations ont &eacute;t&eacute; pr&eacute;-remplies. Merci de les v&eacute;rifier et de compl&eacute;ter les sections manquantes.
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
                                Ce formulaire nous permettra de pr&eacute;parer au mieux votre consultation.
                            </p>
                            <!-- Group travel notice -->
                            <div style="background-color: #ebf8ff; border-left: 4px solid #2c5282; padding: 15px 20px; margin: 0 0 20px 0; border-radius: 4px;">
                                <p style="color: #2c5282; font-size: 14px; line-height: 1.6; margin: 0 0 12px 0;">
                                    <strong>Vous voyagez &agrave; plusieurs ?</strong><br>
                                    Chaque membre du groupe doit remplir son propre formulaire.
                                </p>
                                <table role="presentation" cellspacing="0" cellpadding="0">
                                    <tr>
                                        <td style="padding-right: 10px;">
                                            <a href="https://wa.me/?text=Nous%20avons%20rendez-vous%20chez%20Travel%20Doctor.%20Merci%20de%20remplir%20ce%20formulaire%20avant%20la%20consultation%20%3A%20https%3A%2F%2Fwww.traveldoctor.ch%2Fform" target="_blank" style="display: inline-block; padding: 8px 16px; background-color: #25d366; color: #ffffff; text-decoration: none; font-size: 13px; border-radius: 4px;">
                                                WhatsApp
                                            </a>
                                        </td>
                                        <td>
                                            <a href="mailto:?subject=Formulaire%20Travel%20Doctor&body=Nous%20avons%20rendez-vous%20chez%20Travel%20Doctor.%20Merci%20de%20remplir%20ce%20formulaire%20avant%20la%20consultation%20%3A%20https%3A%2F%2Fwww.traveldoctor.ch%2Fform" target="_blank" style="display: inline-block; padding: 8px 16px; background-color: #666666; color: #ffffff; text-decoration: none; font-size: 13px; border-radius: 4px;">
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
                        <td style="background-color: #f8f9fa; padding: 30px 40px; text-align: center; border-top: 1px solid #eeeeee;">
                            <p style="color: #333333; font-size: 14px; margin: 0 0 15px 0; font-weight: bold;">
                                Travel Doctor
                            </p>
                            <p style="color: #666666; font-size: 12px; line-height: 1.6; margin: 0 0 15px 0;">
                                M&eacute;decine des voyages
                            </p>
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                <tr>
                                    <td style="width: 50%; padding: 0 10px; vertical-align: top;">
                                        <p style="color: #666666; font-size: 11px; line-height: 1.5; margin: 0;">
                                            <strong>Bulle</strong><br>
                                            Cabinet M&eacute;dical La Tour<br>
                                            Route de l\'Intyamon 113<br>
                                            1635 La Tour-de-Tr&ecirc;me
                                        </p>
                                    </td>
                                    <td style="width: 50%; padding: 0 10px; vertical-align: top;">
                                        <p style="color: #666666; font-size: 11px; line-height: 1.5; margin: 0;">
                                            <strong>Lausanne</strong><br>
                                            Cabinet M&eacute;dical S-Sant&eacute;<br>
                                            Rue du Valentin 32<br>
                                            1004 Lausanne
                                        </p>
                                    </td>
                                </tr>
                            </table>
                            <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 20px auto 0 auto;">
                                <tr>
                                    <td>
                                        <a href="https://www.traveldoctor.ch/whatsapp" target="_blank" style="display: inline-block; padding: 10px 20px; background-color: #25d366; color: #ffffff; text-decoration: none; font-size: 13px; border-radius: 20px;">
                                            Nous contacter sur WhatsApp
                                        </a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>';

$sent = smtpMail($patientData['email'], $subject, $message, true);

if (!$sent) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Erreur lors de l\'envoi de l\'email']);
    exit;
}

// If a form_id was provided, update the record to track that invitation was sent
if (!empty($input['form_id'])) {
    $token = pbAdminAuth();
    if ($token) {
        pbRequest('/api/collections/patient_forms/records/' . $input['form_id'], 'PATCH', [
            'invitation_sent_at' => date('Y-m-d H:i:s'),
        ], $token);
    }
}

echo json_encode(['success' => true, 'message' => 'Email envoy&eacute;']);

/**
 * Build KoBoToolbox prefilled URL from patient data
 */
function buildKoboUrl($patientData) {
    $baseUrl = 'https://ee-eu.kobotoolbox.org/x/Jyi1oJ0F';

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

    $params = [];
    foreach ($prefillData as $field => $value) {
        $params[] = 'd[' . $field . ']=' . rawurlencode($value);
    }

    if (empty($params)) {
        return $baseUrl;
    }

    return $baseUrl . '?' . implode('&', $params);
}
