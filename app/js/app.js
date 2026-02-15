/**
 * Root application component
 *
 * Simple screen-based routing using reactive state.
 * No vue-router needed for this scale of app.
 *
 * Screens: login → location → dashboard → (consultation | vaccination | stock)
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
import PatientHistory from './components/PatientHistory.js';
import ConsultationForm from './components/ConsultationForm.js';
import PendingForms, { invalidatePendingFormsCache } from './components/PendingForms.js';
import StockScreen from './components/StockScreen.js';
import VaccinationScreen from './components/VaccinationScreen.js';
import FormLinkModal from './components/FormLinkModal.js';

const { createApp, ref, computed, watch, onMounted } = Vue;

const App = {
    components: { LoginScreen, PatientSearch, CaseView, PatientHistory, ConsultationForm, PendingForms, StockScreen, VaccinationScreen, FormLinkModal },

    setup() {
        const {
            isLoggedIn, userName, isAdmin, isVaccinateur, location, locationName, locations, isOnline,
            loadLocations, selectLocation, restoreSession, logout
        } = useAuth();

        const { currentPatient, clearPatient, selectPatient } = usePatient();
        const { clearCases, createNewCase, selectCase, loadCasesForPatient, setFormData } = useCase();
        const vaccines = useVaccines();
        const prescription = usePrescription();
        const chrono = useChronometer();

        // Screen routing
        const screen = ref('login'); // login | location | dashboard | consultation | vaccination | stock
        const selectedLocationId = ref('');
        const consultationType = ref('consultation');
        const connectionStatus = ref('connecting');

        // Watch login state for auto-transition
        watch(isLoggedIn, (loggedIn) => {
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
                try {
                    await loadLocations();
                    screen.value = 'location';
                } catch (e) {
                    console.error('Failed to load locations on restore:', e);
                    screen.value = 'location';
                }
            }
        });

        // ==================== Navigation ====================

        function onConfirmLocation() {
            if (!selectedLocationId.value) return;
            selectLocation(selectedLocationId.value);
            vaccines.loadLots(selectedLocationId.value);
            screen.value = 'dashboard';
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

        function goToStock() {
            screen.value = 'stock';
        }

        const showWalkinTypeMenu = ref(false);

        function startNewPatient(type) {
            showWalkinTypeMenu.value = false;
            clearPatient();
            clearCases();
            vaccines.clearAll();
            consultationType.value = type;
            screen.value = type === 'vaccination' && isVaccinateur.value ? 'vaccination' : 'consultation';
        }

        function returnToDashboard() {
            clearPatient();
            clearCases();
            vaccines.clearAll();
            prescription.clearAll();
            chrono.reset();
            screen.value = 'dashboard';
        }

        // ==================== Patient/Case events ====================

        function onPatientSelected() {
            // Patient loaded — CaseView will appear with their cases
        }

        async function onStartConsultation(details) {
            consultationType.value = details.type;
            vaccines.clearAll();
            // Pre-load pending boosters for this patient
            if (currentPatient.value?.id) {
                await vaccines.loadPendingBoosters(currentPatient.value.id);
            }
            // Vaccinateurs go to the lean vaccination screen
            screen.value = isVaccinateur.value ? 'vaccination' : 'consultation';
        }

        // ==================== Pending forms events ====================

        async function onFormSelected(formId, type) {
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

                // Pre-load pending boosters for this patient
                vaccines.clearAll();
                if (formResult.existing_patient?.id) {
                    await vaccines.loadPendingBoosters(formResult.existing_patient.id);
                }

                // Store form reference for marking as processed after save
                // form.form_data has the actual fields; merge top-level email/avs in
                const fd = {
                    ...(form.form_data || {}),
                    email: form.form_data?.email || form.email || '',
                    avs: form.form_data?.avs || form.avs || ''
                };
                setFormData({
                    formId: formId,
                    caseId: formResult.case_id,
                    formData: fd
                });

                consultationType.value = type || 'consultation';
                screen.value = isVaccinateur.value ? 'vaccination' : 'consultation';
            } catch (error) {
                alert('Erreur lors du chargement du formulaire: ' + error.message);
            }
        }

        async function onCalendarSelected(event) {
            vaccines.clearAll();
            // Load patient if known, otherwise clear
            if (event.is_known_patient && event.existing_patient_id) {
                await selectPatient(event.existing_patient_id);
                await loadCasesForPatient(event.existing_patient_id);
                await vaccines.loadPendingBoosters(event.existing_patient_id);
            } else {
                clearPatient();
                clearCases();
            }

            // Build synthetic formData from calendar fields to populate Dossier Patient
            setFormData({
                formId: null,
                caseId: null,
                formData: {
                    full_name: event.patient_name || '',
                    birthdate: event.dob || '',
                    email: event.email || '',
                    phone: event.phone || ''
                }
            });

            consultationType.value = event.consultation_type || 'consultation';
            screen.value = isVaccinateur.value ? 'vaccination' : 'consultation';
        }

        function onManualEntry() {
            clearPatient();
            clearCases();
            vaccines.clearAll();
            consultationType.value = 'consultation';
            screen.value = 'consultation';
        }

        async function onPendingPatientSelected(patientId) {
            await selectPatient(patientId);
            await loadCasesForPatient(patientId);
        }

        // ==================== Consultation events ====================

        function onConsultationSaved() {
            invalidatePendingFormsCache();
            returnToDashboard();
        }

        function onConsultationBack() {
            returnToDashboard();
        }

        async function onViewPatient() {
            // Navigate to dashboard keeping current patient selected
            if (currentPatient.value?.id) {
                await loadCasesForPatient(currentPatient.value.id);
            }
            vaccines.clearAll();
            prescription.clearAll();
            chrono.reset();
            screen.value = 'dashboard';
        }

        return {
            screen, connectionStatus, isLoggedIn, userName, isAdmin, isVaccinateur,
            location, locationName, locations, selectedLocationId,
            currentPatient, consultationType, showWalkinTypeMenu,
            onConfirmLocation, onLogout,
            goToStock, startNewPatient, returnToDashboard,
            onPatientSelected, onStartConsultation,
            onFormSelected, onCalendarSelected, onManualEntry, onPendingPatientSelected,
            onConsultationSaved, onConsultationBack, onViewPatient
        };
    },

    template: `
    <div class="connection-indicator" :class="connectionStatus">
        <span class="connection-dot"></span>
        <span>{{ connectionStatus === 'online' ? 'Connecte' : connectionStatus === 'offline' ? 'Hors ligne' : 'Connexion...' }}</span>
    </div>

    <div class="container">
        <!-- LOGIN -->
        <LoginScreen v-if="screen === 'login'" @logged-in="screen = 'location'" />

        <!-- LOCATION SELECTION -->
        <div v-else-if="screen === 'location'" class="location-screen">
            <h1>Travel Doctor App</h1>
            <h2>Selectionnez votre lieu de travail</h2>
            <div class="location-buttons">
                <button v-for="loc in locations" :key="loc.id"
                        class="location-btn"
                        @click="selectedLocationId = loc.id; onConfirmLocation()">
                    <svg v-if="loc.name.toLowerCase().includes('tour')" class="location-icon" viewBox="0 0 64 80" fill="currentColor">
                        <rect x="6" y="0" width="8" height="10"/><rect x="20" y="0" width="8" height="10"/><rect x="36" y="0" width="8" height="10"/><rect x="50" y="0" width="8" height="10"/>
                        <rect x="2" y="10" width="60" height="6"/>
                        <rect x="8" y="16" width="48" height="44"/>
                        <rect x="2" y="60" width="60" height="6"/>
                        <rect x="0" y="66" width="64" height="6"/>
                        <rect x="24" y="40" width="16" height="26" rx="8" ry="8" fill="#e3edf7"/>
                    </svg>
                    <svg v-else class="location-icon" viewBox="0 0 64 80" fill="currentColor">
                        <path d="M50,8 C50,4 46,0 38,0 C28,0 18,4 12,12 C6,20 4,28 8,34 C12,40 22,42 32,40 C38,39 42,40 44,44 C46,48 44,54 38,60 C32,66 22,68 16,66 C12,64 10,60 14,56" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round"/>
                        <circle cx="52" cy="6" r="5"/>
                        <path d="M54,2 L60,0 L58,6 Z"/>
                        <circle cx="12" cy="58" r="4"/>
                        <path d="M6,62 L4,68 L10,64 Z"/>
                    </svg>
                    <span>{{ loc.name }}</span>
                </button>
            </div>
        </div>

        <!-- DASHBOARD (replaces home + pending_forms) -->
        <div v-else-if="screen === 'dashboard'" class="dashboard-screen">

            <!-- Toolbar -->
            <div class="dashboard-toolbar">
                <div class="toolbar-left">
                    <span class="user-name">{{ userName }}</span>
                    <span class="location-badge">{{ locationName }}</span>
                    <span v-if="isVaccinateur" class="role-badge-vaccinateur">Vaccinateur</span>
                </div>
                <div class="toolbar-actions">
                    <div v-if="!isVaccinateur" style="position: relative; display: inline-block;">
                        <button class="toolbar-btn toolbar-btn-walkin"
                                @click="showWalkinTypeMenu = !showWalkinTypeMenu"
                                title="Ajouter un patient sans rendez-vous">
                            + Patient sans RDV
                        </button>
                        <div v-if="showWalkinTypeMenu" class="walkin-type-menu">
                            <button class="btn-consult-standard btn-small" @click="startNewPatient('consultation')">Consultation</button>
                            <button class="btn-consult-tele btn-small" @click="startNewPatient('teleconsultation')">Teleconsultation</button>
                            <button class="btn-consult-vacc btn-small" @click="startNewPatient('vaccination')">Vaccination</button>
                        </div>
                    </div>
                    <button v-if="!isVaccinateur" class="toolbar-btn toolbar-btn-stock"
                            @click="goToStock" title="Gestion du stock vaccins">
                        Gestion Stock
                    </button>
                    <button class="toolbar-btn toolbar-btn-logout" @click="onLogout">
                        Deconnexion
                    </button>
                </div>
            </div>

            <!-- Patient search (always visible) -->
            <PatientSearch @patient-selected="onPatientSelected" />

            <!-- If patient selected from search: show cases -->
            <template v-if="currentPatient">
                <CaseView @start-consultation="onStartConsultation" />
            </template>

            <!-- Appointment list (PendingForms embedded, no header) -->
            <template v-if="!currentPatient">
                <PendingForms :embedded="true"
                              @form-selected="onFormSelected"
                              @calendar-selected="onCalendarSelected"
                              @manual-entry="onManualEntry"
                              @patient-selected="onPendingPatientSelected" />
            </template>

        </div>

        <!-- STOCK -->
        <StockScreen v-else-if="screen === 'stock'" @back="returnToDashboard" />

        <!-- VACCINATION (vaccinateur lean screen) -->
        <VaccinationScreen v-else-if="screen === 'vaccination'"
                           @saved="returnToDashboard"
                           @back="returnToDashboard"
                           @view-patient="onViewPatient" />

        <!-- CONSULTATION -->
        <ConsultationForm v-else-if="screen === 'consultation'"
                          :consultation-type="consultationType"
                          @saved="onConsultationSaved"
                          @back="onConsultationBack"
                          @view-patient="onViewPatient" />

    </div>
    `
};

// Mount
createApp(App).mount('#app');
