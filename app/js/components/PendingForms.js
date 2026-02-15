/**
 * Pending Forms Component
 * Shows forms awaiting processing + calendar integration
 *
 * Before: ~350 lines of innerHTML + onclick strings (lines 1683-2040)
 * After: reactive lists, v-for, @click
 */
import { useAuth } from '../composables/useAuth.js';
import { getPb } from '../api/pocketbase.js';
import * as secureApi from '../api/secure-api.js';
import { formatDateDisplay } from '../utils/formatting.js';
import FormLinkModal from './FormLinkModal.js';

// Module-level cache — survives component unmount/remount
const _forms = Vue.ref([]);
const _calendarEvents = Vue.ref([]);
const _calendarConfigured = Vue.ref(false);
const _unlinkedForms = Vue.ref([]);
let _lastLoaded = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function invalidatePendingFormsCache() {
    _lastLoaded = 0;
}

export default {
    name: 'PendingForms',

    components: { FormLinkModal },

    props: {
        embedded: { type: Boolean, default: false }
    },

    emits: ['form-selected', 'calendar-selected', 'manual-entry', 'back', 'patient-selected'],

    setup(props, { emit }) {
        const { location, isVaccinateur } = useAuth();
        const FORM_API_URL = 'https://form.traveldoctor.ch/api';

        function authHeaders() {
            try {
                const token = getPb().authStore.token;
                return token ? { 'Authorization': `Bearer ${token}` } : {};
            } catch { return {}; }
        }

        const forms = _forms;
        const calendarEvents = _calendarEvents;
        const calendarConfigured = _calendarConfigured;
        const unlinkedForms = _unlinkedForms;
        const loading = Vue.ref(false);
        const error = Vue.ref('');
        const searchTerm = Vue.ref('');
        const showLinkModal = Vue.ref(false);
        const linkModalEvent = Vue.ref(null);

        // ==================== Load data ====================

        async function loadPendingForms(force = true) {
            if (!force && _lastLoaded && (Date.now() - _lastLoaded < CACHE_TTL) && forms.value.length + calendarEvents.value.length > 0) {
                return; // use cached data
            }
            loading.value = true;
            error.value = '';
            try {
                const headers = authHeaders();
                const [formsRes, calRes] = await Promise.all([
                    fetch(`${FORM_API_URL}/get-pending-forms.php`, { headers, cache: 'no-store' }),
                    fetch(`${FORM_API_URL}/get-calendar-events.php?location_id=${location.value}`, { headers, cache: 'no-store' })
                        .catch(() => null)
                ]);

                const formsData = await formsRes.json();
                if (!formsData.success) throw new Error(formsData.error || 'Erreur');
                forms.value = formsData.forms || [];

                if (calRes?.ok) {
                    try {
                        const calData = await calRes.json();
                        if (calData.success) {
                            calendarEvents.value = calData.events || [];
                            calendarConfigured.value = calData.calendar_configured || false;
                            unlinkedForms.value = calData.unlinked_forms || [];
                        }
                    } catch (e) { /* ignore calendar parse errors */ }
                }
                _lastLoaded = Date.now();
            } catch (e) {
                error.value = e.message;
            } finally {
                loading.value = false;
            }
        }

        // ==================== Merge calendar + forms ====================

        const mergedItems = Vue.computed(() => {
            const merged = [];
            const matchedFormIds = new Set();

            // Calendar events first
            calendarEvents.value.forEach(evt => {
                const item = {
                    type: 'calendar',
                    patient_name: evt.patient_name,
                    appointment_date: evt.appointment_date,
                    appointment_time: evt.appointment_time,
                    dob: evt.dob || '',
                    email: evt.email || '',
                    form_id: evt.form_id || null,
                    form_status: evt.form_status || null,
                    suggested_form: evt.suggested_form || null,
                    phone: evt.phone || '',
                    consultation_type: evt.consultation_type || 'consultation',
                    is_known_patient: evt.is_known_patient || false,
                    existing_patient_id: evt.existing_patient_id || null,
                    calendar_event_id: evt.calendar_event_id || null
                };

                // Track matched form IDs (both confirmed and suggested)
                if (evt.form_id) matchedFormIds.add(evt.form_id);
                if (evt.suggested_form?.id) matchedFormIds.add(evt.suggested_form.id);

                if (evt.form_id) {
                    const form = forms.value.find(f => f.id === evt.form_id);
                    if (form) {
                        item.birthdate = form.birthdate || item.dob;
                        item.destination = form.destination || '';
                        item.avs = form.avs || '';
                        item.is_known_patient = form.is_known_patient;
                        item.existing_patient_id = form.existing_patient_id || item.existing_patient_id;
                    }
                } else if (evt.suggested_form?.id) {
                    const form = forms.value.find(f => f.id === evt.suggested_form.id);
                    if (form) {
                        item.birthdate = form.birthdate || item.dob;
                        item.destination = form.destination || '';
                    }
                }
                merged.push(item);
            });

            // Unmatched forms
            forms.value.forEach(form => {
                if (!matchedFormIds.has(form.id)) {
                    if (calendarConfigured.value && form.appointment_date) return;
                    merged.push({
                        type: 'form_only',
                        patient_name: form.patient_name,
                        appointment_date: form.appointment_date || '',
                        appointment_time: form.appointment_time || '',
                        birthdate: form.birthdate || '',
                        destination: form.destination || '',
                        avs: form.avs || '',
                        form_id: form.id,
                        form_status: form.status,
                        suggested_form: null,
                        is_known_patient: form.is_known_patient,
                        existing_patient_id: form.existing_patient_id
                    });
                }
            });

            return merged;
        });

        // ==================== Filter + group ====================

        const filteredItems = Vue.computed(() => {
            if (!searchTerm.value) return mergedItems.value;
            const term = searchTerm.value.toLowerCase();
            return mergedItems.value.filter(item =>
                (item.patient_name || '').toLowerCase().includes(term) ||
                (item.birthdate || item.dob || '').includes(term)
            );
        });

        const groupedByDate = Vue.computed(() => {
            const groups = {};
            filteredItems.value.forEach(item => {
                const key = item.appointment_date || '__no_date__';
                if (!groups[key]) groups[key] = [];
                groups[key].push(item);
            });

            // Sort within groups by time
            for (const key in groups) {
                groups[key].sort((a, b) => (a.appointment_time || '99:99').localeCompare(b.appointment_time || '99:99'));
            }

            return groups;
        });

        const sortedDateKeys = Vue.computed(() => {
            return Object.keys(groupedByDate.value).sort((a, b) => {
                if (a === '__no_date__') return 1;
                if (b === '__no_date__') return -1;
                return a.localeCompare(b);
            });
        });

        const today = new Date().toISOString().slice(0, 10);

        function dateLabel(dateKey) {
            if (dateKey === '__no_date__') return 'Sans RDV (walk-in)';
            const [y, m, d] = dateKey.split('-');
            const dateStr = `${d}.${m}.${y}`;
            if (dateKey === today) return `Aujourd'hui — ${dateStr}`;
            if (dateKey < today) return `${dateStr} (passe)`;
            return dateStr;
        }

        // ==================== Item state ====================

        function itemState(item) {
            if (item.form_id && item.form_status === 'processed') return 'processed';
            if (item.form_id && item.form_status === 'submitted') return 'form_received';
            if (item.form_id && item.form_status === 'draft') return 'draft_linked';
            if (item.type === 'calendar' && !item.form_id && item.suggested_form) return 'suggested_match';
            if (item.type === 'calendar' && !item.form_id) return 'awaiting_form';
            if (item.type === 'form_only' && item.form_status === 'draft') return 'draft';
            return 'form_received';
        }

        // Confirmation panel for suggested matches
        const confirmingItem = Vue.ref(null);

        function onClickItem(item) {
            const state = itemState(item);
            if (state === 'suggested_match') {
                // Toggle confirmation panel
                const key = item.calendar_event_id || (item.patient_name + item.appointment_time);
                const currentKey = confirmingItem.value?.calendar_event_id || (confirmingItem.value?.patient_name + confirmingItem.value?.appointment_time);
                confirmingItem.value = (currentKey === key) ? null : item;
            }
        }

        function onOpenPatient(item) {
            if (item.existing_patient_id) {
                emit('patient-selected', item.existing_patient_id);
            }
        }

        function onStartConsultation(item) {
            const type = item.consultation_type || 'consultation';
            const state = itemState(item);
            if ((state === 'form_received' || state === 'draft_linked') && item.form_id) {
                emit('form-selected', item.form_id, type);
            } else if (state === 'suggested_match') {
                confirmingItem.value = item;
            } else if (unlinkedForms.value.length > 0) {
                linkModalEvent.value = item;
                showLinkModal.value = true;
            } else {
                emit('calendar-selected', item);
            }
        }

        function consultTypeLabel(type) {
            const labels = { consultation: 'Consultation', teleconsultation: 'Teleconsultation', vaccination: 'Vaccination' };
            return labels[type] || 'Consultation';
        }

        async function acceptSuggestion(item) {
            const sf = item.suggested_form;
            if (!sf) return;
            confirmingItem.value = null;
            try {
                const headers = { ...authHeaders(), 'Content-Type': 'application/json' };
                const res = await fetch(`${FORM_API_URL}/link-form-calendar.php`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({ form_id: sf.id, calendar_event_id: item.calendar_event_id })
                });
                const data = await res.json();
                if (data.success) {
                    linkFeedback.value = 'ok';
                    setTimeout(() => linkFeedback.value = '', 3000);
                    emit('form-selected', sf.id);
                } else {
                    linkFeedback.value = 'error';
                    setTimeout(() => linkFeedback.value = '', 4000);
                }
            } catch (e) {
                console.error('Accept suggestion error:', e);
                linkFeedback.value = 'error';
                setTimeout(() => linkFeedback.value = '', 4000);
            }
        }

        function refuseSuggestion(item) {
            confirmingItem.value = null;
            // Open FormLinkModal to pick a different form or skip
            if (unlinkedForms.value.length > 0) {
                linkModalEvent.value = item;
                showLinkModal.value = true;
            } else {
                emit('calendar-selected', item);
            }
        }

        const linkFeedback = Vue.ref('');

        async function onLinkFormToEvent({ formId, calendarEventId }) {
            showLinkModal.value = false;
            try {
                const headers = { ...authHeaders(), 'Content-Type': 'application/json' };
                const res = await fetch(`${FORM_API_URL}/link-form-calendar.php`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({ form_id: formId, calendar_event_id: calendarEventId })
                });
                const data = await res.json();
                if (data.success) {
                    linkFeedback.value = 'ok';
                    setTimeout(() => linkFeedback.value = '', 3000);
                    // Auto-navigate to the linked form
                    emit('form-selected', formId);
                } else {
                    linkFeedback.value = 'error';
                    setTimeout(() => linkFeedback.value = '', 4000);
                }
            } catch (e) {
                console.error('Link error:', e);
                linkFeedback.value = 'error';
                setTimeout(() => linkFeedback.value = '', 4000);
            }
        }

        function onSkipLink(calendarEvent) {
            showLinkModal.value = false;
            emit('calendar-selected', calendarEvent);
        }

        function closeLinkModal() {
            showLinkModal.value = false;
            linkModalEvent.value = null;
        }

        // ==================== Init ====================

        Vue.onMounted(() => loadPendingForms(false));

        return {
            forms, loading, error, searchTerm,
            groupedByDate, sortedDateKeys, today,
            dateLabel, itemState, onClickItem, onOpenPatient, onStartConsultation, consultTypeLabel,
            loadPendingForms, formatDateDisplay, emit, isVaccinateur, props,
            showLinkModal, linkModalEvent, unlinkedForms,
            onLinkFormToEvent, onSkipLink, closeLinkModal, linkFeedback,
            confirmingItem, acceptSuggestion, refuseSuggestion
        };
    },

    template: `
    <div class="pending-forms-screen">
        <template v-if="!props.embedded">
            <button class="btn-secondary btn-small back-btn" @click="emit('back')">Retour</button>
            <h1>Formulaires en attente</h1>
        </template>

        <div class="pending-forms-header">
            <div class="pending-forms-search">
                <input type="text" v-model="searchTerm" placeholder="Filtrer par nom, date de naissance...">
                <button class="refresh-btn" @click="loadPendingForms" title="Actualiser">&#8635;</button>
            </div>
            <button v-if="!props.embedded && !isVaccinateur" class="manual-entry-btn" @click="emit('manual-entry')">
                Saisie manuelle (walk-in)
            </button>
        </div>

        <!-- Loading -->
        <div v-if="loading" class="no-forms-message">Chargement...</div>

        <!-- Error -->
        <div v-else-if="error" class="no-forms-message">
            Erreur: {{ error }}
            <button class="refresh-btn" @click="loadPendingForms">Reessayer</button>
        </div>

        <!-- Empty -->
        <div v-else-if="sortedDateKeys.length === 0" class="no-forms-message">
            Aucun rendez-vous
        </div>

        <!-- Form cards grouped by date -->
        <template v-else>
            <div v-for="dateKey in sortedDateKeys" :key="dateKey">
                <div class="form-date-header" :class="{ today: dateKey === today, past: dateKey < today && dateKey !== '__no_date__' }">
                    {{ dateLabel(dateKey) }}
                </div>

                <div v-for="item in groupedByDate[dateKey]" :key="item.form_id || item.calendar_event_id || item.patient_name + item.appointment_time">
                    <div class="form-card"
                         :class="{
                             'status-received': itemState(item) === 'form_received',
                             'status-awaiting': itemState(item) === 'awaiting_form',
                             'status-suggested': itemState(item) === 'suggested_match',
                             'status-draft-linked': itemState(item) === 'draft_linked',
                             'status-draft': itemState(item) === 'draft',
                             'status-processed': itemState(item) === 'processed'
                         }"
                         @click="onClickItem(item)">
                        <div v-if="item.appointment_time" class="appointment-time">
                            {{ item.appointment_time }}
                        </div>
                        <div class="form-card-info">
                            <div class="form-card-name">
                                <a v-if="item.is_known_patient && item.existing_patient_id"
                                   href="#" class="patient-link"
                                   @click.stop.prevent="onOpenPatient(item)">{{ item.patient_name || 'Sans nom' }}</a>
                                <template v-else>{{ item.patient_name || 'Sans nom' }}</template>
                            </div>
                            <div class="form-card-details">
                                <span v-if="item.birthdate || item.dob">{{ formatDateDisplay(item.birthdate || item.dob) }}</span>
                                <span v-if="item.destination"> &middot; {{ item.destination }}</span>
                            </div>
                        </div>
                        <div class="form-card-badges">
                            <span v-if="itemState(item) === 'processed'" class="form-card-badge badge-processed">TERMINE</span>
                            <span v-else-if="itemState(item) === 'form_received'" class="form-card-badge badge-form-received">FORM: CONFIRMÉ</span>
                            <span v-else-if="itemState(item) === 'suggested_match'" class="form-card-badge badge-suggested">FORM: À CONFIRMER</span>
                            <span v-else-if="itemState(item) === 'draft_linked'" class="form-card-badge badge-draft-linked">FORM: ENVOYÉ</span>
                            <span v-else-if="itemState(item) === 'awaiting_form'" class="form-card-badge badge-awaiting-form">FORM: NON ENVOYÉ</span>
                            <span v-else-if="itemState(item) === 'draft'" class="form-card-badge badge-draft">BROUILLON</span>

                            <span v-if="!item.is_known_patient && itemState(item) === 'form_received'" class="form-card-badge badge-new">NOUVEAU</span>

                            <button v-if="itemState(item) !== 'processed'"
                                    class="btn-primary btn-small consultation-start-btn"
                                    @click.stop="onStartConsultation(item)">
                                {{ consultTypeLabel(item.consultation_type) }}
                            </button>
                        </div>
                    </div>
                    <!-- Suggestion confirmation panel -->
                    <div v-if="confirmingItem && itemState(item) === 'suggested_match' && (item.calendar_event_id || item.patient_name + item.appointment_time) === (confirmingItem.calendar_event_id || confirmingItem.patient_name + confirmingItem.appointment_time)"
                         class="suggestion-confirm">
                        <div class="suggestion-confirm-info">
                            <strong>Correspondance: {{ item.suggested_form.match_field }}</strong>
                            <div class="suggestion-confirm-details">
                                {{ item.suggested_form.status === 'submitted' ? 'Formulaire soumis' : 'Brouillon' }}
                            </div>
                        </div>
                        <div class="suggestion-confirm-actions">
                            <button class="btn-success btn-small" @click.stop="acceptSuggestion(item)">Accepter</button>
                            <button class="btn-secondary btn-small" @click.stop="refuseSuggestion(item)">Refuser</button>
                        </div>
                    </div>
                </div>
            </div>
        </template>

        <!-- Manual link modal -->
        <FormLinkModal
            v-if="showLinkModal && linkModalEvent"
            :calendar-event="linkModalEvent"
            :unlinked-forms="unlinkedForms"
            @link="onLinkFormToEvent"
            @skip="onSkipLink"
            @close="closeLinkModal"
        />

        <!-- Link feedback toast -->
        <div v-if="linkFeedback" class="link-toast" :class="'link-toast-' + linkFeedback">
            {{ linkFeedback === 'ok' ? 'Formulaire lie avec succes' : 'Erreur lors de la liaison' }}
        </div>
    </div>
    `
};
