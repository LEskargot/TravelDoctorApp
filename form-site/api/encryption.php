<?php
/**
 * Encryption Helper for Patient Data
 * Uses AES-256-GCM (authenticated encryption)
 *
 * All patient-identifiable data is encrypted before storage:
 * - patient_name, email
 * - form_data (entire JSON blob)
 * - Draft data
 */

/**
 * Get encryption key from environment
 * Key must be 64 hex characters (32 bytes)
 */
function getEncryptionKey() {
    $key = getenv('FORM_ENCRYPTION_KEY');

    if (!$key || strlen($key) !== 64) {
        error_log('FORM_ENCRYPTION_KEY not set or invalid length');
        throw new Exception('Encryption configuration error');
    }

    return hex2bin($key);
}

/**
 * Encrypt string data using AES-256-GCM
 *
 * @param string $plaintext Data to encrypt
 * @return string Base64-encoded encrypted data (iv + tag + ciphertext)
 */
function encryptData($plaintext) {
    if (empty($plaintext)) {
        return '';
    }

    $key = getEncryptionKey();

    // Generate random 12-byte IV for GCM
    $iv = random_bytes(12);

    // Encrypt with authentication tag
    $ciphertext = openssl_encrypt(
        $plaintext,
        'aes-256-gcm',
        $key,
        OPENSSL_RAW_DATA,
        $iv,
        $tag,
        '',  // no additional authenticated data
        16   // 16-byte tag
    );

    if ($ciphertext === false) {
        error_log('Encryption failed: ' . openssl_error_string());
        throw new Exception('Encryption failed');
    }

    // Combine: IV (12) + Tag (16) + Ciphertext
    return base64_encode($iv . $tag . $ciphertext);
}

/**
 * Decrypt string data using AES-256-GCM
 *
 * @param string $encrypted Base64-encoded encrypted data
 * @return string Decrypted plaintext
 */
function decryptData($encrypted) {
    if (empty($encrypted)) {
        return '';
    }

    $key = getEncryptionKey();

    // Decode from base64
    $data = base64_decode($encrypted, true);

    if ($data === false) {
        throw new Exception('Invalid encrypted data format');
    }

    // Minimum length: 12 (IV) + 16 (tag) + 1 (min ciphertext)
    if (strlen($data) < 29) {
        throw new Exception('Encrypted data too short');
    }

    // Extract components
    $iv = substr($data, 0, 12);
    $tag = substr($data, 12, 16);
    $ciphertext = substr($data, 28);

    // Decrypt
    $plaintext = openssl_decrypt(
        $ciphertext,
        'aes-256-gcm',
        $key,
        OPENSSL_RAW_DATA,
        $iv,
        $tag
    );

    if ($plaintext === false) {
        error_log('Decryption failed: ' . openssl_error_string());
        throw new Exception('Decryption failed - data may be corrupted or tampered');
    }

    return $plaintext;
}

/**
 * Encrypt form data array to JSON then encrypt
 *
 * @param array $formData Form data array
 * @return string Encrypted string
 */
function encryptFormData($formData) {
    if (empty($formData)) {
        return '';
    }

    $json = json_encode($formData, JSON_UNESCAPED_UNICODE);

    if ($json === false) {
        throw new Exception('Failed to encode form data as JSON');
    }

    return encryptData($json);
}

/**
 * Decrypt form data back to array
 *
 * @param string $encrypted Encrypted string
 * @return array Form data array
 */
function decryptFormData($encrypted) {
    if (empty($encrypted)) {
        return [];
    }

    $json = decryptData($encrypted);
    $data = json_decode($json, true);

    if ($data === null && json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception('Failed to decode decrypted JSON: ' . json_last_error_msg());
    }

    return $data ?: [];
}

/**
 * Encrypt patient record before saving to PocketBase
 * Encrypts: patient_name, email, form_data
 *
 * @param array $record Record to encrypt
 * @return array Record with encrypted fields
 */
function encryptPatientRecord($record) {
    $encrypted = $record;

    // Encrypt patient_name
    if (!empty($record['patient_name'])) {
        $encrypted['patient_name_encrypted'] = encryptData($record['patient_name']);
        $encrypted['patient_name'] = '[encrypted]';
    }

    // Encrypt email
    if (!empty($record['email'])) {
        $encrypted['email_encrypted'] = encryptData($record['email']);
        $encrypted['email'] = '[encrypted]';
    }

    // Encrypt form_data
    if (!empty($record['form_data'])) {
        $encrypted['form_data_encrypted'] = encryptFormData($record['form_data']);
        $encrypted['form_data'] = null;
    }

    return $encrypted;
}

/**
 * Decrypt patient record after fetching from PocketBase
 *
 * @param array $record Record to decrypt
 * @return array Record with decrypted fields
 */
function decryptPatientRecord($record) {
    $decrypted = $record;

    // Decrypt patient_name
    if (!empty($record['patient_name_encrypted'])) {
        $decrypted['patient_name'] = decryptData($record['patient_name_encrypted']);
    }

    // Decrypt email
    if (!empty($record['email_encrypted'])) {
        $decrypted['email'] = decryptData($record['email_encrypted']);
    }

    // Decrypt form_data
    if (!empty($record['form_data_encrypted'])) {
        $decrypted['form_data'] = decryptFormData($record['form_data_encrypted']);
    }

    return $decrypted;
}

/**
 * Generate a new encryption key
 * Run this once to generate your key, then store it securely
 *
 * @return string 64-character hex key
 */
function generateEncryptionKey() {
    return bin2hex(random_bytes(32));
}

/**
 * Test encryption is working correctly
 *
 * @return bool True if encryption/decryption cycle works
 */
function testEncryption() {
    try {
        $testData = 'Test patient data: Müller, crédits, 日本語';
        $encrypted = encryptData($testData);
        $decrypted = decryptData($encrypted);

        return $decrypted === $testData;
    } catch (Exception $e) {
        error_log('Encryption test failed: ' . $e->getMessage());
        return false;
    }
}
