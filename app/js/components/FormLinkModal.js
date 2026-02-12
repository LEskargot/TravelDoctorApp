/**
 * FormLinkModal Component
 * Shows when practitioner clicks an unmatched calendar event.
 * Displays ranked unlinked forms for manual linking.
 */
export default {
    name: 'FormLinkModal',

    props: {
        calendarEvent: { type: Object, required: true },
        unlinkedForms: { type: Array, default: () => [] }
    },

    emits: ['link', 'skip', 'close'],

    setup(props, { emit }) {
        const selectedFormId = Vue.ref(null);

        // Score each unlinked form against the calendar event
        const scoredForms = Vue.computed(() => {
            const evtEmail = (props.calendarEvent.email || '').toLowerCase().trim();
            const evtPhone = normalizePhone(props.calendarEvent.phone || '');
            const evtName = normalizeName(props.calendarEvent.patient_name || '');
            const evtDob = props.calendarEvent.dob || '';
            const evtDate = props.calendarEvent.appointment_date || '';

            return props.unlinkedForms
                .map(form => {
                    let score = 0;

                    // Email exact match: +40
                    const formEmail = (form.email || '').toLowerCase().trim();
                    if (evtEmail && formEmail && evtEmail === formEmail) score += 40;

                    // Phone match (normalized): +30
                    const formPhone = normalizePhone(form.phone || '');
                    if (evtPhone && formPhone && evtPhone === formPhone) score += 30;

                    // Name similarity: +20
                    const formName = normalizeName(form.patient_name || '');
                    if (evtName && formName) {
                        if (evtName === formName) {
                            score += 20;
                        } else if (evtName.includes(formName) || formName.includes(evtName)) {
                            score += 15;
                        }
                    }

                    // DOB exact match: +20
                    if (evtDob && form.dob && evtDob === form.dob) score += 20;

                    // Appointment date match: +10
                    if (evtDate && form.appointment_date && evtDate === form.appointment_date) score += 10;

                    return { ...form, score };
                })
                .filter(f => f.score > 0)
                .sort((a, b) => b.score - a.score)
                .slice(0, 5);
        });

        // Auto-select first if only one or very high score
        Vue.watch(scoredForms, (forms) => {
            if (forms.length === 1) {
                selectedFormId.value = forms[0].id;
            } else if (forms.length > 0 && forms[0].score >= 60) {
                selectedFormId.value = forms[0].id;
            }
        }, { immediate: true });

        function onLink() {
            if (selectedFormId.value) {
                emit('link', {
                    formId: selectedFormId.value,
                    calendarEventId: props.calendarEvent.calendar_event_id
                });
            }
        }

        function onSkip() {
            emit('skip', props.calendarEvent);
        }

        function formatDob(dob) {
            if (!dob) return '';
            const [y, m, d] = dob.split('-');
            return `${d}.${m}.${y}`;
        }

        function scoreLabel(score) {
            const maxScore = 120; // 40+30+20+20+10
            const pct = Math.round((score / maxScore) * 100);
            return pct + '%';
        }

        function scoreClass(score) {
            if (score >= 60) return 'score-high';
            if (score >= 30) return 'score-medium';
            return 'score-low';
        }

        // Simple name normalizer (remove accents, lowercase, trim)
        function normalizeName(str) {
            if (!str) return '';
            return str.toLowerCase()
                .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                .replace(/\[od\]\s*-?\s*/i, '')
                .replace(/\s+/g, ' ')
                .trim();
        }

        // Phone normalizer: strip non-digits, remove +41/0041/leading 0, last 9 digits
        function normalizePhone(phone) {
            if (!phone) return '';
            let digits = phone.replace(/\D/g, '');
            if (digits.startsWith('0041')) digits = digits.slice(4);
            else if (digits.startsWith('41') && digits.length > 10) digits = digits.slice(2);
            else if (digits.startsWith('0')) digits = digits.slice(1);
            return digits.slice(-9);
        }

        return {
            selectedFormId, scoredForms,
            onLink, onSkip, formatDob, scoreLabel, scoreClass, emit
        };
    },

    template: `
    <div class="modal-overlay" @click.self="emit('close')">
        <div class="modal-content form-link-modal">
            <div class="modal-header">
                <h3>Lier un formulaire</h3>
                <button class="modal-close-btn" @click="emit('close')">&times;</button>
            </div>

            <div class="modal-body">
                <!-- Calendar event info -->
                <div class="link-event-info">
                    <strong>{{ calendarEvent.patient_name }}</strong>
                    <span v-if="calendarEvent.appointment_date">
                        — {{ calendarEvent.appointment_date.split('-').reverse().join('.') }}
                        <span v-if="calendarEvent.appointment_time">{{ calendarEvent.appointment_time }}</span>
                    </span>
                </div>

                <!-- Scored forms list -->
                <div v-if="scoredForms.length > 0" class="link-forms-list">
                    <p class="link-forms-label">Formulaires non lies :</p>

                    <label v-for="form in scoredForms" :key="form.id"
                           class="form-link-item"
                           :class="{ selected: selectedFormId === form.id }">
                        <input type="radio" :value="form.id" v-model="selectedFormId" class="form-link-radio">
                        <div class="form-link-details">
                            <div class="form-link-name">{{ form.patient_name }}</div>
                            <div class="form-link-meta">
                                <span v-if="form.dob">{{ formatDob(form.dob) }}</span>
                                <span v-if="form.email"> &middot; {{ form.email }}</span>
                            </div>
                        </div>
                        <span class="similarity-score" :class="scoreClass(form.score)">
                            {{ scoreLabel(form.score) }}
                        </span>
                    </label>
                </div>

                <div v-else class="no-forms-message" style="padding: 20px 0; text-align: center; color: #999;">
                    Aucun formulaire correspondant trouve
                </div>
            </div>

            <div class="modal-footer">
                <button class="btn-primary" @click="onLink" :disabled="!selectedFormId">
                    Lier le formulaire selectionne
                </button>
                <button class="btn-secondary" @click="onSkip">
                    Continuer sans formulaire
                </button>
            </div>
        </div>
    </div>
    `
};
