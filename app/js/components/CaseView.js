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
import * as pbApi from '../api/pocketbase.js';
import * as secureApi from '../api/secure-api.js';
import { FORM_LABELS } from '../data/form-labels.js';

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
        const { user, location, locationName, isVaccinateur } = useAuth();

        const showNewCaseForm = Vue.ref(false);
        const newCaseType = Vue.ref('conseil_voyage');
        const newCaseDestinations = Vue.ref('');
        const showConsultTypeMenu = Vue.ref(false);

        // Consultation details (auto-loaded, all expanded by default)
        const collapsedConsults = Vue.ref(new Set());
        const consultDetails = Vue.ref({}); // consultId -> { vaccines, prescriptions, plannedVaccines, loaded }
        const detailsLoading = Vue.ref(false);

        // Case medical snapshot (decrypted on demand)
        const caseMedical = Vue.ref(null);
        const caseMedicalLoading = Vue.ref(false);

        async function onCreateCase() {
            if (!currentPatient.value) return;

            const voyage = newCaseType.value === 'conseil_voyage' ? {
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
            showConsultTypeMenu.value = false;
            emit('start-consultation', {
                caseId: currentCase.value.id,
                type: type
            });
        }

        // ==================== Consultation expand/collapse ====================

        function toggleConsultation(consultId) {
            const s = new Set(collapsedConsults.value);
            if (s.has(consultId)) s.delete(consultId);
            else s.add(consultId);
            collapsedConsults.value = s;
        }

        function isExpanded(consultId) {
            return !collapsedConsults.value.has(consultId);
        }

        // Auto-load details for all consultations in a case
        async function loadAllConsultationDetails() {
            const consults = consultations.value;
            if (!consults.length) return;

            detailsLoading.value = true;
            const patientId = currentPatient.value?.id;

            try {
                // Fetch all data in parallel (once, not per-consultation)
                const [allVaccineArrays, prescRes, allBoosters] = await Promise.all([
                    Promise.all(consults.map(c =>
                        pbApi.getVaccinesForConsultation(c.id).catch(() => [])
                    )),
                    patientId
                        ? secureApi.getPrescriptions(patientId).catch(() => null)
                        : Promise.resolve(null),
                    patientId
                        ? pbApi.getBoostersForPatient(patientId).catch(() => [])
                        : Promise.resolve([])
                ]);

                const allRx = prescRes?.prescriptions || [];
                const details = {};

                consults.forEach((consult, i) => {
                    const caseId = consult.case || currentCase.value?.id;
                    const consultRx = allRx.filter(p => p.consultation === consult.id);
                    const plannedVaccines = caseId
                        ? [...new Set(
                            allBoosters
                                .filter(b => b.case === caseId && b.status === 'a_planifier')
                                .map(b => b.vaccine_name)
                          )]
                        : [];

                    details[consult.id] = {
                        vaccines: allVaccineArrays[i] || [],
                        plannedVaccines,
                        prescriptions: consultRx,
                        loaded: true
                    };
                });

                consultDetails.value = details;
            } catch (e) {
                console.error('Failed to load consultation details:', e);
            } finally {
                detailsLoading.value = false;
            }
        }

        // Parse notes field to extract [CONSEILS] prefix
        function parseConsultNotes(rawNotes) {
            if (!rawNotes) return { conseils: [], notes: '' };
            if (rawNotes.startsWith('[CONSEILS]')) {
                const firstBlank = rawNotes.indexOf('\n\n');
                const conseilLine = firstBlank > 0
                    ? rawNotes.substring(10, firstBlank).trim()
                    : rawNotes.substring(10).trim();
                const conseils = conseilLine.split('|').map(s => s.trim()).filter(Boolean);
                const remaining = firstBlank > 0 ? rawNotes.substring(firstBlank + 2).trim() : '';
                return { conseils, notes: remaining };
            }
            return { conseils: [], notes: rawNotes };
        }

        // Consultation summary helpers
        function consultSummary(consult) {
            const d = consultDetails.value[consult.id];
            const parsed = parseConsultNotes(consult.notes);
            const tags = [];
            if (parsed.conseils.length) tags.push(...parsed.conseils);
            if (parsed.notes) tags.push('Notes');
            if (d?.vaccines?.length) tags.push(d.vaccines.length + ' vaccin' + (d.vaccines.length > 1 ? 's' : ''));
            if (d?.prescriptions?.length) tags.push('Ordonnance');
            if (d?.plannedVaccines?.length) tags.push(d.plannedVaccines.length + ' planifie' + (d.plannedVaccines.length > 1 ? 's' : ''));
            return tags;
        }

        // Reset state + decrypt medical + auto-load details when case changes
        Vue.watch(currentCase, async (c) => {
            collapsedConsults.value = new Set();
            consultDetails.value = {};
            caseMedical.value = null;

            if (c) {
                setTimeout(() => {
                    const el = document.querySelector('.case-card.active');
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 50);
            }

            if (c?.medical_encrypted) {
                caseMedicalLoading.value = true;
                try {
                    const res = await secureApi.decryptItems([
                        { key: 'medical', encrypted: c.medical_encrypted }
                    ]);
                    caseMedical.value = res.decrypted?.medical || null;
                } catch (e) {
                    console.error('Failed to decrypt case medical:', e);
                } finally {
                    caseMedicalLoading.value = false;
                }
            }
        });

        // Auto-load consultation details when consultations list changes
        Vue.watch(consultations, (consults) => {
            if (consults.length) loadAllConsultationDetails();
        });

        // ==================== Formatting ====================

        function formatDate(dateStr) {
            if (!dateStr) return '';
            const dateOnly = dateStr.split('T')[0].split(' ')[0];
            const parts = dateOnly.split('-');
            if (parts.length === 3) return `${parts[2]}.${parts[1]}.${parts[0]}`;
            return dateStr;
        }

        function caseStatusLabel(status) {
            const labels = { ouvert: 'Ouvert', termine: 'Termine', annule: 'Annule' };
            return labels[status] || status;
        }

        function caseTypeLabel(type) {
            const labels = { conseil_voyage: 'Conseil avant voyage', conseil_sans_voyage: 'Conseil sans voyage' };
            return labels[type] || type;
        }

        function consultTypeLabel(type) {
            const labels = {
                consultation: 'Consultation',
                teleconsultation: 'Teleconsultation',
                vaccination: 'Vaccination'
            };
            return labels[type] || type;
        }

        function formatDestinations(destinations) {
            if (!destinations?.length) return '';
            return destinations.map(d =>
                typeof d === 'string' ? d : resolveCountry(d.country) || d.country
            ).join(', ');
        }

        function getVoyageChips(voyage, category) {
            if (!voyage) return [];
            const arr = voyage[category] || [];
            const labelMap = category === 'nature' ? FORM_LABELS.travel_reason
                : category === 'hebergement' ? FORM_LABELS.accommodation
                : FORM_LABELS.activities;
            return arr.map(k => labelMap[k] || k);
        }

        // ==================== Case medical snapshot helpers ====================

        const IMMUNE_COMORBIDITIES = ['vih', 'thymus', 'rate', 'cancer', 'hematologie'];

        function getCaseComorbidities(med) {
            if (!med?.comorbidities) return [];
            return med.comorbidities.filter(c => c !== 'aucune').map(c => ({
                label: FORM_LABELS.comorbidities[c] || c,
                immune: IMMUNE_COMORBIDITIES.includes(c),
                detail: c === 'psychiatrique' ? med.psychiatricDetails
                    : c === 'autre' ? med.comorbidityOther
                    : med.comorbidityDetails?.[c] || ''
            }));
        }

        function getCaseAllergies(med) {
            if (!med?.allergies) return [];
            return med.allergies.filter(a => a !== 'aucune').map(a => ({
                label: FORM_LABELS.allergy_types[a] || a,
                detail: med.allergyDetails?.[a] || ''
            }));
        }

        return {
            cases, currentCase, consultations, openCases,
            showNewCaseForm, newCaseType, newCaseDestinations,
            showConsultTypeMenu,
            collapsedConsults, consultDetails, detailsLoading,
            caseMedical, caseMedicalLoading,
            selectCase, onCreateCase, closeCase, onStartConsultation,
            toggleConsultation, isExpanded, consultSummary, parseConsultNotes,
            formatDate, formatDestinations, getVoyageChips,
            getCaseComorbidities, getCaseAllergies,
            caseStatusLabel, caseTypeLabel, consultTypeLabel,
            resolveCountry, currentPatient, patientName, isVaccinateur
        };
    },

    template: `
    <div v-if="currentPatient" class="case-view">

        <!-- Case list -->
        <div class="case-list-header">
            <h3>Dossiers de {{ patientName }}</h3>
            <button v-if="!isVaccinateur" class="btn-primary btn-small" @click="showNewCaseForm = !showNewCaseForm">
                + Nouveau dossier
            </button>
        </div>

        <!-- New case form -->
        <div v-if="showNewCaseForm" class="new-case-form">
            <div class="form-row">
                <label>Type:</label>
                <select v-model="newCaseType">
                    <option value="conseil_voyage">Conseil avant voyage</option>
                    <option value="conseil_sans_voyage">Conseil sans voyage</option>
                </select>
            </div>
            <div v-if="newCaseType === 'conseil_voyage'" class="form-row">
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

        <template v-for="c in cases" :key="c.id">
        <div class="case-card"
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
        <Transition name="case-detail">
        <div v-if="currentCase?.id === c.id" class="case-detail">
            <div v-if="currentCase.status === 'ouvert' && !isVaccinateur" class="case-detail-actions">
                <button class="btn-success btn-small"
                        @click="closeCase(currentCase.id)">
                    Fermer le dossier
                </button>
            </div>

            <!-- Voyage details -->
            <div v-if="currentCase.voyage" class="case-voyage-detail">
                <div v-if="currentCase.voyage.destinations?.length" class="voyage-destinations-detail">
                    <div v-for="d in currentCase.voyage.destinations" :key="(d.country || d) + (d.departure || '')" class="voyage-dest-row">
                        <strong>{{ typeof d === 'string' ? d : resolveCountry(d.country) || d.country }}</strong>
                        <template v-if="d.departure">
                            : {{ formatDate(d.departure) }} – {{ formatDate(d.return) }}
                        </template>
                    </div>
                </div>
                <div v-if="getVoyageChips(currentCase.voyage, 'nature').length" class="voyage-chips">
                    <span class="voyage-section-label">Motif: </span>
                    <span v-for="n in getVoyageChips(currentCase.voyage, 'nature')" :key="n" class="voyage-chip travel">{{ n }}</span>
                </div>
                <div v-if="getVoyageChips(currentCase.voyage, 'hebergement').length" class="voyage-chips">
                    <span class="voyage-section-label">Hebergement: </span>
                    <span v-for="h in getVoyageChips(currentCase.voyage, 'hebergement')" :key="h" class="voyage-chip neutral">{{ h }}</span>
                </div>
                <div v-if="getVoyageChips(currentCase.voyage, 'activites').length" class="voyage-chips">
                    <span class="voyage-section-label">Activites: </span>
                    <span v-for="a in getVoyageChips(currentCase.voyage, 'activites')" :key="a" class="voyage-chip activity">{{ a }}</span>
                </div>
            </div>

            <!-- Medical snapshot at time of case -->
            <div v-if="caseMedicalLoading" class="case-medical-snapshot">
                <div class="history-section-title">Donnees medicales du dossier</div>
                <div class="consultation-loading">Chargement...</div>
            </div>
            <div v-else-if="caseMedical" class="case-medical-snapshot">
                <div class="history-section-title">Donnees medicales du dossier</div>
                <div v-if="getCaseComorbidities(caseMedical).length" class="medical-row">
                    <strong>Comorbidites:</strong>
                    <span v-for="c in getCaseComorbidities(caseMedical)" :key="c.label"
                          :class="['medical-tag', c.immune ? 'immune' : '']">
                        {{ c.label }}<template v-if="c.detail"> ({{ c.detail }})</template>
                    </span>
                </div>
                <div v-if="caseMedical.recentChemotherapy === 'oui'" class="medical-row medical-warning">
                    Chimiotherapie recente
                </div>
                <div v-if="getCaseAllergies(caseMedical).length" class="medical-row">
                    <strong>Allergies:</strong>
                    <span v-for="a in getCaseAllergies(caseMedical)" :key="a.label" class="medical-tag allergy">
                        {{ a.label }}<template v-if="a.detail"> ({{ a.detail }})</template>
                    </span>
                </div>
                <div v-if="caseMedical.medicaments === 'oui'" class="medical-row">
                    <strong>Medicaments:</strong> Oui
                    <template v-if="caseMedical.medicamentsDetails"> — {{ caseMedical.medicamentsDetails }}</template>
                </div>
                <div v-if="caseMedical.grossesse === 'oui'" class="medical-row medical-warning">
                    <strong>Grossesse:</strong> Oui
                </div>
                <div v-if="caseMedical.problemeVaccination === 'oui'" class="medical-row medical-warning">
                    <strong>Probleme de vaccination:</strong> Oui
                    <template v-if="caseMedical.problemeVaccinationDetails"> — {{ caseMedical.problemeVaccinationDetails }}</template>
                </div>
            </div>

            <!-- Consultations within this case -->
            <div class="consultations-header">
                <h5>Consultations ({{ consultations.length }})</h5>
                <button class="btn-primary btn-small" @click="showConsultTypeMenu = !showConsultTypeMenu">
                    + Nouvelle consultation
                </button>
            </div>
            <div v-if="showConsultTypeMenu" class="consult-type-menu">
                <template v-if="!isVaccinateur">
                    <button class="btn-primary btn-small" @click="onStartConsultation('consultation')">Consultation</button>
                    <button class="btn-primary btn-small" @click="onStartConsultation('teleconsultation')">Teleconsultation</button>
                </template>
                <button class="btn-success btn-small" @click="onStartConsultation('vaccination')">Vaccination</button>
            </div>

            <div v-if="consultations.length === 0 && !showConsultTypeMenu" class="no-data-message">
                Aucune consultation dans ce dossier.
            </div>

            <div v-for="consult in consultations" :key="consult.id"
                 class="consultation-card"
                 :class="{ expanded: isExpanded(consult.id) }">

                <div class="consultation-header" @click="toggleConsultation(consult.id)">
                    <span class="consultation-type">
                        {{ consultTypeLabel(consult.consultation_type) }}
                        <span v-if="consult.expand?.practitioner?.name" class="consultation-practitioner">· {{ consult.expand.practitioner.name }}</span>
                    </span>
                    <span class="consultation-date">
                        {{ formatDate(consult.date) }}
                        <template v-if="consult.duration_minutes"> · {{ consult.duration_minutes }} min</template>
                        <span class="expand-indicator">{{ isExpanded(consult.id) ? '&#9660;' : '&#9654;' }}</span>
                    </span>
                </div>

                <!-- Summary chips (always visible) -->
                <div v-if="consultSummary(consult).length" class="consultation-summary-chips">
                    <span v-for="tag in consultSummary(consult)" :key="tag" class="summary-chip">{{ tag }}</span>
                </div>

                <!-- Details (expanded by default) -->
                <div v-if="isExpanded(consult.id)" class="consultation-expand">

                    <div v-if="detailsLoading && !consultDetails[consult.id]?.loaded" class="consultation-loading">
                        Chargement...
                    </div>

                    <template v-else>
                        <div v-if="parseConsultNotes(consult.notes).conseils.length" class="history-section">
                            <div class="history-section-title">Conseils donnes</div>
                            <div class="conseils-chips">
                                <span v-for="c in parseConsultNotes(consult.notes).conseils" :key="c" class="conseil-chip">{{ c }}</span>
                            </div>
                        </div>

                        <div v-if="parseConsultNotes(consult.notes).notes" class="history-section">
                            <div class="history-section-title">Notes de consultation</div>
                            <div class="consultation-notes">{{ parseConsultNotes(consult.notes).notes }}</div>
                        </div>

                        <div v-if="consultDetails[consult.id]?.vaccines?.length" class="history-section">
                            <div class="history-section-title">Vaccins administres</div>
                            <div class="history-list">
                                <div v-for="v in consultDetails[consult.id].vaccines" :key="v.id">
                                    {{ v.vaccine_name || v.vaccine }}
                                    <span v-if="v.lot" style="color: #999;">(lot: {{ v.lot }})</span>
                                    <span v-if="v.site_injection" style="color: #999;"> — {{ v.site_injection }}</span>
                                </div>
                            </div>
                        </div>

                        <div v-if="consultDetails[consult.id]?.plannedVaccines?.length" class="history-section">
                            <div class="history-section-title">Vaccins planifies</div>
                            <div class="history-list">
                                {{ consultDetails[consult.id].plannedVaccines.join(', ') }}
                            </div>
                        </div>

                        <div v-if="consultDetails[consult.id]?.prescriptions?.length" class="history-section">
                            <div class="history-section-title">Ordonnance</div>
                            <div class="history-list">
                                <div v-for="p in consultDetails[consult.id].prescriptions" :key="p.id">
                                    <template v-if="p.medications?.length">
                                        <span v-for="(m, i) in p.medications" :key="i">
                                            {{ m.name || m }}<template v-if="i < p.medications.length - 1">, </template>
                                        </span>
                                    </template>
                                </div>
                            </div>
                        </div>

                        <div v-if="consultDetails[consult.id]?.loaded && !consultDetails[consult.id]?.vaccines?.length && !consultDetails[consult.id]?.prescriptions?.length && !parseConsultNotes(consult.notes).conseils.length && !parseConsultNotes(consult.notes).notes"
                             class="no-data-message" style="margin-top: 4px;">
                            Aucun detail enregistre
                        </div>
                    </template>
                </div>
            </div>

        </div>
        </Transition>
        </template>
    </div>
    `
};
