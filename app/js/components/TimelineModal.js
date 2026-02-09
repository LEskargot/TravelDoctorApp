/**
 * Timeline Modal Component
 * Shows patient consultation history in a visual timeline
 *
 * Before: showPatientTimeline() building innerHTML (lines 2304-2423)
 * After: reactive modal with v-for
 */
import { usePatient } from '../composables/usePatient.js';
import { useCase } from '../composables/useCase.js';
import { formatDateDisplay } from '../utils/formatting.js';

export default {
    name: 'TimelineModal',

    props: {
        visible: { type: Boolean, default: false }
    },

    emits: ['close'],

    setup(props, { emit }) {
        const { currentPatient, patientName, observations } = usePatient();
        const { cases, consultations } = useCase();

        // Build timeline items from cases + consultations
        const timelineItems = Vue.computed(() => {
            const items = [];

            // Add consultation items
            cases.value.forEach(c => {
                items.push({
                    type: 'case',
                    date: c.opened_at,
                    title: `Dossier: ${caseTypeLabel(c.type)}`,
                    status: c.status,
                    destinations: c.voyage?.destinations?.join(', ') || '',
                    id: c.id
                });
            });

            // We'd need to load all consultations across cases for a full timeline
            // For now, show what we have
            consultations.value.forEach(consult => {
                items.push({
                    type: 'consultation',
                    date: consult.date,
                    title: consultTypeLabel(consult.consultation_type),
                    notes: consult.notes,
                    duration: consult.duration_minutes,
                    id: consult.id
                });
            });

            // Add observations
            observations.value.forEach(obs => {
                items.push({
                    type: 'observation',
                    date: obs.date,
                    title: `${obs.type}: ${obs.value}${obs.unit ? ' ' + obs.unit : ''}`,
                    id: obs.id || obs.date + obs.type
                });
            });

            // Sort by date descending
            items.sort((a, b) => new Date(b.date) - new Date(a.date));
            return items;
        });

        function caseTypeLabel(type) {
            const labels = { voyage: 'Voyage', rappel_seul: 'Rappel', suivi: 'Suivi' };
            return labels[type] || type;
        }

        function consultTypeLabel(type) {
            const labels = {
                teleconsultation: 'Teleconsultation',
                vaccination: 'Vaccination',
                rappel: 'Rappel',
                suivi: 'Suivi',
                consultation_voyage: 'Consultation voyage'
            };
            return labels[type] || type;
        }

        function dotClass(item) {
            if (item.type === 'case') return 'dot-case';
            if (item.type === 'observation') return 'dot-observation';
            return 'dot-consultation';
        }

        return { patientName, timelineItems, formatDateDisplay, dotClass, emit };
    },

    template: `
    <div v-if="visible" class="modal-overlay" @click.self="emit('close')">
        <div class="modal-content">
            <div class="modal-header">
                <h2>Timeline — {{ patientName }}</h2>
                <button class="modal-close" @click="emit('close')">x</button>
            </div>
            <div class="modal-body">
                <div v-if="timelineItems.length === 0" class="no-data-message">
                    Aucun historique disponible.
                </div>

                <div v-else class="timeline">
                    <div v-for="item in timelineItems" :key="item.id" class="timeline-item">
                        <div class="timeline-dot" :class="dotClass(item)"></div>
                        <div class="timeline-date">{{ formatDateDisplay(item.date) }}</div>
                        <div class="timeline-content">
                            <div class="timeline-title">
                                {{ item.title }}
                                <span v-if="item.status" class="case-status" :class="item.status">
                                    {{ item.status }}
                                </span>
                            </div>
                            <div v-if="item.destinations" class="timeline-details">
                                {{ item.destinations }}
                            </div>
                            <div v-if="item.notes" class="timeline-details">{{ item.notes }}</div>
                            <div v-if="item.duration" class="timeline-details">
                                {{ item.duration }} min
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    `
};
