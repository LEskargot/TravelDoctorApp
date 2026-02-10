/**
 * Medical Editor Component
 * Compact/edit toggle for medical data (comorbidities, allergies, medications, pregnancy, etc.)
 * Values use oui/non/ne_sais_pas strings matching form convention.
 */
import { usePatient } from '../composables/usePatient.js';
import { useCase } from '../composables/useCase.js';
import { FORM_LABELS } from '../data/form-labels.js';
import { mapFormToMedical } from '../utils/form-mapping.js';

const TRI_OPTIONS = [
    { value: '', label: '--' },
    { value: 'oui', label: 'Oui' },
    { value: 'non', label: 'Non' },
    { value: 'ne_sais_pas', label: 'Ne sait pas' }
];

function triLabel(val) {
    if (val === 'oui') return 'Oui';
    if (val === 'non') return 'Non';
    if (val === 'ne_sais_pas') return 'Ne sait pas';
    if (val === true) return 'Oui';
    if (val === false) return 'Non';
    return '';
}

// Comorbidities that have detail fields
const DETAIL_COMORBIDITIES = [
    'thymus', 'rate', 'cancer', 'hematologie', 'cardiaque',
    'diabete', 'inflammatoire', 'digestive', 'rhumatologie',
    'musculaire', 'chirurgie'
];

// Comorbidities that affect immune response (impact on live vaccines, prophylaxis)
const IMMUNE_COMORBIDITIES = ['vih', 'thymus', 'rate', 'cancer', 'hematologie'];

