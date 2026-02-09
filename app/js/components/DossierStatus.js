/**
 * Dossier Status Component
 * Summary of what's been filled in the current consultation
 *
 * Before: updateDossierStatus() doing getElementById x5 (lines 3543-3591)
 * After: fully computed from reactive state
 */
import { useVaccines } from '../composables/useVaccines.js';
import { usePrescription } from '../composables/usePrescription.js';

export default {
    name: 'DossierStatus',

    props: {
        patientName: { type: String, default: '' },
        patientDob: { type: String, default: '' },
        notes: { type: String, default: '' }
    },

    setup(props) {
        const { administeredVaccines, plannedBoosters } = useVaccines();
        const { selectedMedications } = usePrescription();

        const items = Vue.computed(() => [
            {
                icon: 'patient',
                label: 'Patient',
                ready: !!(props.patientName && props.patientDob),
                detail: props.patientName
                    ? (props.patientDob ? props.patientName : `${props.patientName} (DOB manquante)`)
                    : 'non renseigne'
            },
            {
                icon: 'vaccines',
                label: 'Vaccins administres',
                ready: administeredVaccines.value.length > 0,
                detail: administeredVaccines.value.length > 0
                    ? `${administeredVaccines.value.length} vaccin(s)`
                    : 'aucun'
            },
            {
                icon: 'boosters',
                label: 'Rappels planifies',
                ready: plannedBoosters.value.length > 0,
                detail: plannedBoosters.value.length > 0
                    ? `${plannedBoosters.value.length} rappel(s)`
                    : 'aucun'
            },
            {
                icon: 'notes',
                label: 'Notes de consultation',
                ready: !!(props.notes && props.notes.trim()),
                detail: props.notes?.trim()
                    ? `${props.notes.trim().length} caracteres`
                    : 'vide'
            },
            {
                icon: 'rx',
                label: 'Ordonnance',
                ready: selectedMedications.value.length > 0,
                detail: selectedMedications.value.length > 0
                    ? `${selectedMedications.value.length} medicament(s)`
                    : 'aucun medicament'
            }
        ]);

        return { items };
    },

    template: `
    <div class="dossier-status">
        <h3>Contenu du dossier patient</h3>
        <ul class="dossier-files">
            <li v-for="item in items" :key="item.icon" :class="item.ready ? 'ready' : 'pending'">
                <span class="file-icon">{{ item.label }}:</span>
                <strong v-if="item.ready">{{ item.detail }}</strong>
                <em v-else>{{ item.detail }}</em>
            </li>
        </ul>
    </div>
    `
};
