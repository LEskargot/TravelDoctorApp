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
import { FORM_LABELS } from '../data/form-labels.js';

const IMMUNE_COMORBIDITIES = ['vih', 'thymus', 'rate', 'cancer', 'hematologie'];

function triLabel(val) {
    if (val === 'oui' || val === true) return 'Oui';
    if (val === 'non' || val === false) return 'Non';
    if (val === 'ne_sais_pas' || val === 'unknown') return 'Ne sait pas';
    return '';
}

function genderLabel(sexe) {
    if (sexe === 'm') return 'Homme';
    if (sexe === 'f') return 'Femme';
    if (sexe === 'autre') return 'Autre';
    return '';
}

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
            const dateOnly = dateStr.split('T')[0].split(' ')[0];
            const parts = dateOnly.split('-');
            if (parts.length === 3) return `${parts[2]}.${parts[1]}.${parts[0]}`;
            return dateStr;
        }

        // Computed: latest CD4 from observations
        const latestCd4 = Vue.computed(() => {
            const obs = getLatestObservation('cd4');
            return obs ? `${obs.value} (${formatDate(obs.date)})` : null;
        });

        // Medical data helpers
        const comorbidities = Vue.computed(() => {
            if (!medicalData.value?.comorbidities) return [];
            return medicalData.value.comorbidities
                .filter(c => c !== 'aucune')
                .map(c => ({
                    key: c,
                    label: FORM_LABELS.comorbidities[c] || c,
                    immune: IMMUNE_COMORBIDITIES.includes(c),
                    detail: c === 'psychiatrique'
                        ? medicalData.value.psychiatricDetails
                        : c === 'autre'
                            ? medicalData.value.comorbidityOther
                            : medicalData.value.comorbidityDetails?.[c] || ''
                }));
        });

        const allergies = Vue.computed(() => {
            if (!medicalData.value?.allergies) return [];
            return medicalData.value.allergies
                .filter(a => a !== 'aucune')
                .map(a => ({
                    key: a,
                    label: FORM_LABELS.allergy_types[a] || a,
                    detail: medicalData.value.allergyDetails?.[a] || ''
                }));
        });

        const hasMedicalData = Vue.computed(() => {
            if (!medicalData.value) return false;
            const m = medicalData.value;
            return comorbidities.value.length > 0 ||
                   allergies.value.length > 0 ||
                   m.medicaments === 'oui' ||
                   m.grossesse === 'oui' ||
                   m.problemeVaccination === 'oui' ||
                   m.dengueHistory === 'oui' ||
                   m.poids;
        });

        return {
            query, searchResults, searchLoading, currentPatient,
            patientName, patientAge, medicalData, sensitiveFields,
            observations, cases, openCases, latestCd4,
            comorbidities, allergies, hasMedicalData,
            onSearchInput, onSelectPatient, formatDate, clearPatient,
            triLabel, genderLabel
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
                    <div class="search-result-info">
                        {{ formatDate(patient.dob) }}
                        <span v-if="patient.sexe" style="margin-left: 8px;">{{ patient.sexe === 'm' ? 'H' : patient.sexe === 'f' ? 'F' : '' }}</span>
                    </div>
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
                    <span v-if="currentPatient.sexe" class="patient-gender">{{ genderLabel(currentPatient.sexe) }}</span>
                </div>
                <button class="btn-secondary btn-small" @click="clearPatient">Changer</button>
            </div>

            <div class="patient-details">
                <div>{{ formatDate(currentPatient.dob) }}</div>
                <div v-if="currentPatient.poids" class="patient-weight">Poids: {{ currentPatient.poids }} kg</div>
                <div v-if="sensitiveFields?.adresse">{{ sensitiveFields.adresse }}</div>
                <div v-if="sensitiveFields?.telephone">{{ sensitiveFields.telephone }}</div>
                <div v-if="sensitiveFields?.email">{{ sensitiveFields.email }}</div>
                <div v-if="sensitiveFields?.avs" class="avs-display">AVS: {{ sensitiveFields.avs }}</div>
            </div>

            <!-- Medical data (from encrypted patient.medical_encrypted) -->
            <div v-if="hasMedicalData" class="medical-section">
                <h4>Donnees medicales</h4>

                <div v-if="comorbidities.length" class="medical-row">
                    <strong>Comorbidites:</strong>
                    <span v-for="c in comorbidities" :key="c.key"
                          :class="['medical-tag', c.immune ? 'immune' : '']">
                        {{ c.label }}<template v-if="c.detail"> ({{ c.detail }})</template>
                    </span>
                </div>

                <div v-if="medicalData?.recentChemotherapy === 'oui'" class="medical-row medical-warning">
                    Chimiotherapie recente
                </div>

                <div v-if="allergies.length" class="medical-row">
                    <strong>Allergies:</strong>
                    <span v-for="a in allergies" :key="a.key" class="medical-tag allergy">
                        {{ a.label }}<template v-if="a.detail"> ({{ a.detail }})</template>
                    </span>
                </div>

                <div v-if="medicalData?.medicaments === 'oui'" class="medical-row">
                    <strong>Medicaments:</strong> Oui
                    <template v-if="medicalData.medicamentsDetails"> — {{ medicalData.medicamentsDetails }}</template>
                </div>

                <div v-if="medicalData?.grossesse === 'oui'" class="medical-row medical-warning">
                    <strong>Grossesse:</strong> Oui
                    <template v-if="medicalData.dernieresRegles"> — Dernieres regles: {{ formatDate(medicalData.dernieresRegles) }}</template>
                </div>
                <div v-if="medicalData?.allaitement === 'oui'" class="medical-row">
                    <strong>Allaitement:</strong> Oui
                </div>

                <div v-if="medicalData?.problemeVaccination === 'oui'" class="medical-row medical-warning">
                    <strong>Probleme de vaccination:</strong> Oui
                    <template v-if="medicalData.problemeVaccinationDetails"> — {{ medicalData.problemeVaccinationDetails }}</template>
                </div>

                <div v-if="medicalData?.dengueHistory === 'oui'" class="medical-row">
                    <strong>Dengue anterieure:</strong> Oui
                </div>

                <div v-if="medicalData?.varicelleContractee === 'oui' || medicalData?.varicelleVaccine === 'oui'" class="medical-row">
                    <strong>Varicelle:</strong>
                    <template v-if="medicalData.varicelleContractee === 'oui'"> Contractee</template>
                    <template v-if="medicalData.varicelleVaccine === 'oui'"> Vaccinee</template>
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
