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

export default {
    name: 'PendingForms',

    emits: ['form-selected', 'calendar-selected', 'manual-entry', 'back'],

    setup(props, { emit }) {
        const { location } = useAuth();
        const FORM_API_URL = 'https://form.traveldoctor.ch/api';

        function authHeaders() {
            try {
                const token = getPb().authStore.token;
                return token ? { 'Authorization': `Bearer ${token}` } : {};
            } catch { return {}; }
        }

        const forms = Vue.ref([]);
        const calendarEvents = Vue.ref([]);
        const calendarConfigured = Vue.ref(false);
        const loading = Vue.ref(false);
        const error = Vue.ref('');
        const searchTerm = Vue.ref('');

        // ==================== Load data ====================

        async function loadPendingForms() {
            loading.value = true;
            error.value = '';
            try {
                const headers = authHeaders();
                const [formsRes, calRes] = await Promise.all([
                    fetch(`${FORM_API_URL}/get-pending-forms.php`, { headers }),
                    fetch(`${FORM_API_URL}/get-calendar-events.php?location_id=${location.value}`, { headers })
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
                        }
                    } catch (e) { /* ignore calendar parse errors */ }
                }
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
                    phone: evt.phone || '',
                    is_known_patient: evt.is_known_patient || false,
                    existing_patient_id: evt.existing_patient_id || null
                };

                if (evt.form_id) {
                    matchedFormIds.add(evt.form_id);
                    const form = forms.value.find(f => f.id === evt.form_id);
                    if (form) {
                        item.birthdate = form.birthdate || item.dob;
                        item.destination = form.destination || '';
                        item.avs = form.avs || '';
                        item.is_known_patient = form.is_known_patient;
                        item.existing_patient_id = form.existing_patient_id || item.existing_patient_id;
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
            if (item.form_id && item.form_status === 'submitted') return 'form_received';
            if (item.form_id && item.form_status === 'draft') return 'awaiting_form';
            if (item.type === 'calendar' && !item.form_id) return 'awaiting_form';
            if (item.type === 'form_only' && item.form_status === 'draft') return 'draft';
            return 'form_received';
        }

        function onClickItem(item) {
            const state = itemState(item);
            if (state === 'form_received' && item.form_id) {
                emit('form-selected', item.form_id);
            } else if (state === 'awaiting_form') {
                emit('calendar-selected', item);
            }
        }

        // ==================== Init ====================

        Vue.onMounted(() => loadPendingForms());

        return {
            forms, loading, error, searchTerm,
            groupedByDate, sortedDateKeys, today,
            dateLabel, itemState, onClickItem,
            loadPendingForms, formatDateDisplay, emit
        };
    },

    template: `
    <div class="pending-forms-screen">
        <button class="btn-secondary btn-small back-btn" @click="emit('back')">Retour</button>

        <h1>Formulaires en attente</h1>

        <div class="pending-forms-header">
            <div class="pending-forms-search">
                <input type="text" v-model="searchTerm" placeholder="Rechercher par nom, date de naissance...">
                <button class="refresh-btn" @click="loadPendingForms">Actualiser</button>
            </div>
            <button class="manual-entry-btn" @click="emit('manual-entry')">
                Saisie manuelle (walk-in)
            </button>
        </div>

        <!-- Loading -->
        <div v-if="loading" class="no-forms-message">Chargement des formulaires...</div>

        <!-- Error -->
        <div v-else-if="error" class="no-forms-message">
            Erreur: {{ error }}
            <button class="refresh-btn" @click="loadPendingForms">Reessayer</button>
        </div>

        <!-- Empty -->
        <div v-else-if="sortedDateKeys.length === 0" class="no-forms-message">
            Aucun formulaire en attente
        </div>

        <!-- Form cards grouped by date -->
        <template v-else>
            <div v-for="dateKey in sortedDateKeys" :key="dateKey">
                <div class="form-date-header" :class="{ today: dateKey === today, past: dateKey < today && dateKey !== '__no_date__' }">
                    {{ dateLabel(dateKey) }}
                </div>

                <div v-for="item in groupedByDate[dateKey]" :key="item.form_id || item.patient_name + item.appointment_time"
                     class="form-card"
                     :class="{
                         'awaiting-card': itemState(item) === 'awaiting_form',
                         'draft-card': itemState(item) === 'draft'
                     }"
                     @click="onClickItem(item)">
                    <div class="form-card-info">
                        <div class="form-card-name">{{ item.patient_name || 'Sans nom' }}</div>
                        <div class="form-card-details">
                            <span v-if="item.birthdate || item.dob">{{ formatDateDisplay(item.birthdate || item.dob) }}</span>
                            <span v-if="item.destination">{{ item.destination }}</span>
                            <span v-if="item.avs">{{ item.avs }}</span>
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <span v-if="itemState(item) === 'form_received'" class="form-card-badge badge-form-received">FORMULAIRE RECU</span>
                        <span v-else-if="itemState(item) === 'awaiting_form'" class="form-card-badge badge-awaiting-form">EN ATTENTE DU FORMULAIRE</span>
                        <span v-else-if="itemState(item) === 'draft'" class="form-card-badge badge-draft">EN ATTENTE</span>

                        <span v-if="item.is_known_patient" class="form-card-badge badge-known">CONNU</span>
                        <span v-else-if="itemState(item) === 'form_received'" class="form-card-badge badge-new">NOUVEAU</span>

                        <div v-if="item.appointment_time" class="form-card-date">{{ item.appointment_time }}</div>
                    </div>
                </div>
            </div>
        </template>
    </div>
    `
};
