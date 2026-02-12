/**
 * Dossier Status Component
 * Summary of what's been filled in the current consultation
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
        const { vaccines } = useVaccines();
        const { selectedMedications } = usePrescription();

        const administeredCount = Vue.computed(() =>
            vaccines.value.filter(v => v.administered).length
        );
        const plannedCount = Vue.computed(() =>
            vaccines.value.filter(v => !v.administered).length
        );

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
                label: 'Vaccins',
                ready: vaccines.value.length > 0,
                detail: vaccines.value.length > 0
                    ? [
                        administeredCount.value > 0 ? `${administeredCount.value} administre(s)` : '',
                        plannedCount.value > 0 ? `${plannedCount.value} planifie(s)` : ''
                      ].filter(Boolean).join(', ')
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
