/**
 * Patient composable
 * Manages current patient, search, and medical data
 *
 * Demonstrates the two-API-layer pattern:
 * - Non-sensitive (name, dob) → PocketBase direct
 * - Sensitive (medical, AVS, observations) → PHP secure API
 */
import * as pbApi from '../api/pocketbase.js';
import * as secureApi from '../api/secure-api.js';

const { ref, computed } = Vue;

// Shared state
const currentPatient = ref(null);
const searchResults = ref([]);
const searchLoading = ref(false);
const medicalData = ref(null);
const sensitiveFields = ref(null);
const observations = ref([]);

export function usePatient() {

    const patientName = computed(() => {
        if (!currentPatient.value) return '';
        return `${currentPatient.value.nom} ${currentPatient.value.prenom}`.trim();
    });

    const patientAge = computed(() => {
        if (!currentPatient.value?.dob) return null;
        const dob = new Date(currentPatient.value.dob);
        const today = new Date();
        let age = today.getFullYear() - dob.getFullYear();
        const m = today.getMonth() - dob.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
        return age;
    });

    // ==================== Search (PocketBase direct — name is not sensitive) ====================

    async function search(query) {
        if (query.length < 2) {
            searchResults.value = [];
            return;
        }
        searchLoading.value = true;
        try {
            const result = await pbApi.searchPatients(query);
            searchResults.value = result.items;
        } catch (error) {
            console.error('Search error:', error);
            searchResults.value = [];
        } finally {
            searchLoading.value = false;
        }
    }

    // ==================== Load patient (PB + secure API in parallel) ====================

    async function selectPatient(patientId) {
        // Fetch non-sensitive and sensitive data in parallel
        const [patient, sensitiveRes, medicalRes, obsRes] = await Promise.all([
            pbApi.getPatient(patientId),
            secureApi.getPatientSensitiveFields(patientId).catch(() => null),
            secureApi.getPatientMedical(patientId).catch(() => null),
            secureApi.getObservations(patientId).catch(() => null)
        ]);

        currentPatient.value = patient;
        sensitiveFields.value = sensitiveRes?.fields || null;
        medicalData.value = medicalRes?.medical || null;
        observations.value = obsRes?.observations || [];
    }

    // ==================== Save (split across both APIs) ====================

    async function savePatient(formData) {
        const { avs, email, telephone, adresse, medical: med, ...publicFields } = formData;

        let patientId = currentPatient.value?.id;

        if (patientId) {
            // Update non-sensitive fields via PocketBase
            await pbApi.updatePatient(patientId, publicFields);
        } else {
            // Create patient with non-sensitive fields
            const created = await pbApi.createPatient(publicFields);
            patientId = created.id;
        }

        // Save sensitive fields via PHP (encrypted)
        await secureApi.savePatientSensitiveFields(patientId, { avs, email, telephone, adresse });

        // Save medical data via PHP (encrypted)
        if (med) {
            await secureApi.savePatientMedical(patientId, med);
        }

        // Refresh
        await selectPatient(patientId);
        return patientId;
    }

    // ==================== Observations ====================

    async function addObservation(obs) {
        await secureApi.saveObservation({
            patient_id: currentPatient.value.id,
            ...obs
        });
        // Refresh observations
        const result = await secureApi.getObservations(currentPatient.value.id);
        observations.value = result?.observations || [];
    }

    function getLatestObservation(type) {
        return observations.value
            .filter(o => o.type === type)
            .sort((a, b) => new Date(b.date) - new Date(a.date))[0] || null;
    }

    function setMedicalData(data) {
        medicalData.value = data;
    }

    function clearPatient() {
        currentPatient.value = null;
        searchResults.value = [];
        medicalData.value = null;
        sensitiveFields.value = null;
        observations.value = [];
    }

    return {
        currentPatient,
        searchResults,
        searchLoading,
        medicalData,
        sensitiveFields,
        observations,
        patientName,
        patientAge,
        search,
        selectPatient,
        savePatient,
        addObservation,
        getLatestObservation,
        setMedicalData,
        clearPatient
    };
}
