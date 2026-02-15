/**
 * Chronometer composable
 * Tracks consultation duration with sessionStorage persistence
 */

const { ref, computed } = Vue;

const STORAGE_KEY = 'chrono_state';

const elapsed = ref(0);
const isPaused = ref(false);
const isRunning = ref(false);
const finalTime = ref(null);

let interval = null;
let startTime = null;

function formatTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function persistState() {
    if (isRunning.value) {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
            elapsed: elapsed.value,
            isPaused: isPaused.value,
            isRunning: true,
            startedAt: Date.now() - elapsed.value
        }));
    } else {
        sessionStorage.removeItem(STORAGE_KEY);
    }
}

function startInterval() {
    if (interval) return;
    startTime = Date.now() - elapsed.value;
    interval = setInterval(() => {
        if (!isPaused.value) {
            elapsed.value = Date.now() - startTime;
        }
    }, 1000);
}

// Restore state on module load
try {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved) {
        const state = JSON.parse(saved);
        if (state.isRunning) {
            isRunning.value = true;
            isPaused.value = state.isPaused;
            elapsed.value = state.isPaused ? state.elapsed : Date.now() - state.startedAt;
            if (!state.isPaused) {
                startInterval();
            }
        }
    }
} catch (e) { /* ignore corrupt storage */ }

export function useChronometer() {

    const display = computed(() => formatTime(elapsed.value));
    const elapsedMinutes = computed(() => Math.floor(elapsed.value / 60000));

    const statusText = computed(() => {
        if (finalTime.value) return 'Termine';
        if (isPaused.value) return 'En pause';
        if (isRunning.value) return 'En cours...';
        return '';
    });

    function start() {
        if (interval) return;
        finalTime.value = null;
        isPaused.value = false;
        isRunning.value = true;
        startInterval();
        persistState();
    }

    function toggle() {
        isPaused.value = !isPaused.value;
        if (!isPaused.value) {
            startTime = Date.now() - elapsed.value;
        }
        persistState();
    }

    function stop() {
        if (interval) {
            clearInterval(interval);
            interval = null;
        }
        isRunning.value = false;
        finalTime.value = formatTime(elapsed.value);
        sessionStorage.removeItem(STORAGE_KEY);
        return finalTime.value;
    }

    function reset() {
        if (interval) {
            clearInterval(interval);
            interval = null;
        }
        elapsed.value = 0;
        isPaused.value = false;
        isRunning.value = false;
        finalTime.value = null;
        startTime = null;
        sessionStorage.removeItem(STORAGE_KEY);
    }

    return {
        elapsed,
        isPaused,
        isRunning,
        finalTime,
        display,
        elapsedMinutes,
        statusText,
        start,
        toggle,
        stop,
        reset
    };
}
