/**
 * Prescription composable
 * Manages medications with pediatric dosing calculations
 *
 * Before: global selectedMedications + innerHTML (lines 3593-3683)
 * After: reactive array with computed dosing
 */
import * as secureApi from '../api/secure-api.js';

const { ref, computed } = Vue;

// Predefined medications database
const MEDICATIONS = {
    malarone: { name: 'MALARONE cpr pell 250/100 mg', dosing: "1 cpr 1x/j a commencer 1 jour avant d'arriver dans la zone a risque, continuer 1x/j jusqu'a 7 jours apres le retour." },
    riamet: { name: 'RIAMET cpr 20 mg/120 mg', dosing: "4 cpr de suite, 4 cpr 8h apres puis 4 cpr 2x/j pendant 2 jours. A prendre en cas de fievre et test rapide positif. Consulter des que possible ensuite." },
    vivotif: { name: 'Vivotif caps 1EO', dosing: "1 capsule 1 jour sur deux. Ne pas prendre d'antibiotiques en meme temps." },
    mephaquin: { name: 'MEPHAQUIN cpr pell 250 mg', dosing: "1 cpr 1x/semaine a commencer 1 semaine avant d'arriver dans la zone a risque, continuer 1x/semaine jusqu'a 4 semaines apres le depart." },
    acetazolamide: { name: 'ACETAZOLAMIDE 125mg cpr', dosing: "Prendre un comprime deux fois par jour, en commencant 1 a 2 jours avant l'ascension, pour prevenir le mal des montagnes." },
    dexamethasone: { name: 'DEXAMETHASONE 4 mg cpr', dosing: "En traitement des formes moderees a severes, prendre 4 mg toutes les 6 heures, jusqu'a amelioration et descente possible." },
    motilium: { name: 'MOTILIUM cpr mg 1 EO', dosing: '1 cpr max 3x/j si nausees' },
    imodium: { name: 'Imodium 4mg cpr 1 EO', dosing: '2 cpr lors de la premiere prise puis 1 cpr a chaque diarrhee, maximum 16 mg/j' },
    doxy_prophylaxie: { name: 'Doxycycline 100mg - Prophylaxie paludisme', dosing: "100mg 1x/jour a commencer 1-2 jours avant le voyage, continuer quotidiennement pendant le sejour, poursuivre 4 semaines apres avoir quitte la zone a risque" },
    doxy_pep: { name: 'Doxycycline 200mg - PEP', dosing: '200mg (2 x 100mg) dans les 24-72h apres rapport sexuel non protege' }
};

const selectedMedications = ref([]);
const prescriptionDate = ref(new Date().toISOString().split('T')[0]);
const pageFormat = ref('a5');

