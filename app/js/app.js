/**
 * Root application component
 *
 * Simple screen-based routing using reactive state.
 * No vue-router needed for this scale of app.
 *
 * Screens: login → location → home → (pending_forms | consultation)
 */
import { initPocketBase, checkConnection } from './api/pocketbase.js';
import * as secureApi from './api/secure-api.js';
import { useAuth } from './composables/useAuth.js';
import { usePatient } from './composables/usePatient.js';
import { useCase } from './composables/useCase.js';
import { useVaccines } from './composables/useVaccines.js';
import { usePrescription } from './composables/usePrescription.js';
import { useChronometer } from './composables/useChronometer.js';

import LoginScreen from './components/LoginScreen.js';
import PatientSearch from './components/PatientSearch.js';
import CaseView from './components/CaseView.js';
import ConsultationForm from './components/ConsultationForm.js';
import PendingForms from './components/PendingForms.js';
import TimelineModal from './components/TimelineModal.js';

const { createApp, ref, computed, watch, onMounted } = Vue;

const App = {
    components: { LoginScreen, PatientSearch, CaseView, ConsultationForm, PendingForms, TimelineModal },

    setup() {
        const {
            isLoggedIn, userName, isAdmin, location, locationName, locations, isOnline,
            loadLocations, selectLocation, restoreSession, logout
        } = useAuth();

        const { currentPatient, clearPatient, selectPatient } = usePatient();
        const { clearCases, createNewCase, selectCase, loadCasesForPatient, setFormData } = useCase();
        const vaccines = useVaccines();
        const prescription = usePrescription();
        const chrono = useChronometer();

        // Screen routing
        const screen = ref('login'); // login | location | home | pending_forms | consultation
        const selectedLocationId = ref('');
        const consultationType = ref('teleconsultation');
        const showTimeline = ref(false);
        const connectionStatus = ref('connecting');

        // Watch login state for auto-transition
        watch(isLoggedIn, (loggedIn) => {
            if (loggedIn && screen.value === 'login') {
                screen.value = 'location';
            }
            if (!loggedIn) {
                screen.value = 'login';
            }
        });

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

        // ==================== Navigation ====================

        function onConfirmLocation() {
            if (!selectedLocationId.value) return;
            selectLocation(selectedLocationId.value);
            screen.value = 'home';
        }

        function onLogout() {
            logout();
            clearPatient();
            clearCases();
            vaccines.clearAll();
            prescription.clearAll();
            chrono.reset();
            screen.value = 'login';
        }

        function goToPendingForms() {
            screen.value = 'pending_forms';
        }

        function startNewPatient() {
            clearPatient();
            clearCases();
            consultationType.value = 'vaccination';
            screen.value = 'consultation';
        }

        function returnToHome() {
            clearPatient();
            clearCases();
            vaccines.clearAll();
            prescription.clearAll();
            chrono.reset();
            screen.value = 'home';
        }

        // ==================== Patient/Case events ====================

        function onPatientSelected() {
            // Patient loaded — CaseView will appear with their cases
        }

        function onStartConsultation(details) {
            consultationType.value = details.type;
            screen.value = 'consultation';
        }

        // ==================== Pending forms events ====================

        async function onFormSelected(formId) {
            try {
                // Decrypt form data
                const formResult = await secureApi.decryptForm(formId);
                const form = formResult.form;

                // Load patient if linked
                if (formResult.existing_patient?.id) {
                    await selectPatient(formResult.existing_patient.id);
                    await loadCasesForPatient(formResult.existing_patient.id);

                    // Select the linked case if exists
                    if (formResult.case_id) {
                        await selectCase(formResult.case_id);
                    }
                }

                // Store form reference for marking as processed after save
                setFormData({
                    formId: formId,
                    caseId: formResult.case_id,
                    formData: form
                });

                consultationType.value = 'vaccination';
                screen.value = 'consultation';
            } catch (error) {
                alert('Erreur lors du chargement du formulaire: ' + error.message);
            }
        }

        function onCalendarSelected(event) {
            // Start consultation from calendar event
            consultationType.value = 'vaccination';
            screen.value = 'consultation';
        }

        function onManualEntry() {
            clearPatient();
            clearCases();
            consultationType.value = 'vaccination';
            screen.value = 'consultation';
        }

        // ==================== Consultation events ====================

        function onConsultationSaved() {
            returnToHome();
        }

        function onConsultationBack() {
            returnToHome();
        }

        // ==================== Timeline ====================

        function toggleTimeline() {
            showTimeline.value = !showTimeline.value;
        }

        return {
            screen, connectionStatus, isLoggedIn, userName, isAdmin,
            location, locationName, locations, selectedLocationId,
            currentPatient, consultationType, showTimeline,
            onConfirmLocation, onLogout,
            goToPendingForms, startNewPatient, returnToHome,
            onPatientSelected, onStartConsultation,
            onFormSelected, onCalendarSelected, onManualEntry,
            onConsultationSaved, onConsultationBack,
            toggleTimeline
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

            <!-- Home action buttons -->
            <div class="home-actions">
                <button class="home-action-btn home-action-rdv" @click="goToPendingForms">
                    <span class="home-action-icon">&#128197;</span>
                    <span class="home-action-label">NOUVEAU RDV</span>
                </button>
                <button class="home-action-btn home-action-new" @click="startNewPatient">
                    <span class="home-action-icon">&#10133;</span>
                    <span class="home-action-label">NOUVEAU VOYAGEUR</span>
                </button>
            </div>

            <!-- Patient search + case view -->
            <PatientSearch @patient-selected="onPatientSelected" />

            <template v-if="currentPatient">
                <div class="patient-actions-bar">
                    <button class="btn-secondary btn-small" @click="toggleTimeline">
                        Timeline
                    </button>
                </div>

                <CaseView @start-consultation="onStartConsultation" />
            </template>

            <TimelineModal :visible="showTimeline" @close="showTimeline = false" />
        </div>

        <!-- PENDING FORMS -->
        <PendingForms v-else-if="screen === 'pending_forms'"
                      @form-selected="onFormSelected"
                      @calendar-selected="onCalendarSelected"
                      @manual-entry="onManualEntry"
                      @back="returnToHome" />

        <!-- CONSULTATION -->
        <ConsultationForm v-else-if="screen === 'consultation'"
                          :consultation-type="consultationType"
                          @saved="onConsultationSaved"
                          @back="onConsultationBack" />
    </div>
    `
};

// Mount
createApp(App).mount('#app');