export default {
    name: 'MedicalEditor',

    setup() {
        const { medicalData, setMedicalData } = usePatient();
        const { formData: caseFormData } = useCase();

        const isEditing = Vue.ref(false);

        // Reactive medical state
        const comorbidities = Vue.ref([]);
        const comorbidityDetails = Vue.ref({});
        const comorbidityOther = Vue.ref('');
        const psychiatricDetails = Vue.ref('');
        const recentChemotherapy = Vue.ref('');
        const allergies = Vue.ref([]);
        const allergyDetails = Vue.ref({});
        const grossesse = Vue.ref('');
        const contraception = Vue.ref('');
        const allaitement = Vue.ref('');
        const dernieresRegles = Vue.ref('');
        const medicaments = Vue.ref('');
        const medicamentsDetails = Vue.ref('');
        const varicelleContractee = Vue.ref('');
        const varicelleVaccine = Vue.ref('');
        const problemeVaccination = Vue.ref('');
        const problemeVaccinationDetails = Vue.ref('');
        const dengueHistory = Vue.ref('');
        const cd4 = Vue.ref('');
        const cd4Date = Vue.ref('');
        const poids = Vue.ref('');

        function loadFromMedical(med) {
            if (!med) return;
            comorbidities.value = med.comorbidities || [];
            comorbidityDetails.value = { ...(med.comorbidityDetails || {}) };
            comorbidityOther.value = med.comorbidityOther || '';
            psychiatricDetails.value = med.psychiatricDetails || '';
            recentChemotherapy.value = med.recentChemotherapy || '';
            allergies.value = med.allergies || [];
            allergyDetails.value = { ...(med.allergyDetails || {}) };
            grossesse.value = med.grossesse || '';
            contraception.value = med.contraception || '';
            allaitement.value = med.allaitement || '';
            dernieresRegles.value = med.dernieresRegles || '';
            medicaments.value = med.medicaments || '';
            medicamentsDetails.value = med.medicamentsDetails || '';
            varicelleContractee.value = med.varicelleContractee || '';
            varicelleVaccine.value = med.varicelleVaccine || '';
            problemeVaccination.value = med.problemeVaccination || '';
            problemeVaccinationDetails.value = med.problemeVaccinationDetails || '';
            dengueHistory.value = med.dengueHistory || '';
            cd4.value = med.cd4 || '';
            cd4Date.value = med.cd4Date || '';
            poids.value = med.poids || '';
        }

        // Init from patient medical data
        Vue.watch(medicalData, (med) => {
            if (med) loadFromMedical(med);
        }, { immediate: true });

        // Auto-populate from form data
        Vue.watch(caseFormData, (fd) => {
            if (fd?.formData) {
                const mapped = mapFormToMedical(fd.formData);
                loadFromMedical(mapped);
            }
        }, { immediate: true });

        function toggleArrayItem(arr, key) {
            const idx = arr.indexOf(key);
            if (idx >= 0) arr.splice(idx, 1);
            else arr.push(key);
        }

        function getMedicalData() {
            return {
                comorbidities: comorbidities.value,
                comorbidityDetails: comorbidityDetails.value,
                comorbidityOther: comorbidityOther.value,
                psychiatricDetails: psychiatricDetails.value,
                recentChemotherapy: recentChemotherapy.value,
                allergies: allergies.value,
                allergyDetails: allergyDetails.value,
                grossesse: grossesse.value,
                contraception: contraception.value,
                allaitement: allaitement.value,
                dernieresRegles: dernieresRegles.value,
                medicaments: medicaments.value,
                medicamentsDetails: medicamentsDetails.value,
                varicelleContractee: varicelleContractee.value,
                varicelleVaccine: varicelleVaccine.value,
                problemeVaccination: problemeVaccination.value,
                problemeVaccinationDetails: problemeVaccinationDetails.value,
                dengueHistory: dengueHistory.value,
                cd4: cd4.value,
                cd4Date: cd4Date.value,
                poids: poids.value
            };
        }

        // Sync back to composable when editing finishes
        function finishEditing() {
            isEditing.value = false;
            setMedicalData(getMedicalData());
        }

        // Compact display helpers
        const activeComorbidityKeys = Vue.computed(() =>
            comorbidities.value.filter(c => c !== 'aucune')
        );
        const activeComorbidities = Vue.computed(() =>
            activeComorbidityKeys.value.map(c => FORM_LABELS.comorbidities[c] || c)
        );

        function isImmune(idx) {
            return IMMUNE_COMORBIDITIES.includes(activeComorbidityKeys.value[idx]);
        }
        const activeAllergies = Vue.computed(() =>
            allergies.value.filter(a => a !== 'aucune').map(a => FORM_LABELS.allergy_types[a] || a)
        );

        const hasData = Vue.computed(() =>
            comorbidities.value.length > 0 || allergies.value.length > 0 ||
            medicaments.value || grossesse.value || poids.value
        );

        return {
            isEditing, comorbidities, comorbidityDetails, comorbidityOther,
            psychiatricDetails, recentChemotherapy,
            allergies, allergyDetails,
            grossesse, contraception, allaitement, dernieresRegles,
            medicaments, medicamentsDetails,
            varicelleContractee, varicelleVaccine,
            problemeVaccination, problemeVaccinationDetails,
            dengueHistory, cd4, cd4Date, poids,
            activeComorbidities, activeAllergies, hasData,
            toggleArrayItem, getMedicalData, finishEditing, triLabel, isImmune,
            FORM_LABELS, TRI_OPTIONS, DETAIL_COMORBIDITIES
        };
    },

    template: `
    <div class="medical-editor" style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #eee;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <h4 style="margin: 0;">Donnees medicales</h4>
            <button v-if="!isEditing" class="btn-secondary btn-small" @click="isEditing = true">Modifier</button>
        </div>

        <!-- ==================== COMPACT VIEW ==================== -->
        <div v-if="!isEditing" class="medical-compact">
            <template v-if="hasData">
                <!-- Comorbidities -->
                <div v-if="activeComorbidities.length" class="med-group comorbidities">
                    <div class="voyage-section-label">Comorbidites</div>
                    <div class="medical-row">
                        <span v-for="(c, idx) in activeComorbidities" :key="idx"
                              :class="['medical-tag', isImmune(idx) ? 'immune' : 'allergy']">{{ c }}</span>
                        <span v-if="comorbidityOther" class="medical-tag allergy">{{ comorbidityOther }}</span>
                        <template v-if="cd4">
                            <span class="medical-tag immune">CD4: {{ cd4 }}<template v-if="cd4Date"> ({{ cd4Date }})</template></span>
                        </template>
                    </div>
                </div>

                <!-- Allergies -->
                <div v-if="activeAllergies.length" class="med-group allergies">
                    <div class="voyage-section-label">Allergies</div>
                    <div class="medical-row">
                        <span v-for="a in activeAllergies" class="medical-tag allergy">{{ a }}</span>
                    </div>
                </div>

                <!-- Medications -->
                <div v-if="medicaments" class="med-group medications">
                    <div class="voyage-section-label">Medicaments</div>
                    <div class="medical-row">
                        {{ triLabel(medicaments) }}
                        <span v-if="medicamentsDetails"> — {{ medicamentsDetails }}</span>
                    </div>
                </div>

                <!-- Gynecology -->
                <div v-if="grossesse || contraception || allaitement || dernieresRegles" class="med-group gynecology">
                    <div class="voyage-section-label">Gynecologie</div>
                    <div class="medical-row">
                        <span v-if="grossesse" :class="['medical-tag', grossesse === 'oui' ? 'immune' : '']">Grossesse: {{ triLabel(grossesse) }}</span>
                        <span v-if="contraception" class="medical-tag">Contraception: {{ triLabel(contraception) }}</span>
                        <span v-if="allaitement" :class="['medical-tag', allaitement === 'oui' ? 'immune' : '']">Allaitement: {{ triLabel(allaitement) }}</span>
                        <span v-if="dernieresRegles" class="medical-tag">Regles: {{ dernieresRegles }}</span>
                    </div>
                </div>

                <!-- Vaccination -->
                <div v-if="varicelleContractee || varicelleVaccine || problemeVaccination || dengueHistory" class="med-group vaccination">
                    <div class="voyage-section-label">Vaccination & Immunite</div>
                    <div class="medical-row">
                        <span v-if="varicelleContractee" class="medical-tag">Varicelle: {{ triLabel(varicelleContractee) }}</span>
                        <span v-if="varicelleVaccine" class="medical-tag">Vaccinee: {{ triLabel(varicelleVaccine) }}</span>
                        <span v-if="problemeVaccination" :class="['medical-tag', problemeVaccination === 'oui' ? 'immune' : '']">Pb vaccination: {{ triLabel(problemeVaccination) }}<template v-if="problemeVaccinationDetails"> — {{ problemeVaccinationDetails }}</template></span>
                        <span v-if="dengueHistory" class="medical-tag">Dengue: {{ triLabel(dengueHistory) }}</span>
                    </div>
                </div>

                <!-- Weight (standalone) -->
                <div v-if="poids" class="medical-row">
                    <strong>Poids:</strong> {{ poids }} kg
                </div>
            </template>
            <div v-else class="no-data-message" style="padding: 8px;">Aucune donnee medicale</div>
        </div>

        <!-- ==================== EDIT VIEW ==================== -->
        <div v-else>
            <!-- Comorbidities -->
            <div class="med-group comorbidities">
                <div class="voyage-section-label">Comorbidites</div>
                <div class="medical-field">
                    <div class="checkbox-multiselect">
                        <template v-for="(label, key) in FORM_LABELS.comorbidities" :key="key">
                            <div class="checkbox-item">
                                <input type="checkbox" :checked="comorbidities.includes(key)"
                                       @change="toggleArrayItem(comorbidities, key)">
                                <span>{{ label }}</span>
                                <input v-if="DETAIL_COMORBIDITIES.includes(key) && comorbidities.includes(key)"
                                       type="text" class="detail-input"
                                       v-model="comorbidityDetails[key]" placeholder="Details...">
                            </div>
                        </template>
                    </div>
                    <input v-if="comorbidities.includes('autre')" type="text" v-model="comorbidityOther"
                           placeholder="Autre comorbidite..." style="margin-top: 4px;">
                    <input v-if="comorbidities.includes('psychiatrique')" type="text" v-model="psychiatricDetails"
                           placeholder="Details psychiatriques..." style="margin-top: 4px;">
                </div>

                <!-- CD4 (shown when HIV selected) -->
                <div v-if="comorbidities.includes('vih')" class="medical-grid" style="margin-top: 6px;">
                    <div class="medical-field">
                        <label>Taux CD4</label>
                        <input type="number" v-model="cd4" placeholder="ex: 450" style="margin: 0;">
                    </div>
                    <div class="medical-field">
                        <label>Date CD4</label>
                        <input type="date" v-model="cd4Date" style="margin: 0;">
                    </div>
                </div>

                <!-- Recent chemotherapy -->
                <div v-if="comorbidities.includes('cancer')" class="medical-field">
                    <label>Chimiotherapie recente</label>
                    <select v-model="recentChemotherapy" class="tri-state-select">
                        <option v-for="o in TRI_OPTIONS" :value="o.value">{{ o.label }}</option>
                    </select>
                </div>
            </div>

            <!-- Allergies -->
            <div class="med-group allergies">
                <div class="voyage-section-label">Allergies</div>
                <div class="medical-field">
                    <div class="checkbox-multiselect">
                        <div v-for="(label, key) in FORM_LABELS.allergy_types" :key="key" class="checkbox-item">
                            <input type="checkbox" :checked="allergies.includes(key)"
                                   @change="toggleArrayItem(allergies, key)">
                            <span>{{ label }}</span>
                            <input v-if="key !== 'aucune' && allergies.includes(key)"
                                   type="text" class="detail-input"
                                   v-model="allergyDetails[key]" placeholder="Preciser...">
                        </div>
                    </div>
                </div>
            </div>

            <!-- Medications -->
            <div class="med-group medications">
                <div class="voyage-section-label">Medicaments</div>
                <div class="medical-field">
                    <label>Prend des medicaments</label>
                    <select v-model="medicaments" class="tri-state-select">
                        <option v-for="o in TRI_OPTIONS" :value="o.value">{{ o.label }}</option>
                    </select>
                    <textarea v-if="medicaments === 'oui'" v-model="medicamentsDetails"
                              class="detail-textarea" placeholder="Liste des medicaments..."></textarea>
                </div>
            </div>

            <!-- Gynecology -->
            <div class="med-group gynecology">
                <div class="voyage-section-label">Gynecologie</div>
                <div class="medical-grid">
                    <div class="medical-field">
                        <label>Grossesse</label>
                        <select v-model="grossesse" class="tri-state-select">
                            <option v-for="o in TRI_OPTIONS" :value="o.value">{{ o.label }}</option>
                        </select>
                    </div>
                    <div class="medical-field">
                        <label>Contraception</label>
                        <select v-model="contraception" class="tri-state-select">
                            <option v-for="o in TRI_OPTIONS" :value="o.value">{{ o.label }}</option>
                        </select>
                    </div>
                    <div class="medical-field">
                        <label>Allaitement</label>
                        <select v-model="allaitement" class="tri-state-select">
                            <option v-for="o in TRI_OPTIONS" :value="o.value">{{ o.label }}</option>
                        </select>
                    </div>
                    <div class="medical-field">
                        <label>Dernieres regles</label>
                        <input type="date" v-model="dernieresRegles" style="margin: 0;">
                    </div>
                </div>
            </div>

            <!-- Vaccination -->
            <div class="med-group vaccination">
                <div class="voyage-section-label">Vaccination & Immunite</div>
                <div class="medical-grid">
                    <div class="medical-field">
                        <label>Varicelle contractee</label>
                        <select v-model="varicelleContractee" class="tri-state-select">
                            <option v-for="o in TRI_OPTIONS" :value="o.value">{{ o.label }}</option>
                        </select>
                    </div>
                    <div class="medical-field">
                        <label>Varicelle vaccinee</label>
                        <select v-model="varicelleVaccine" class="tri-state-select">
                            <option v-for="o in TRI_OPTIONS" :value="o.value">{{ o.label }}</option>
                        </select>
                    </div>
                </div>

                <!-- Vaccination problem -->
                <div class="medical-field">
                    <label>Probleme de vaccination</label>
                    <select v-model="problemeVaccination" class="tri-state-select">
                        <option v-for="o in TRI_OPTIONS" :value="o.value">{{ o.label }}</option>
                    </select>
                    <textarea v-if="problemeVaccination === 'oui'" v-model="problemeVaccinationDetails"
                              class="detail-textarea" placeholder="Details du probleme..."></textarea>
                </div>

                <!-- Dengue -->
                <div class="medical-field">
                    <label>Antecedent de dengue</label>
                    <select v-model="dengueHistory" class="tri-state-select">
                        <option v-for="o in TRI_OPTIONS" :value="o.value">{{ o.label }}</option>
                    </select>
                </div>
            </div>

            <!-- Weight (standalone) -->
            <div class="medical-field">
                <label>Poids (kg)</label>
                <input type="number" v-model="poids" placeholder="kg" min="2" max="400" style="margin: 0; width: 120px;">
            </div>

            <button class="btn-secondary btn-small" @click="finishEditing" style="margin-top: 10px;">
                Valider
            </button>
        </div>
    </div>
    `
};