export function usePrescription() {

    const medicationCount = computed(() => selectedMedications.value.length);

    const medicationOptions = computed(() => [
        { value: '', label: '-- Selectionner --' },
        ...Object.entries(MEDICATIONS).map(([key, med]) => ({ value: key, label: med.name })),
        { value: 'custom', label: 'Medicament personnalise...' }
    ]);

    // ==================== Pediatric dosing ====================

    function calculatePediatricDosing(medicationType, weight) {
        if (!weight || weight <= 0) return null;
        const w = parseFloat(weight);

        if (medicationType === 'malarone') {
            if (w >= 11 && w <= 20) return "1 comprime Malarone junior/jour a commencer 1-2 jours avant d'arriver dans la zone a risque, continuer 1x/j jusqu'a 7 jours apres le retour.";
            if (w >= 21 && w <= 30) return "2 comprimes Malarone junior/jour (en dose unique) a commencer 1-2 jours avant d'arriver dans la zone a risque, continuer 1x/j jusqu'a 7 jours apres le retour.";
            if (w >= 31 && w <= 40) return "3 comprimes Malarone junior/jour (en dose unique) a commencer 1-2 jours avant d'arriver dans la zone a risque, continuer 1x/j jusqu'a 7 jours apres le retour.";
            if (w > 40) return null; // Adult dosing
        }
        if (medicationType === 'mephaquin') {
            if (w >= 10 && w <= 19) return "1/4 comprime/semaine (~62,5mg) a commencer 1-2 semaines avant d'arriver dans la zone a risque, continuer 1x/semaine jusqu'a 4 semaines apres le retour.";
            if (w >= 20 && w <= 30) return "1/2 comprime/semaine (~125mg) a commencer 1-2 semaines avant d'arriver dans la zone a risque, continuer 1x/semaine jusqu'a 4 semaines apres le retour.";
            if (w >= 31 && w <= 45) return "3/4 comprime/semaine (~187,5mg) a commencer 1-2 semaines avant d'arriver dans la zone a risque, continuer 1x/semaine jusqu'a 4 semaines apres le retour.";
            if (w > 45) return null; // Adult dosing
        }
        if (medicationType === 'riamet') {
            if (w >= 5 && w <= 14) return "Traitement sur 3 jours (total 6 comprimes):\nJour 1: 1 comprime immediatement, puis 1 comprime apres 8h\nJours 2-3: 1 comprime matin et soir";
            if (w >= 15 && w <= 24) return "Traitement sur 3 jours (total 12 comprimes):\nJour 1: 2 comprimes immediatement, puis 2 comprimes apres 8h\nJours 2-3: 2 comprimes matin et soir";
            if (w >= 25 && w <= 34) return "Traitement sur 3 jours (total 18 comprimes):\nJour 1: 3 comprimes immediatement, puis 3 comprimes apres 8h\nJours 2-3: 3 comprimes matin et soir";
            if (w >= 35) return null; // Adult dosing
        }
        return null;
    }

    // ==================== Add/remove medications ====================

    function addMedication(type, weight, patientAge, customName, customDosing) {
        if (!type) return;

        let medData;
        if (type === 'custom') {
            if (!customName || !customDosing) return;
            medData = { name: customName, dosing: customDosing };
        } else {
            const base = MEDICATIONS[type];
            if (!base) return;
            medData = { ...base };

            // Doxycycline age check
            if ((type === 'doxy_prophylaxie' || type === 'doxy_pep') && patientAge !== null && patientAge < 8) {
                if (!confirm(`Le patient a ${patientAge} ans.\n\nLa Doxycycline est CONTRE-INDIQUEE chez les enfants < 8 ans.\n\nVoulez-vous vraiment ajouter ce medicament ?`)) {
                    return;
                }
            }

            // Pediatric dosing
            if (weight) {
                const pediatricDosing = calculatePediatricDosing(type, weight);
                if (pediatricDosing) {
                    medData.dosing = pediatricDosing;
                    medData.name = `${medData.name} [Poids: ${weight}kg]`;
                }
            }
        }

        selectedMedications.value.push({
            ...medData,
            id: Date.now() + Math.random()
        });
    }

    function removeMedication(id) {
        selectedMedications.value = selectedMedications.value.filter(m => m.id !== id);
    }

    function updateDosing(id, newDosing) {
        const med = selectedMedications.value.find(m => m.id === id);
        if (med) med.dosing = newDosing;
    }

    // ==================== Save ====================

    async function savePrescription(patientId, consultationId) {
        if (selectedMedications.value.length === 0) return;
        await secureApi.savePrescription({
            patient_id: patientId,
            consultation_id: consultationId,
            date: prescriptionDate.value,
            medications: selectedMedications.value.map(m => ({
                name: m.name,
                dosing: m.dosing
            }))
        });
    }

    // ==================== Reset ====================

    function clearAll() {
        selectedMedications.value = [];
        prescriptionDate.value = new Date().toISOString().split('T')[0];
    }

    return {
        selectedMedications,
        prescriptionDate,
        pageFormat,
        medicationCount,
        medicationOptions,
        MEDICATIONS,
        addMedication,
        removeMedication,
        updateDosing,
        calculatePediatricDosing,
        savePrescription,
        clearAll
    };
}
