/**
 * Case (EpisodeOfCare) composable
 * Manages travel cases and their consultations
 */
import * as pbApi from '../api/pocketbase.js';

const { ref, computed } = Vue;

const cases = ref([]);
const currentCase = ref(null);
const consultations = ref([]);

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

    function clearCases() {
        cases.value = [];
        currentCase.value = null;
        consultations.value = [];
    }

    return {
        cases,
        currentCase,
        consultations,
        openCases,
        closedCases,
        loadCasesForPatient,
        selectCase,
        createNewCase,
        closeCase,
        addConsultation,
        clearCases
    };
}
