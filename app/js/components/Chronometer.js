/**
 * Chronometer Component
 * Floating consultation timer with minimize/expand
 */
import { useChronometer } from '../composables/useChronometer.js';

export default {
    name: 'Chronometer',

    setup() {
        const { display, isPaused, isRunning, finalTime, statusText, toggle, reset } = useChronometer();
        const isMinimized = Vue.ref(sessionStorage.getItem('chrono_minimized') === 'true');

        function toggleMinimize() {
            isMinimized.value = !isMinimized.value;
            sessionStorage.setItem('chrono_minimized', isMinimized.value);
        }

        return { display, isPaused, isRunning, finalTime, statusText, toggle, reset, isMinimized, toggleMinimize };
    },

    template: `
    <div class="chronometer" :class="{ minimized: isMinimized }" v-if="isRunning || finalTime"
         @click="isMinimized && toggleMinimize()">
        <template v-if="isMinimized">
            <div class="chrono-time">{{ display }}</div>
        </template>
        <template v-else>
            <div>
                <div class="chrono-label">Consultation</div>
                <div class="chrono-time">{{ display }}</div>
                <div class="chrono-status">{{ statusText }}</div>
            </div>
            <div class="chrono-controls" v-if="isRunning">
                <button class="btn-small" :class="isPaused ? 'btn-success' : 'btn-secondary'" @click="toggle">
                    {{ isPaused ? 'Reprendre' : 'Pause' }}
                </button>
                <button class="btn-small btn-secondary" @click="reset">Reset</button>
                <button class="btn-small btn-secondary" @click="toggleMinimize" title="Reduire">&minus;</button>
            </div>
        </template>
    </div>
    <div v-if="finalTime && !isMinimized" class="chronometer-final">
        Consultation terminee — Duree totale: <strong>{{ finalTime }}</strong>
    </div>
    `
};
