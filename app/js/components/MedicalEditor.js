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
            // Two separate varicelle fields — with backward compat for legacy merged field
            if (med.varicelleContractee !== undefined) {
                varicelleContractee.value = med.varicelleContractee || '';
                varicelleVaccine.value = med.varicelleVaccine || '';
            } else if (med.varicelle) {
                // Legacy: convert merged field back to two fields
                varicelleContractee.value = med.varicelle === 'contractee' ? 'oui' : 'non';
                varicelleVaccine.value = med.varicelle === 'vaccinee' ? 'oui' : 'non';
            } else {
                varicelleContractee.value = '';
                varicelleVaccine.value = '';
            }
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

        function toggleComorbidity(key) {
            if (key === 'aucune') {
                if (comorbidities.value.includes('aucune')) {
                    comorbidities.value = [];
                } else {
                    comorbidities.value = ['aucune'];
                    comorbidityDetails.value = {};
                    comorbidityOther.value = '';
                    psychiatricDetails.value = '';
                    cd4.value = '';
                    cd4Date.value = '';
                    recentChemotherapy.value = '';
                }
            } else {
                const idx = comorbidities.value.indexOf(key);
                if (idx >= 0) comorbidities.value.splice(idx, 1);
                else {
                    const ai = comorbidities.value.indexOf('aucune');
                    if (ai >= 0) comorbidities.value.splice(ai, 1);
                    comorbidities.value.push(key);
                }
            }
        }

        function toggleAllergy(key) {
            if (key === 'aucune') {
                if (allergies.value.includes('aucune')) {
                    allergies.value = [];
                } else {
                    allergies.value = ['aucune'];
                    allergyDetails.value = {};
                }
            } else {
                const idx = allergies.value.indexOf(key);
                if (idx >= 0) allergies.value.splice(idx, 1);
                else {
                    const ai = allergies.value.indexOf('aucune');
                    if (ai >= 0) allergies.value.splice(ai, 1);
                    allergies.value.push(key);
                }
            }
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
            activeComorbidities, activeComorbidityKeys, activeAllergies, hasData,
            toggleArrayItem, toggleComorbidity, toggleAllergy, getMedicalData, finishEditing, triLabel, isImmune,
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
                              :class="['medical-tag', isImmune(idx) ? 'immune' : 'allergy']">{{ c }}<template v-if="comorbidityDetails[activeComorbidityKeys[idx]]"> — {{ comorbidityDetails[activeComorbidityKeys[idx]] }}</template><template v-if="activeComorbidityKeys[idx] === 'psychiatrique' && psychiatricDetails"> — {{ psychiatricDetails }}</template><template v-if="activeComorbidityKeys[idx] === 'vih' && cd4"> — CD4: {{ cd4 }}<template v-if="cd4Date"> ({{ cd4Date }})</template></template></span>
                        <span v-if="comorbidityOther" class="medical-tag allergy">{{ comorbidityOther }}</span>
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
                        <span v-if="varicelleContractee" class="medical-tag">Varicelle contractee: {{ triLabel(varicelleContractee) }}</span>
                        <span v-if="varicelleVaccine" class="medical-tag">Vaccin varicelle: {{ triLabel(varicelleVaccine) }}</span>
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
                                       @change="toggleComorbidity(key)">
                                <span>{{ label }}</span>
                                <input v-if="DETAIL_COMORBIDITIES.includes(key) && comorbidities.includes(key)"
                                       type="text" class="detail-input"
                                       v-model="comorbidityDetails[key]" placeholder="Details...">
                                <template v-if="key === 'vih' && comorbidities.includes('vih')">
                                    <input type="number" class="detail-input" v-model="cd4" placeholder="CD4" style="max-width: 80px;">
                                    <input type="date" class="detail-input" v-model="cd4Date" style="max-width: 130px;">
                                </template>
                                <input v-if="key === 'psychiatrique' && comorbidities.includes('psychiatrique')"
                                       type="text" class="detail-input"
                                       v-model="psychiatricDetails" placeholder="Details...">
                                <input v-if="key === 'autre' && comorbidities.includes('autre')"
                                       type="text" class="detail-input"
                                       v-model="comorbidityOther" placeholder="Preciser...">
                            </div>
                        </template>
                    </div>
                </div>

                <!-- Recent chemotherapy -->
                <div v-if="comorbidities.some(c => ['cancer', 'hematologie', 'rhumatologie', 'thymus'].includes(c))" class="medical-field">
                    <label>Chimiotherapie recente</label>
                    <span class="radio-group"><label class="radio-inline" v-for="o in TRI_OPTIONS.slice(1)" :key="o.value"><input type="radio" v-model="recentChemotherapy" :value="o.value"> {{ o.label }}</label></span>
                </div>
            </div>

            <!-- Allergies -->
            <div class="med-group allergies">
                <div class="voyage-section-label">Allergies</div>
                <div class="medical-field">
                    <div class="checkbox-multiselect">
                        <div v-for="(label, key) in FORM_LABELS.allergy_types" :key="key" class="checkbox-item">
                            <input type="checkbox" :checked="allergies.includes(key)"
                                   @change="toggleAllergy(key)">
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
                    <span class="radio-group"><label class="radio-inline" v-for="o in TRI_OPTIONS.slice(1)" :key="o.value"><input type="radio" v-model="medicaments" :value="o.value"> {{ o.label }}</label></span>
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
                        <span class="radio-group"><label class="radio-inline" v-for="o in TRI_OPTIONS.slice(1)" :key="o.value"><input type="radio" v-model="grossesse" :value="o.value"> {{ o.label }}</label></span>
                    </div>
                    <div class="medical-field">
                        <label>Contraception</label>
                        <span class="radio-group"><label class="radio-inline" v-for="o in TRI_OPTIONS.slice(1)" :key="o.value"><input type="radio" v-model="contraception" :value="o.value"> {{ o.label }}</label></span>
                    </div>
                    <div class="medical-field">
                        <label>Allaitement</label>
                        <span class="radio-group"><label class="radio-inline" v-for="o in TRI_OPTIONS.slice(1)" :key="o.value"><input type="radio" v-model="allaitement" :value="o.value"> {{ o.label }}</label></span>
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
                <div class="medical-field">
                    <label>Varicelle contractee ?</label>
                    <span class="radio-group"><label class="radio-inline" v-for="o in TRI_OPTIONS.slice(1)" :key="o.value"><input type="radio" v-model="varicelleContractee" :value="o.value"> {{ o.label }}</label></span>
                </div>
                <div class="medical-field">
                    <label>Vaccin contre la varicelle ?</label>
                    <span class="radio-group"><label class="radio-inline" v-for="o in TRI_OPTIONS.slice(1)" :key="o.value"><input type="radio" v-model="varicelleVaccine" :value="o.value"> {{ o.label }}</label></span>
                </div>

                <!-- Vaccination problem -->
                <div class="medical-field">
                    <label>Probleme de vaccination</label>
                    <span class="radio-group"><label class="radio-inline" v-for="o in TRI_OPTIONS.slice(1)" :key="o.value"><input type="radio" v-model="problemeVaccination" :value="o.value"> {{ o.label }}</label></span>
                    <textarea v-if="problemeVaccination === 'oui'" v-model="problemeVaccinationDetails"
                              class="detail-textarea" placeholder="Details du probleme..."></textarea>
                </div>

                <!-- Dengue -->
                <div class="medical-field">
                    <label>Antecedent de dengue</label>
                    <span class="radio-group"><label class="radio-inline" v-for="o in TRI_OPTIONS.slice(1)" :key="o.value"><input type="radio" v-model="dengueHistory" :value="o.value"> {{ o.label }}</label></span>
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
