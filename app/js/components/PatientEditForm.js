/**
 * Patient Edit Form Component
 * Editable patient details with compact/edit toggle
 *
 * Before: two divs with manual toggle (lines 492-526)
 * After: reactive form with v-if toggle
 */
import { usePatient } from '../composables/usePatient.js';
import { formatDateDisplay, formatAvsInput, calculateAge } from '../utils/formatting.js';

export default {
    name: 'PatientEditForm',

    setup() {
        const { currentPatient, patientName, patientAge, sensitiveFields } = usePatient();

        const isEditing = Vue.ref(false);
        const form = Vue.reactive({
            name: '',
            dob: '',
            address: '',
            email: '',
            phone: '',
            avs: ''
        });

        // Sync form when patient changes
        Vue.watch(currentPatient, (patient) => {
            if (patient) {
                form.name = `${patient.nom} ${patient.prenom}`.trim();
                form.dob = patient.dob || '';
            }
        }, { immediate: true });

        Vue.watch(sensitiveFields, (fields) => {
            if (fields) {
                form.address = fields.adresse || '';
                form.email = fields.email || '';
                form.phone = fields.telephone || '';
                form.avs = fields.avs || '';
            }
        }, { immediate: true });

        const formAge = Vue.computed(() => calculateAge(form.dob));
        const ageWarning = Vue.computed(() => {
            if (formAge.value === null) return '';
            if (formAge.value < 8) return `Age: ${formAge.value} ans - Doxycycline contre-indiquee`;
            if (formAge.value < 18) return `Age: ${formAge.value} ans (Pediatrie)`;
            return `Age: ${formAge.value} ans`;
        });

        function onAvsInput(event) {
            event.target.value = formatAvsInput(event.target.value);
            form.avs = event.target.value;
        }

        function getFormData() {
            const parts = form.name.split(' ');
            return {
                nom: parts[0] || '',
                prenom: parts.slice(1).join(' ') || '',
                dob: form.dob,
                adresse: form.address,
                email: form.email,
                telephone: form.phone,
                avs: form.avs
            };
        }

        return {
            isEditing, form, patientName, patientAge, sensitiveFields,
            formAge, ageWarning, onAvsInput, getFormData, formatDateDisplay
        };
    },

    template: `
    <div>
        <!-- Compact view -->
        <div v-if="!isEditing" class="patient-compact-view">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <strong style="font-size: 16px;">{{ form.name || '-' }}</strong>
                <button class="btn-secondary btn-small" @click="isEditing = true">Modifier</button>
            </div>
            <div class="patient-compact-details">
                <div v-if="form.dob">{{ formatDateDisplay(form.dob) }} ({{ formAge }} ans)</div>
                <div v-if="form.address">{{ form.address }}</div>
                <div v-if="form.email || form.phone">{{ form.email }} {{ form.phone }}</div>
                <div v-if="form.avs">AVS: {{ form.avs }}</div>
            </div>
        </div>

        <!-- Edit mode -->
        <div v-else class="patient-edit-form">
            <label>Nom et prenom :</label>
            <input type="text" v-model="form.name" placeholder="Ex: Vessaz Bettina">

            <label>Date de naissance :</label>
            <input type="date" v-model="form.dob">
            <div v-if="ageWarning" class="age-display" :class="{ warning: formAge < 8, pediatric: formAge >= 8 && formAge < 18 }">
                {{ ageWarning }}
            </div>

            <label>Adresse :</label>
            <textarea v-model="form.address" placeholder="Route du Rin 28\n1563 Dompierre" rows="2"></textarea>

            <label>Email :</label>
            <input type="email" v-model="form.email" placeholder="patient@example.com">

            <label>Telephone :</label>
            <input type="tel" v-model="form.phone" placeholder="076 342 46 17">

            <label>Numero AVS :</label>
            <input type="text" :value="form.avs" @input="onAvsInput" placeholder="756.1234.5678.90">
            <div class="avs-hint">Identifiant unique recommande</div>

            <button class="btn-secondary btn-small" @click="isEditing = false" style="margin-top: 10px;">
                Valider
            </button>
        </div>
    </div>
    `
};
