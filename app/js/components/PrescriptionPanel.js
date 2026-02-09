/**
 * Prescription Panel Component
 * Medication selection with pediatric dosing
 *
 * Before: global functions + innerHTML (lines 3593-3683)
 * After: reactive list, v-model, computed dosing
 */
import { usePrescription } from '../composables/usePrescription.js';
import { usePatient } from '../composables/usePatient.js';

export default {
    name: 'PrescriptionPanel',

    setup() {
        const {
            selectedMedications, prescriptionDate, pageFormat,
            medicationOptions, addMedication, removeMedication, updateDosing
        } = usePrescription();

        const { currentPatient, patientAge } = usePatient();

        const selectedType = Vue.ref('');
        const customName = Vue.ref('');
        const customDosing = Vue.ref('');
        const weight = Vue.ref('');

        const showCustomInputs = Vue.computed(() => selectedType.value === 'custom');

        function onAddMedication() {
            addMedication(
                selectedType.value,
                weight.value,
                patientAge.value,
                customName.value,
                customDosing.value
            );
            selectedType.value = '';
            customName.value = '';
            customDosing.value = '';
        }

        return {
            selectedMedications, prescriptionDate, pageFormat,
            medicationOptions, removeMedication, updateDosing,
            selectedType, customName, customDosing, weight,
            showCustomInputs, onAddMedication, currentPatient
        };
    },

    template: `
    <div class="accordion-body">
        <label>Date de l'ordonnance :</label>
        <input type="date" v-model="prescriptionDate">

        <div class="weight-notice">
            <label>Poids du patient (kg) :</label>
            <input type="number" v-model="weight" placeholder="Ex: 83" step="0.1" min="0">
            <p class="weight-hint">Dosages pediatriques calcules auto pour Malarone, Mephaquin, Riamet si poids saisi.</p>
        </div>

        <label>Ajouter un medicament :</label>
        <select v-model="selectedType">
            <option v-for="opt in medicationOptions" :key="opt.value" :value="opt.value">
                {{ opt.label }}
            </option>
        </select>

        <button class="btn-primary" @click="onAddMedication" style="margin-top: 10px;">
            Ajouter
        </button>

        <!-- Custom medication inputs -->
        <div v-if="showCustomInputs" class="custom-med-inputs active">
            <input type="text" v-model="customName" placeholder="Nom du medicament">
            <textarea v-model="customDosing" placeholder="Instructions de posologie"
                      style="min-height: 80px;"></textarea>
        </div>

        <!-- Medication list -->
        <div class="medication-list" style="margin-top: 20px;">
            <p v-if="selectedMedications.length === 0" class="no-data-message">
                Aucun medicament ajoute
            </p>
            <div v-for="med in selectedMedications" :key="med.id" class="medication-item">
                <div class="medication-header">
                    <div class="medication-name">{{ med.name }}</div>
                    <button class="remove-btn" @click="removeMedication(med.id)">Supprimer</button>
                </div>
                <textarea class="dosing-textarea"
                          :value="med.dosing"
                          @change="updateDosing(med.id, $event.target.value)"></textarea>
            </div>
        </div>

        <div style="display: flex; gap: 20px; align-items: flex-end; margin-top: 15px;">
            <div style="flex: 1;">
                <label>Format de page :</label>
                <select v-model="pageFormat" style="max-width: 200px;">
                    <option value="a5">A5 (148 x 210 mm)</option>
                    <option value="a4">A4 (210 x 297 mm)</option>
                </select>
            </div>
        </div>
    </div>
    `
};
