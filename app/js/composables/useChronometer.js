/**
 * Chronometer composable
 * Tracks consultation duration
 *
 * Before: 6 global variables + 6 functions doing getElementById (lines 3071-3127)
 * After: reactive state, no DOM access
 */

const { ref, computed } = Vue;

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
        startTime = Date.now() - elapsed.value;
        isPaused.value = false;
        isRunning.value = true;
        interval = setInterval(() => {
            if (!isPaused.value) {
                elapsed.value = Date.now() - startTime;
            }
        }, 1000);
    }

    function toggle() {
        isPaused.value = !isPaused.value;
        if (!isPaused.value) {
            startTime = Date.now() - elapsed.value;
        }
    }

    function stop() {
        if (interval) {
            clearInterval(interval);
            interval = null;
        }
        isRunning.value = false;
        finalTime.value = formatTime(elapsed.value);
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
