/**
 * Root application component
 *
 * Simple screen-based routing using reactive state.
 * No vue-router needed for this scale of app.
 *
 * Screens: login → location → home → (patient search + case view)
 */
import { initPocketBase, checkConnection } from './api/pocketbase.js';
import { useAuth } from './composables/useAuth.js';
import { usePatient } from './composables/usePatient.js';
import { useCase } from './composables/useCase.js';

import LoginScreen from './components/LoginScreen.js';
import PatientSearch from './components/PatientSearch.js';
import CaseView from './components/CaseView.js';

const { createApp, ref, computed, onMounted } = Vue;

const App = {
    components: { LoginScreen, PatientSearch, CaseView },

    setup() {
        const {
            isLoggedIn, userName, location, locationName, locations, isOnline,
            loadLocations, selectLocation, restoreSession, logout
        } = useAuth();

        const { currentPatient, clearPatient } = usePatient();
        const { clearCases } = useCase();

        // Screen routing
        const screen = ref('login'); // login | location | home | consultation
        const selectedLocationId = ref('');

        const connectionStatus = ref('connecting');

        // Initialize
        onMounted(async () => {
            initPocketBase();

            const connected = await checkConnection();
            connectionStatus.value = connected ? 'online' : 'offline';
            isOnline.value = connected;

            if (restoreSession()) {
                await loadLocations();
                screen.value = 'location';
            }
        });

        // Watch login state to advance screens
        function onLoginSuccess() {
            screen.value = 'location';
        }

        function onConfirmLocation() {
            if (!selectedLocationId.value) return;
            selectLocation(selectedLocationId.value);
            screen.value = 'home';
        }

        function onLogout() {
            logout();
            clearPatient();
            clearCases();
            screen.value = 'login';
        }

        function goToConsultation() {
            screen.value = 'consultation';
        }

        function returnToHome() {
            clearPatient();
            clearCases();
            screen.value = 'home';
        }

        function onPatientSelected() {
            // Patient loaded — stay on same screen, CaseView will appear
        }

        function onStartConsultation(details) {
            // This would open the full consultation form
            // (vaccines, prescription, notes — to be built as separate components)
            console.log('Start consultation:', details);
            alert(`Demarrer une ${details.type} pour le dossier ${details.caseId}\n\n(Les composants vaccins, ordonnance et notes seraient charges ici)`);
        }

        return {
            screen, connectionStatus, isLoggedIn, userName,
            location, locationName, locations, selectedLocationId,
            currentPatient,
            onLoginSuccess, onConfirmLocation, onLogout,
            goToConsultation, returnToHome,
            onPatientSelected, onStartConsultation
        };
    },

    template: `
    <div class="connection-indicator" :class="connectionStatus">
        <span class="connection-dot"></span>
        <span>{{ connectionStatus === 'online' ? 'Connecte' : connectionStatus === 'offline' ? 'Hors ligne' : 'Connexion...' }}</span>
    </div>

    <div class="container">
        <!-- LOGIN -->
        <LoginScreen v-if="screen === 'login'" />

        <!-- LOCATION SELECTION -->
        <div v-else-if="screen === 'location'" class="location-screen">
            <h1>Travel Doctor App</h1>
            <h2>Selectionnez votre lieu de travail</h2>
            <div class="location-selector">
                <select v-model="selectedLocationId">
                    <option value="">-- Choisir --</option>
                    <option v-for="loc in locations" :key="loc.id" :value="loc.id">
                        {{ loc.name }}
                    </option>
                </select>
                <button class="btn-success" @click="onConfirmLocation" style="margin-top: 15px;">
                    Continuer
                </button>
            </div>
        </div>

        <!-- HOME -->
        <div v-else-if="screen === 'home'" class="home-screen">
            <div class="user-header">
                <div class="user-info">
                    <span class="user-name">{{ userName }}</span>
                    <span class="location-badge">{{ locationName }}</span>
                </div>
                <button class="logout-btn" @click="onLogout">Deconnexion</button>
            </div>

            <h1>Travel Doctor App</h1>

            <!-- Patient search + case view side by side -->
            <PatientSearch @patient-selected="onPatientSelected" />

            <CaseView v-if="currentPatient"
                      @start-consultation="onStartConsultation" />
        </div>

        <!-- CONSULTATION (placeholder) -->
        <div v-else-if="screen === 'consultation'">
            <button class="btn-secondary btn-small" @click="returnToHome">Retour</button>
            <p>Consultation form components would go here (vaccines, prescription, notes...)</p>
        </div>
    </div>
    `
};

// Mount
createApp(App).mount('#app');
