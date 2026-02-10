/**
 * Case View Component
 *
 * Displays patient cases (episodes of care) and their consultations.
 * This is the NEW concept — no equivalent in the original app.
 *
 * Demonstrates:
 * - Case = travel episode grouping multiple encounters
 * - Voyage data lives on the case, not on individual consultations
 * - Medical snapshot no longer needed (medical data lives on patient)
 */
import { usePatient } from '../composables/usePatient.js';
import { useCase } from '../composables/useCase.js';
import { useAuth } from '../composables/useAuth.js';

const countryNames = new Intl.DisplayNames(['fr'], { type: 'region' });
function resolveCountry(code) {
    if (!code) return code;
    try { return countryNames.of(code.toUpperCase()); }
    catch { return code; }
}

export default {
    name: 'CaseView',

    emits: ['start-consultation'],

    setup(props, { emit }) {
        const { currentPatient, patientName } = usePatient();
        const { cases, currentCase, consultations, openCases,
                selectCase, createNewCase, closeCase, addConsultation } = useCase();
        const { user, location, locationName } = useAuth();

        const showNewCaseForm = Vue.ref(false);
        const newCaseType = Vue.ref('voyage');
        const newCaseDestinations = Vue.ref('');

        async function onCreateCase() {
            if (!currentPatient.value) return;

            const voyage = newCaseType.value === 'voyage' ? {
                destinations: newCaseDestinations.value.split(',').map(d => d.trim()).filter(Boolean),
            } : null;

            await createNewCase(currentPatient.value.id, {
                type: newCaseType.value,
                voyage: voyage,
                opened_by: user.value?.id,
                location: location.value
            });

            showNewCaseForm.value = false;
            newCaseDestinations.value = '';
        }

        function onStartConsultation(type) {
            emit('start-consultation', {
                caseId: currentCase.value.id,
                type: type
            });
        }

        function formatDate(dateStr) {
            if (!dateStr) return '';
            return new Date(dateStr).toLocaleDateString('fr-CH');
        }

        function caseStatusLabel(status) {
            const labels = { ouvert: 'Ouvert', termine: 'Termine', annule: 'Annule' };
            return labels[status] || status;
        }

        function caseTypeLabel(type) {
            const labels = { voyage: 'Voyage', rappel_seul: 'Rappel', suivi: 'Suivi' };
            return labels[type] || type;
        }

        function consultTypeLabel(type) {
            const labels = {
                teleconsultation: 'Teleconsultation',
                vaccination: 'Vaccination',
                rappel: 'Rappel',
                suivi: 'Suivi'
            };
            return labels[type] || type;
        }

        function formatDestinations(destinations) {
            if (!destinations?.length) return '';
            return destinations.map(d =>
                typeof d === 'string' ? d : resolveCountry(d.country) || d.country
            ).join(', ');
        }

        return {
            cases, currentCase, consultations, openCases,
            showNewCaseForm, newCaseType, newCaseDestinations,
            selectCase, onCreateCase, closeCase, onStartConsultation,
            formatDate, formatDestinations, caseStatusLabel, caseTypeLabel, consultTypeLabel,
            currentPatient, patientName
        };
    },

    template: `
    <div v-if="currentPatient" class="case-view">

        <!-- Case list -->
        <div class="case-list-header">
            <h3>Dossiers de {{ patientName }}</h3>
            <button class="btn-primary btn-small" @click="showNewCaseForm = !showNewCaseForm">
                + Nouveau dossier
            </button>
        </div>

        <!-- New case form -->
        <div v-if="showNewCaseForm" class="new-case-form">
            <div class="form-row">
                <label>Type:</label>
                <select v-model="newCaseType">
                    <option value="voyage">Voyage</option>
                    <option value="rappel_seul">Rappel seul</option>
                    <option value="suivi">Suivi</option>
                </select>
            </div>
            <div v-if="newCaseType === 'voyage'" class="form-row">
                <label>Destinations:</label>
                <input type="text" v-model="newCaseDestinations"
                       placeholder="Kenya, Tanzanie, ...">
            </div>
            <div class="form-actions">
                <button class="btn-success btn-small" @click="onCreateCase">Creer</button>
                <button class="btn-secondary btn-small" @click="showNewCaseForm = false">Annuler</button>
            </div>
        </div>

        <!-- Case cards -->
        <div v-if="cases.length === 0" class="no-data-message">
            Aucun dossier. Creez un nouveau dossier pour commencer.
        </div>

        <div v-for="c in cases" :key="c.id"
             class="case-card"
             :class="{ active: currentCase?.id === c.id, open: c.status === 'ouvert' }"
             @click="selectCase(c.id)">

            <div class="case-card-header">
                <span class="case-type">{{ caseTypeLabel(c.type) }}</span>
                <span class="case-status" :class="c.status">{{ caseStatusLabel(c.status) }}</span>
            </div>

            <div class="case-card-body">
                <div v-if="c.voyage?.destinations?.length" class="case-destinations">
                    {{ formatDestinations(c.voyage.destinations) }}
                </div>
                <div class="case-dates">
                    Ouvert le {{ formatDate(c.opened_at) }}
                    <span v-if="c.closed_at"> — Ferme le {{ formatDate(c.closed_at) }}</span>
                </div>
            </div>
        </div>

        <!-- Selected case detail -->
        <div v-if="currentCase" class="case-detail">
            <div class="case-detail-header">
                <h4>
                    {{ caseTypeLabel(currentCase.type) }}
                    <span v-if="currentCase.voyage?.destinations?.length">
                        — {{ formatDestinations(currentCase.voyage.destinations) }}
                    </span>
                </h4>
                <div class="case-detail-actions">
                    <button v-if="currentCase.status === 'ouvert'"
                            class="btn-success btn-small"
                            @click="closeCase(currentCase.id)">
                        Fermer le dossier
                    </button>
                </div>
            </div>

            <!-- Consultations within this case -->
            <h5>Consultations ({{ consultations.length }})</h5>

            <div v-if="consultations.length === 0" class="no-data-message">
                Aucune consultation dans ce dossier.
            </div>

            <div v-for="consult in consultations" :key="consult.id" class="consultation-card">
                <div class="consultation-header">
                    <span class="consultation-type">{{ consultTypeLabel(consult.consultation_type) }}</span>
                    <span class="consultation-date">{{ formatDate(consult.date) }}</span>
                </div>
                <div v-if="consult.notes" class="consultation-notes">{{ consult.notes }}</div>
                <div v-if="consult.duration_minutes" class="consultation-duration">
                    {{ consult.duration_minutes }} min
                </div>
            </div>

            <!-- Add consultation buttons -->
            <div v-if="currentCase.status === 'ouvert'" class="add-consultation">
                <button class="btn-primary" @click="onStartConsultation('teleconsultation')">
                    Teleconsultation
                </button>
                <button class="btn-success" @click="onStartConsultation('vaccination')">
                    Vaccination
                </button>
                <button class="btn-secondary" @click="onStartConsultation('rappel')">
                    Rappel
                </button>
            </div>
        </div>
    </div>
    `
};
