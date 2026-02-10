/**
 * Authentication composable
 * Manages login state, current user, current location
 */
import { login as pbLogin, logout as pbLogout, getCurrentUser, isAuthenticated, fetchLocations } from '../api/pocketbase.js';

const { ref, computed } = Vue;

// Shared reactive state (singleton across all components)
const user = ref(null);
const location = ref(null);
const locationName = ref('');
const locations = ref([]);
const isOnline = ref(false);

export function useAuth() {
    const isLoggedIn = computed(() => !!user.value);
    const isAdmin = computed(() => user.value?.role === 'admin');
    const userName = computed(() => user.value?.name || user.value?.email || '');

    async function login(email, password) {
        user.value = null; // Reset to ensure watcher detects the change
        await pbLogin(email, password);
        user.value = getCurrentUser();
    }

    function logout() {
        pbLogout();
        user.value = null;
        location.value = null;
        locationName.value = '';
    }

    async function loadLocations() {
        locations.value = await fetchLocations();
    }

    function selectLocation(locationId) {
        const loc = locations.value.find(l => l.id === locationId);
        if (!loc) return;
        location.value = loc.id;
        locationName.value = loc.name;
    }

    // Restore session if token is still valid
    function restoreSession() {
        if (isAuthenticated()) {
            user.value = getCurrentUser();
            return true;
        }
        return false;
    }

    return {
        user,
        location,
        locationName,
        locations,
        isOnline,
        isLoggedIn,
        isAdmin,
        userName,
        login,
        logout,
        loadLocations,
        selectLocation,
        restoreSession
    };
}
