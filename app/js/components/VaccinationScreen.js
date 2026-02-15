/**
 * Vaccination Screen — Lean interface for vaccinateurs
 *
 * Read-only patient summary + medical alerts + VaccinePanel + note + save.
 * No patient editing, no voyage, no prescription, no chronometer.
 */
import { useAuth } from '../composables/useAuth.js';
import { usePatient } from '../composables/usePatient.js';
import { useCase } from '../composables/useCase.js';
import { useVaccines } from '../composables/useVaccines.js';
import * as secureApi from '../api/secure-api.js';
import { FORM_LABELS } from '../data/form-labels.js';

import VaccinePanel from './VaccinePanel.js';

const IMMUNE_COMORBIDITIES = ['vih', 'thymus', 'rate', 'cancer', 'hematologie'];

export default {
    name: 'VaccinationScreen',

    components: { VaccinePanel },

    emits: ['saved', 'back', 'view-patient'],

    setup(props, { emit }) {
        const { userName, user, location, locationName } = useAuth();
        const { currentPatient, patientName, patientAge, medicalData } = usePatient();
        const { currentCase, addConsultation, createNewCase } = useCase();
        const vaccines = useVaccines();

        const note = Vue.ref('');
        const saving = Vue.ref(false);

        // Decrypt case medical data on mount (if available)
        const caseMedical = Vue.ref(null);
        const caseMedicalLoading = Vue.ref(false);

        Vue.onMounted(async () => {
            if (currentCase.value?.medical_encrypted) {
                caseMedicalLoading.value = true;
                try {
                    const res = await secureApi.decryptItems([
                        { key: 'medical', encrypted: currentCase.value.medical_encrypted }
                    ]);
                    caseMedical.value = res.decrypted?.medical || null;
                } catch (e) {
                    console.error('Failed to decrypt case medical:', e);
                } finally {
                    caseMedicalLoading.value = false;
                }
            }
        });

        // Use case medical if available, fall back to patient medical
        const medicalSource = Vue.computed(() => caseMedical.value || medicalData.value);

        // ==================== Medical alerts ====================

        function getComorbidities(med) {
            if (!med?.comorbidities) return [];
            return med.comorbidities.filter(c => c !== 'aucune').map(c => ({
                label: FORM_LABELS.comorbidities[c] || c,
                immune: IMMUNE_COMORBIDITIES.includes(c),
                detail: c === 'psychiatrique' ? med.psychiatricDetails
                    : c === 'autre' ? med.comorbidityOther
                    : med.comorbidityDetails?.[c] || ''
            }));
        }

        function getAllergies(med) {
            if (!med?.allergies) return [];
            return med.allergies.filter(a => a !== 'aucune').map(a => ({
                label: FORM_LABELS.allergy_types[a] || a,
                detail: med.allergyDetails?.[a] || ''
            }));
        }

        const alerts = Vue.computed(() => {
            const med = medicalSource.value;
            if (!med) return [];
            const items = [];

            // Vaccination problems
            if (med.problemeVaccination === 'oui') {
                items.push({
                    type: 'danger',
                    label: 'Probleme de vaccination',
                    detail: med.problemeVaccinationDetails || ''
                });
            }

            // Pregnancy
            if (med.grossesse === 'oui') {
                items.push({ type: 'danger', label: 'Grossesse', detail: '' });
            }

            // Immune comorbidities
            for (const c of getComorbidities(med)) {
                if (c.immune) {
                    items.push({ type: 'warning', label: c.label, detail: c.detail });
                }
            }

            // Allergies
            for (const a of getAllergies(med)) {
                items.push({ type: 'warning', label: 'Allergie: ' + a.label, detail: a.detail });
            }

            // Chemotherapy
            if (med.recentChemotherapy === 'oui') {
                items.push({ type: 'danger', label: 'Chimiotherapie recente', detail: '' });
            }

            return items;
        });

        // ==================== Formatting ====================

        function formatDob(dob) {
            if (!dob) return '';
            const parts = dob.split('T')[0].split('-');
            if (parts.length === 3) return `${parts[2]}.${parts[1]}.${parts[0]}`;
            return dob;
        }

        // ==================== Save ====================

        async function save() {
            if (!currentPatient.value?.id) {
                alert('Aucun patient selectionne.');
                return;
            }
            if (vaccines.vaccines.value.length === 0) {
                alert('Aucun vaccin selectionne.');
                return;
            }

            saving.value = true;
            try {
                // Ensure case exists - create if needed
                if (!currentCase.value) {
                    try {
                        await createNewCase(currentPatient.value.id, {
                            type: 'conseil_sans_voyage', // Vaccination only, no travel
                            voyage: JSON.stringify({ destinations: [] }),
                            medical_encrypted: '', // No medical data on vaccination-only
                            status: 'termine',
                            closed_at: new Date().toISOString()
                        });
                    } catch (error) {
                        console.error('Failed to auto-create case:', error);
                        alert('Erreur lors de la création du dossier: ' + error.message);
                        saving.value = false;
                        return;
                    }
                }

                // Create consultation
                const consultation = await addConsultation({
                    location: location.value,
                    practitioner: user.value?.id,
                    date: new Date().toISOString().split('T')[0],
                    consultation_type: 'vaccination',
                    notes: note.value || null,
                    status: 'termine'
                });

                // Save vaccines + stock decrement + boosters
                await vaccines.saveVaccines(
                    currentPatient.value.id,
                    consultation.id,
                    currentCase.value?.id
                );

                alert('Vaccination enregistree!');
                emit('saved');
            } catch (error) {
                alert('Erreur lors de la sauvegarde: ' + error.message);
            } finally {
                saving.value = false;
            }
        }

        return {
            userName, locationName,
            currentPatient, patientName, patientAge,
            medicalSource, caseMedicalLoading, alerts,
            note, saving,
            formatDob, save, emit
        };
    },

    template: `
    <div class="vaccination-screen">
        <!-- Header -->
        <div class="vaccination-header">
            <button class="btn-secondary btn-small" @click="$emit('back')">&#8592; Retour</button>
            <div class="vaccination-header-info">
                <h1>Vaccination</h1>
                <div class="practitioner-info">{{ userName }} &mdash; {{ locationName }}</div>
            </div>
        </div>

        <!-- Patient summary (read-only) -->
        <div v-if="currentPatient" class="vaccination-patient-card">
            <a href="#" class="patient-link vaccination-patient-name" @click.prevent="$emit('view-patient')">{{ patientName }}</a>
            <div class="vaccination-patient-details">
                <span v-if="currentPatient.dob">{{ formatDob(currentPatient.dob) }}</span>
                <span v-if="patientAge != null"> &mdash; {{ patientAge }} ans</span>
                <span v-if="currentPatient.poids"> &mdash; {{ currentPatient.poids }} kg</span>
                <span v-if="currentPatient.sexe" class="patient-gender">
                    ({{ currentPatient.sexe === 'M' ? 'Homme' : currentPatient.sexe === 'F' ? 'Femme' : currentPatient.sexe }})
                </span>
            </div>
        </div>

        <!-- Medical alerts -->
        <div v-if="caseMedicalLoading" class="medical-alerts">
            <div class="medical-alerts-title">Alertes medicales</div>
            <div class="consultation-loading">Chargement...</div>
        </div>
        <div v-else-if="alerts.length > 0" class="medical-alerts">
            <div class="medical-alerts-title">Alertes medicales</div>
            <div v-for="(alert, i) in alerts" :key="i"
                 class="medical-alert-item" :class="'alert-' + alert.type">
                <strong>{{ alert.label }}</strong>
                <span v-if="alert.detail"> &mdash; {{ alert.detail }}</span>
            </div>
        </div>

        <!-- Vaccine Panel (reused as-is) -->
        <div class="vaccination-vaccines-section">
            <VaccinePanel />
        </div>

        <!-- Note -->
        <div class="vaccination-note-section">
            <label>Note (optionnel)</label>
            <textarea v-model="note" placeholder="Remarques, malaise, refus..." rows="3"></textarea>
        </div>

        <!-- Save -->
        <div class="vaccination-save-section">
            <button class="btn-success" @click="save" :disabled="saving">
                {{ saving ? 'Enregistrement...' : 'Enregistrer la vaccination' }}
            </button>
        </div>
    </div>
    `
};
