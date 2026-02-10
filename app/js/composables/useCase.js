/**
 * Case (EpisodeOfCare) composable
 * Manages travel cases and their consultations
 */
import * as pbApi from '../api/pocketbase.js';
import * as secureApi from '../api/secure-api.js';

const { ref, computed } = Vue;

const cases = ref([]);
const currentCase = ref(null);
const consultations = ref([]);

// Tracks form data when processing a pending form
const formData = ref(null);

export function useCase() {

    const openCases = computed(() =>
        cases.value.filter(c => c.status === 'ouvert')
    );

    const closedCases = computed(() =>
        cases.value.filter(c => c.status === 'termine')
    );

    async function loadCasesForPatient(patientId) {
        cases.value = await pbApi.getCasesForPatient(patientId);
    }

    async function selectCase(caseId) {
        currentCase.value = cases.value.find(c => c.id === caseId) || null;
        if (currentCase.value) {
            consultations.value = await pbApi.getConsultationsForCase(caseId);
        }
    }

    async function createNewCase(patientId, data) {
        const newCase = await pbApi.createCase({
            patient: patientId,
            status: 'ouvert',
            opened_at: new Date().toISOString(),
            ...data
        });
        cases.value.unshift(newCase);
        currentCase.value = newCase;
        consultations.value = [];
        return newCase;
    }

    async function closeCase(caseId) {
        const updated = await pbApi.updateCase(caseId, {
            status: 'termine',
            closed_at: new Date().toISOString()
        });
        const idx = cases.value.findIndex(c => c.id === caseId);
        if (idx >= 0) cases.value[idx] = updated;
        if (currentCase.value?.id === caseId) currentCase.value = updated;
    }

    /**
     * Update case with medical snapshot and/or other data.
     * Encrypts medical data server-side before saving to case.
     */
    async function updateCaseData(caseId, { medical, ...otherData }) {
        const updatePayload = { ...otherData };

        if (medical) {
            // Encrypt medical data via PHP
            const encryptedMedical = await secureApi.saveCaseMedical(caseId, medical);
            if (encryptedMedical) {
                updatePayload.medical_encrypted = encryptedMedical;
            }
        }

        if (Object.keys(updatePayload).length > 0) {
            const updated = await pbApi.updateCase(caseId, updatePayload);
            const idx = cases.value.findIndex(c => c.id === caseId);
            if (idx >= 0) cases.value[idx] = updated;
            if (currentCase.value?.id === caseId) currentCase.value = updated;
        }
    }

    async function updateVoyage(caseId, voyageData) {
        const updated = await pbApi.updateCase(caseId, { voyage: voyageData });
        const idx = cases.value.findIndex(c => c.id === caseId);
        if (idx >= 0) cases.value[idx] = updated;
        if (currentCase.value?.id === caseId) currentCase.value = updated;
    }

    async function addConsultation(data) {
        if (!currentCase.value) throw new Error('No active case');
        const consultation = await pbApi.createConsultation({
            patient: currentCase.value.patient,
            case: currentCase.value.id,
            ...data
        });
        consultations.value.unshift(consultation);
        return consultation;
    }

    /**
     * Set form data when processing a pending form.
     * Used by ConsultationForm to know which form to mark as processed.
     */
    function setFormData(data) {
        formData.value = data;
    }

    function clearCases() {
        cases.value = [];
        currentCase.value = null;
        consultations.value = [];
        formData.value = null;
    }

    return {
        cases,
        currentCase,
        consultations,
        formData,
        openCases,
        closedCases,
        loadCasesForPatient,
        selectCase,
        createNewCase,
        closeCase,
        updateCaseData,
        updateVoyage,
        addConsultation,
        setFormData,
        clearCases
    };
}
