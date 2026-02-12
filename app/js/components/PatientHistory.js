/**
 * Patient History Component
 * Collapsible section showing past consultations with full details.
 */
import { usePatient } from '../composables/usePatient.js';
import * as secureApi from '../api/secure-api.js';
import { FORM_LABELS } from '../data/form-labels.js';
import { formatDateDisplay, formatArray } from '../utils/formatting.js';

const countryNames = new Intl.DisplayNames(['fr'], { type: 'region' });

function resolveCountry(code) {
    if (!code) return '';
    try { return countryNames.of(code.toUpperCase()); }
    catch { return code; }
}

function triLabel(val) {
    if (val === 'oui' || val === true) return 'Oui';
    if (val === 'non' || val === false) return 'Non';
    if (val === 'ne_sais_pas' || val === 'unknown') return 'Ne sait pas';
    return '';
}

const TYPE_LABELS = {
    consultation: 'Consultation',
    teleconsultation: 'Teleconsultation',
    vaccination: 'Vaccination'
};

export default {
    name: 'PatientHistory',

    setup() {
        const { currentPatient } = usePatient();

        const expanded = Vue.ref(false);
        const loading = Vue.ref(false);
        const history = Vue.ref(null);
        const expandedNotes = Vue.ref({});

        async function loadHistory() {
            if (!currentPatient.value?.id) return;
            if (history.value) {
                expanded.value = !expanded.value;
                return;
            }

            loading.value = true;
            try {
                const result = await secureApi.getPatientHistory(currentPatient.value.id);
                history.value = result;
                expanded.value = true;
            } catch (err) {
                console.error('Failed to load history:', err);
                history.value = { cases: [], consultations: [] };
                expanded.value = true;
            } finally {
                loading.value = false;
            }
        }

        const consultations = Vue.computed(() => {
            if (!history.value) return [];
            // Flatten: consultations array with case data attached
            const cases = history.value.cases || [];
            const consults = history.value.consultations || [];

            return consults.map(c => {
                const linkedCase = cases.find(cs => cs.id === c.case) || null;
                return { ...c, caseData: linkedCase };
            }).sort((a, b) => new Date(b.date) - new Date(a.date));
        });

        const consultationCount = Vue.computed(() => {
            if (!history.value) return 0;
            return (history.value.consultations || []).length;
        });

        function toggleNotes(id) {
            expandedNotes.value[id] = !expandedNotes.value[id];
        }

        function getVoyageDestinations(caseData) {
            if (!caseData?.voyage?.destinations) return [];
            return caseData.voyage.destinations;
        }

        function getVoyageChips(caseData, category) {
            if (!caseData?.voyage) return [];
            const arr = caseData.voyage[category] || [];
            const labelMap = category === 'nature' ? FORM_LABELS.travel_reason
                : category === 'hebergement' ? FORM_LABELS.accommodation
                : FORM_LABELS.activities;
            return arr.map(k => labelMap[k] || k);
        }

        const IMMUNE_COMORBIDITIES = ['vih', 'thymus', 'rate', 'cancer', 'hematologie'];

        function getMedicalComorbidities(caseData) {
            const med = caseData?.medical;
            if (!med?.comorbidities) return [];
            return med.comorbidities.filter(c => c !== 'aucune').map(c => ({
                label: FORM_LABELS.comorbidities[c] || c,
                immune: IMMUNE_COMORBIDITIES.includes(c)
            }));
        }

        function getMedicalAllergies(caseData) {
            const med = caseData?.medical;
            if (!med?.allergies) return [];
            return med.allergies.filter(a => a !== 'aucune').map(a => FORM_LABELS.allergy_types[a] || a);
        }

        // Reset when patient changes
        Vue.watch(currentPatient, () => {
            history.value = null;
            expanded.value = false;
            expandedNotes.value = {};
        });

        return {
            expanded, loading, history, consultations, consultationCount,
            expandedNotes, loadHistory, toggleNotes,
            getVoyageDestinations, getVoyageChips,
            getMedicalComorbidities, getMedicalAllergies,
            formatDateDisplay, triLabel, resolveCountry, TYPE_LABELS
        };
    },

    template: `
    <div style="margin-top: 12px;">
        <button class="history-toggle" @click="loadHistory" :disabled="loading">
            {{ loading ? 'Chargement...' : expanded
                ? '▼ ' + consultationCount + ' consultation(s) precedente(s)'
                : '▶ Historique patient' }}
        </button>

        <div v-if="expanded && history" style="margin-top: 10px;">
            <div v-if="consultations.length === 0" class="no-data-message">
                Aucune consultation precedente
            </div>

            <div v-for="c in consultations" :key="c.id" class="history-consultation">
                <!-- Header -->
                <div class="history-header">
                    <span class="history-type">{{ TYPE_LABELS[c.consultation_type] || c.consultation_type }}</span>
                    <span class="history-date">
                        {{ formatDateDisplay(c.date) }}
                        <template v-if="c.duration_minutes"> · {{ c.duration_minutes }} min</template>
                    </span>
                </div>

                <!-- Voyage (from case) -->
                <div v-if="c.caseData?.voyage" class="history-section">
                    <div class="history-section-title">Voyage</div>
                    <div class="history-list">
                        <div v-for="d in getVoyageDestinations(c.caseData)" :key="d.country + d.departure">
                            <strong>{{ resolveCountry(d.country) }}</strong>
                            <template v-if="d.departure">
                                : {{ formatDateDisplay(d.departure) }} – {{ formatDateDisplay(d.return) }}
                            </template>
                        </div>
                        <div v-if="getVoyageChips(c.caseData, 'nature').length" style="margin-top: 2px;">
                            <span v-for="n in getVoyageChips(c.caseData, 'nature')" class="voyage-chip travel">{{ n }}</span>
                        </div>
                        <div v-if="getVoyageChips(c.caseData, 'hebergement').length">
                            <span v-for="h in getVoyageChips(c.caseData, 'hebergement')" class="voyage-chip neutral">{{ h }}</span>
                        </div>
                        <div v-if="getVoyageChips(c.caseData, 'activites').length">
                            <span v-for="a in getVoyageChips(c.caseData, 'activites')" class="voyage-chip activity">{{ a }}</span>
                        </div>
                    </div>
                </div>

                <!-- Medical snapshot (from case) -->
                <div v-if="c.caseData?.medical" class="history-section">
                    <div class="history-section-title">Donnees medicales</div>
                    <div class="history-list">
                        <div v-if="getMedicalComorbidities(c.caseData).length">
                            <strong>Comorbidites:</strong>
                            <span v-for="cm in getMedicalComorbidities(c.caseData)" :key="cm.label"
                                  :class="['medical-tag', cm.immune ? 'immune' : 'allergy']">{{ cm.label }}</span>
                        </div>
                        <div v-if="getMedicalAllergies(c.caseData).length">
                            <strong>Allergies:</strong>
                            <span v-for="al in getMedicalAllergies(c.caseData)" class="medical-tag allergy">{{ al }}</span>
                        </div>
                        <div v-if="c.caseData.medical.medicaments">
                            <strong>Medicaments:</strong> {{ triLabel(c.caseData.medical.medicaments) }}
                            <template v-if="c.caseData.medical.medicamentsDetails"> — {{ c.caseData.medical.medicamentsDetails }}</template>
                        </div>
                    </div>
                </div>

                <!-- Vaccines -->
                <div v-if="c.vaccines?.length" class="history-section">
                    <div class="history-section-title">Vaccins administres</div>
                    <div class="history-list">
                        <div v-for="v in c.vaccines" :key="v.id">
                            {{ v.vaccine }} <span v-if="v.lot" style="color: #999;">(lot: {{ v.lot }})</span>
                        </div>
                    </div>
                </div>

                <!-- Boosters -->
                <div v-if="c.boosters?.length" class="history-section">
                    <div class="history-section-title">Rappels prevus</div>
                    <div class="history-list">
                        <div v-for="b in c.boosters" :key="b.id">
                            {{ b.vaccine }} — {{ formatDateDisplay(b.due_date) }}
                        </div>
                    </div>
                </div>

                <!-- Prescription -->
                <div v-if="c.prescriptions?.length" class="history-section">
                    <div class="history-section-title">Ordonnance</div>
                    <div class="history-list">
                        <div v-for="p in c.prescriptions" :key="p.id">
                            <template v-if="p.medications?.length">
                                <span v-for="(m, i) in p.medications" :key="i">
                                    {{ m.name }}<template v-if="i < p.medications.length - 1">, </template>
                                </span>
                            </template>
                        </div>
                    </div>
                </div>

                <!-- Notes -->
                <div v-if="c.notes" class="history-section">
                    <div class="history-section-title">Notes</div>
                    <div class="history-notes" :class="{ truncated: !expandedNotes[c.id] && c.notes.length > 200 }">
                        {{ c.notes }}
                    </div>
                    <button v-if="c.notes.length > 200" class="history-show-more" @click="toggleNotes(c.id)">
                        {{ expandedNotes[c.id] ? 'voir moins' : 'voir plus' }}
                    </button>
                </div>
            </div>
        </div>
    </div>
    `
};
