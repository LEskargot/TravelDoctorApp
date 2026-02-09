/**
 * Chronometer Component
 * Floating consultation timer
 *
 * Before: fixed-position div + 6 functions doing getElementById (lines 3071-3127)
 * After: reactive display, no DOM manipulation
 */
import { useChronometer } from '../composables/useChronometer.js';

export default {
    name: 'Chronometer',

    setup() {
        const { display, isPaused, isRunning, finalTime, statusText, toggle, reset } = useChronometer();
        return { display, isPaused, isRunning, finalTime, statusText, toggle, reset };
    },

    template: `
    <div class="chronometer-section" v-if="isRunning || finalTime">
        <div>
            <div class="chronometer-label">Consultation</div>
            <div class="chronometer-display">{{ display }}</div>
            <div class="chronometer-status">{{ statusText }}</div>
        </div>
        <div class="chronometer-controls" v-if="isRunning">
            <button class="btn-small" :class="isPaused ? 'btn-success' : 'btn-secondary'" @click="toggle">
                {{ isPaused ? 'Reprendre' : 'Pause' }}
            </button>
            <button class="btn-small btn-secondary" @click="reset">Reset</button>
        </div>
    </div>
    <div v-if="finalTime" class="chronometer-final">
        Consultation terminee — Duree totale: <strong>{{ finalTime }}</strong>
    </div>
    `
};
