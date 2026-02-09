/**
 * Secure PHP API layer
 * Used for SENSITIVE data: medical conditions, observations, AVS,
 * prescriptions, encrypted patient fields.
 * All encryption/decryption happens server-side in PHP.
 */

const FORM_API_URL = 'https://form.traveldoctor.ch/api';

async function secureRequest(endpoint, options = {}) {
    const response = await fetch(`${FORM_API_URL}/${endpoint}`, {
        headers: { 'Content-Type': 'application/json', ...options.headers },
        ...options
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
    return await secureRequest('decrypt-form.php', {
        method: 'POST',
        body: JSON.stringify({ form_id: formId })
    });
}

export async function markFormProcessed(formId, patientId) {
    return await secureRequest('mark-form-processed.php', {
        method: 'POST',
        body: JSON.stringify({ form_id: formId, patient_id: patientId, action: 'process' })
    });
}
