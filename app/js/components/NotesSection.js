/**
 * Notes Section Component
 * Consultation notes + advice checkboxes
 *
 * Before: hardcoded HTML checkboxes + onclick handlers (lines 550-604)
 * After: v-for over data, v-model for state
 */
import { FORM_LABELS } from '../data/form-labels.js';

export default {
    name: 'NotesSection',

    props: {
        modelValue: { type: String, default: '' }
    },

    emits: ['update:modelValue'],

    setup(props, { emit }) {
        const conseils = FORM_LABELS.conseils;
        const selectedConseils = Vue.ref([]);
        const notes = Vue.computed({
            get: () => props.modelValue,
            set: (val) => emit('update:modelValue', val)
        });

        function toggleConseil(conseil) {
            const idx = selectedConseils.value.indexOf(conseil);
            if (idx === -1) selectedConseils.value.push(conseil);
            else selectedConseils.value.splice(idx, 1);
        }

        function getSelectedConseils() {
            return [...selectedConseils.value];
        }

        return { conseils, selectedConseils, notes, toggleConseil, getSelectedConseils };
    },

    template: `
    <div class="accordion-body">
        <label>Conseils donnes :</label>
        <div class="checkbox-multiselect">
            <div v-for="conseil in conseils" :key="conseil"
                 class="checkbox-item" :class="{ selected: selectedConseils.includes(conseil) }"
                 @click="toggleConseil(conseil)">
                <input type="checkbox" :checked="selectedConseils.includes(conseil)" @click.stop>
                <label>{{ conseil }}</label>
            </div>
        </div>

        <label style="margin-top: 15px;">Notes additionnelles :</label>
        <textarea v-model="notes"
                  placeholder="Ex:\n- Remarques particulieres...\n- Conseils specifiques..."
                  rows="4"></textarea>
    </div>
    `
};
