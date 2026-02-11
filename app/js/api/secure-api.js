/**
 * Secure PHP API layer
 * Used for SENSITIVE data: medical conditions, observations, AVS,
 * prescriptions, encrypted patient fields.
 * All encryption/decryption happens server-side in PHP.
 */

import { getPb } from './pocketbase.js';

const FORM_API_URL = 'https://form.traveldoctor.ch/api';

function authHeaders() {
    try {
        const token = getPb().authStore.token;
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    } catch {
        return {};
    }
}

async function secureRequest(endpoint, options = {}) {
    const { headers: extraHeaders, ...rest } = options;
    const response = await fetch(`${FORM_API_URL}/${endpoint}`, {
        ...rest,
        headers: { 'Content-Type': 'application/json', ...authHeaders(), ...extraHeaders }
    });

    if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    if (!data.success) {
        throw new Error(data.error || 'Unknown API error');
    }

    return data;
}

// ==================== Patient Medical Data (encrypted) ====================

export async function getPatientMedical(patientId) {
    return await secureRequest(`get-patient-medical.php?patient_id=${patientId}`);
}

export async function savePatientMedical(patientId, medicalData) {
    return await secureRequest('save-patient-medical.php', {
        method: 'POST',
        body: JSON.stringify({ patient_id: patientId, medical: medicalData })
    });
}

// ==================== Observations (encrypted values) ====================

export async function getObservations(patientId) {
    return await secureRequest(`get-observations.php?patient_id=${patientId}`);
}

export async function saveObservation(observation) {
    return await secureRequest('save-observation.php', {
        method: 'POST',
        body: JSON.stringify(observation)
    });
}

// ==================== Prescriptions (encrypted medications) ====================

export async function getPrescriptions(patientId) {
    return await secureRequest(`get-prescriptions.php?patient_id=${patientId}`);
}

export async function savePrescription(prescription) {
    return await secureRequest('save-prescription.php', {
        method: 'POST',
        body: JSON.stringify(prescription)
    });
}

// ==================== Patient Sensitive Fields ====================

export async function getPatientSensitiveFields(patientId) {
    // Returns decrypted: avs, email, telephone, adresse
    return await secureRequest(`get-patient-sensitive.php?patient_id=${patientId}`);
}

export async function savePatientSensitiveFields(patientId, fields) {
    return await secureRequest('save-patient-sensitive.php', {
        method: 'POST',
        body: JSON.stringify({ patient_id: patientId, ...fields })
    });
}

// ==================== Pending Forms ====================

export async function getPendingForms() {
    return await secureRequest('get-pending-forms.php');
}

export async function decryptForm(formId) {
    return await secureRequest(`decrypt-form.php?id=${formId}`);
}

export async function markFormProcessed(formId, patientId) {
    return await secureRequest('mark-form-processed.php', {
        method: 'POST',
        body: JSON.stringify({ form_id: formId, patient_id: patientId, action: 'process' })
    });
}

// ==================== Patient History (full, server-decrypted) ====================

export async function getPatientHistory(patientId) {
    return await secureRequest(`get-patient-history.php?patient_id=${patientId}`);
}

// ==================== Batch Decrypt ====================

export async function decryptItems(items) {
    return await secureRequest('decrypt-data.php', {
        method: 'POST',
        body: JSON.stringify({ items })
    });
}

// ==================== Delivery Note AI Parsing ====================

export async function parseDeliveryNotePdf(file) {
    const formData = new FormData();
    formData.append('pdf', file);

    const token = getPb().authStore.token;
    const response = await fetch(`${FORM_API_URL}/parse-delivery-note.php`, {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: formData
        // No Content-Type header — browser sets multipart boundary automatically
    });

    if (!response.ok) throw new Error(`API error: ${response.status}`);
    const data = await response.json();
    if (!data.success) throw new Error(data.error || 'AI parsing failed');
    return data;
}

// ==================== Case Medical Snapshot ====================

export async function saveCaseMedical(caseId, medicalData) {
    return await secureRequest('encrypt-data.php', {
        method: 'POST',
        body: JSON.stringify({ items: [{ key: 'medical', data: medicalData }] })
    }).then(async (encResult) => {
        // Update case with encrypted medical via PocketBase (caller handles this)
        return encResult.encrypted?.medical || null;
    });
}
