/**
 * Patient Search Component
 *
 * Compare with the original (lines 886-1074 of Travel_Doctor_App_v1.0.html):
 * - Was: manual debounce timer, innerHTML building, onclick strings with IDs
 * - Now: v-model with @input, v-for rendering, @click with method calls
 * - Search results are reactive — no need to manually show/hide divs
 */
import { usePatient } from '../composables/usePatient.js';
import { useCase } from '../composables/useCase.js';

export default {
    name: 'PatientSearch',

    emits: ['patient-selected'],

    setup(props, { emit }) {
        const {
            currentPatient, searchResults, searchLoading, patientName, patientAge,
            medicalData, sensitiveFields, observations,
            search, selectPatient, clearPatient, getLatestObservation
        } = usePatient();

        const { cases, openCases, loadCasesForPatient } = useCase();

        const query = Vue.ref('');
        let debounceTimer = null;

        function onSearchInput() {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => search(query.value), 300);
        }

        async function onSelectPatient(patientId) {
            await selectPatient(patientId);
            await loadCasesForPatient(patientId);
            query.value = '';
            emit('patient-selected', patientId);
        }

        function formatDate(dateStr) {
            if (!dateStr) return '';
            const d = new Date(dateStr);
            return d.toLocaleDateString('fr-CH');
        }

        // Computed: latest CD4 from observations
        const latestCd4 = Vue.computed(() => {
            const obs = getLatestObservation('cd4');
            return obs ? `${obs.value} (${formatDate(obs.date)})` : null;
        });

        return {
            query, searchResults, searchLoading, currentPatient,
            patientName, patientAge, medicalData, sensitiveFields,
            observations, cases, openCases, latestCd4,
            onSearchInput, onSelectPatient, formatDate, clearPatient
        };
    },

    template: `
    <div class="patient-search-section">
        <h3>Rechercher un patient</h3>

        <!-- Search input -->
        <div class="search-input-group">
            <input type="text" v-model="query"
                   placeholder="Nom du patient..."
                   @input="onSearchInput">
        </div>

        <!-- Search results -->
        <div v-if="searchResults.length > 0 && !currentPatient" class="search-results">
            <div v-for="patient in searchResults" :key="patient.id"
                 class="search-result-item"
                 @click="onSelectPatient(patient.id)">
                <div>
                    <div class="search-result-name">{{ patient.nom }} {{ patient.prenom }}</div>
                    <div class="search-result-info">{{ formatDate(patient.dob) }}</div>
                </div>
            </div>
        </div>
        <div v-else-if="searchLoading" class="search-no-results">Recherche...</div>
        <div v-else-if="query.length >= 2 && searchResults.length === 0 && !currentPatient"
             class="search-no-results">
            Aucun patient trouve
        </div>

        <!-- Selected patient summary -->
        <div v-if="currentPatient" class="patient-summary">
            <div class="patient-header">
                <div>
                    <strong class="patient-name">{{ patientName }}</strong>
                    <span v-if="patientAge !== null" class="patient-age">{{ patientAge }} ans</span>
                </div>
                <button class="btn-secondary btn-small" @click="clearPatient">Changer</button>
            </div>

            <div class="patient-details">
                <div>{{ formatDate(currentPatient.dob) }}</div>
                <div v-if="sensitiveFields?.adresse">{{ sensitiveFields.adresse }}</div>
                <div v-if="sensitiveFields?.telephone">{{ sensitiveFields.telephone }}</div>
                <div v-if="sensitiveFields?.email">{{ sensitiveFields.email }}</div>
                <div v-if="sensitiveFields?.avs" class="avs-display">AVS: {{ sensitiveFields.avs }}</div>
            </div>

            <!-- Medical conditions (from encrypted patient.medical) -->
            <div v-if="medicalData" class="medical-section">
                <h4>Donnees medicales</h4>
                <div v-if="medicalData.conditions?.length" class="medical-row">
                    <strong>Conditions:</strong>
                    <span v-for="c in medicalData.conditions" :key="c" class="medical-tag">{{ c }}</span>
                </div>
                <div v-if="medicalData.allergies?.length" class="medical-row">
                    <strong>Allergies:</strong>
                    <span v-for="a in medicalData.allergies" :key="a" class="medical-tag allergy">{{ a }}</span>
                </div>
                <div v-if="medicalData.medications?.length" class="medical-row">
                    <strong>Medicaments:</strong>
                    <span v-for="m in medicalData.medications" :key="m" class="medical-tag">{{ m }}</span>
                </div>
                <div v-if="latestCd4" class="medical-row">
                    <strong>CD4:</strong> {{ latestCd4 }}
                </div>
            </div>

            <!-- Cases summary -->
            <div v-if="cases.length > 0" class="cases-summary">
                <h4>{{ cases.length }} dossier(s)</h4>
                <div v-if="openCases.length > 0" class="open-cases-hint">
                    {{ openCases.length }} dossier(s) ouvert(s)
                </div>
            </div>
        </div>
    </div>
    `
};
