/**
 * Voyage Editor Component
 * Compact/edit toggle for travel destinations and details
 */
import { useCase } from '../composables/useCase.js';
import { FORM_LABELS } from '../data/form-labels.js';
import { formatDateDisplay } from '../utils/formatting.js';
import { mapFormToVoyage } from '../utils/form-mapping.js';
import { getCountryName, searchCountries } from '../data/countries.js';

function daysBetween(d1, d2) {
    if (!d1 || !d2) return '';
    const diff = Math.ceil((new Date(d2) - new Date(d1)) / 86400000);
    return diff > 0 ? `${diff}j` : '';
}

function emptyDest() {
    return { country: '', departure: '', return: '', _searchText: '' };
}

export default {
    name: 'VoyageEditor',

    setup() {
        const { currentCase, formData: caseFormData } = useCase();

        const isEditing = Vue.ref(false);

        const destinations = Vue.ref([emptyDest()]);
        const nature = Vue.ref([]);
        const natureAutre = Vue.ref('');
        const hebergement = Vue.ref([]);
        const hebergementAutre = Vue.ref('');
        const activites = Vue.ref([]);
        const activitesAutre = Vue.ref('');
        const zonesRurales = Vue.ref('');

        // Autocomplete state
        const activeDropdown = Vue.ref(-1);
        const suggestions = Vue.ref([]);
        const highlightIdx = Vue.ref(-1);

        function loadFromVoyage(voyage) {
            if (!voyage) return;
            if (voyage.destinations?.length) {
                destinations.value = voyage.destinations.map(d => ({
                    ...d,
                    _searchText: getCountryName(d.country)
                }));
            }
            nature.value = voyage.nature || [];
            natureAutre.value = voyage.natureAutre || '';
            hebergement.value = voyage.hebergement || [];
            hebergementAutre.value = voyage.hebergementAutre || '';
            activites.value = voyage.activites || [];
            activitesAutre.value = voyage.activitesAutre || '';
            zonesRurales.value = voyage.zonesRurales || '';
        }

        // Init from case voyage data
        Vue.watch(currentCase, (c) => {
            if (c?.voyage) loadFromVoyage(c.voyage);
        }, { immediate: true });

        // Auto-populate from form data
        Vue.watch(caseFormData, (fd) => {
            if (fd?.formData) {
                const mapped = mapFormToVoyage(fd.formData);
                loadFromVoyage(mapped);
            }
        }, { immediate: true });

        function addDestination() {
            destinations.value.push(emptyDest());
        }

        function removeDestination(idx) {
            if (destinations.value.length > 1) {
                destinations.value.splice(idx, 1);
            }
        }

        function toggleArrayItem(arr, key) {
            const idx = arr.indexOf(key);
            if (idx >= 0) arr.splice(idx, 1);
            else arr.push(key);
        }

        function toggleActivity(key) {
            if (key === 'aucune') {
                if (activites.value.includes('aucune')) {
                    activites.value = [];
                } else {
                    activites.value = ['aucune'];
                    activitesAutre.value = '';
                }
            } else {
                const idx = activites.value.indexOf(key);
                if (idx >= 0) activites.value.splice(idx, 1);
                else {
                    const ai = activites.value.indexOf('aucune');
                    if (ai >= 0) activites.value.splice(ai, 1);
                    activites.value.push(key);
                }
            }
        }

        function getVoyageData() {
            return {
                destinations: destinations.value
                    .filter(d => d.country)
                    .map(({ country, departure, return: ret }) => ({ country, departure, return: ret })),
                nature: nature.value,
                natureAutre: natureAutre.value,
                hebergement: hebergement.value,
                hebergementAutre: hebergementAutre.value,
                activites: activites.value,
                activitesAutre: activitesAutre.value,
                zonesRurales: zonesRurales.value
            };
        }

        const hasData = Vue.computed(() =>
            destinations.value.some(d => d.country) ||
            nature.value.length > 0 ||
            hebergement.value.length > 0 ||
            activites.value.length > 0
        );

        // --- Country autocomplete ---

        function closeDropdown() {
            activeDropdown.value = -1;
            suggestions.value = [];
            highlightIdx.value = -1;
        }

        function onCountryInput(idx, value) {
            destinations.value[idx]._searchText = value;
            destinations.value[idx].country = '';
            if (value.length >= 2) {
                suggestions.value = searchCountries(value);
                activeDropdown.value = idx;
                highlightIdx.value = -1;
            } else {
                closeDropdown();
            }
        }

        function onCountryFocus(idx) {
            const d = destinations.value[idx];
            if (d._searchText.length >= 2 && !d.country) {
                suggestions.value = searchCountries(d._searchText);
                activeDropdown.value = idx;
                highlightIdx.value = -1;
            }
        }

        function onCountryBlur(idx) {
            setTimeout(() => {
                if (activeDropdown.value !== idx) return;
                closeDropdown();
                const d = destinations.value[idx];
                if (!d.country && d._searchText) {
                    // Try auto-select if there's exactly one match
                    const matches = searchCountries(d._searchText, 2);
                    if (matches.length === 1) {
                        d.country = matches[0].code;
                        d._searchText = matches[0].fr;
                    } else {
                        d._searchText = '';
                    }
                }
            }, 200);
        }

        function selectCountry(idx, country) {
            destinations.value[idx].country = country.code;
            destinations.value[idx]._searchText = country.fr;
            closeDropdown();
        }

        function onCountryKeydown(idx, event) {
            if (activeDropdown.value !== idx || !suggestions.value.length) return;
            switch (event.key) {
                case 'ArrowDown':
                    event.preventDefault();
                    highlightIdx.value = Math.min(highlightIdx.value + 1, suggestions.value.length - 1);
                    break;
                case 'ArrowUp':
                    event.preventDefault();
                    highlightIdx.value = Math.max(highlightIdx.value - 1, 0);
                    break;
                case 'Enter':
                    event.preventDefault();
                    if (highlightIdx.value >= 0) {
                        selectCountry(idx, suggestions.value[highlightIdx.value]);
                    }
                    break;
                case 'Escape':
                    closeDropdown();
                    break;
                case 'Tab':
                    if (highlightIdx.value >= 0) {
                        selectCountry(idx, suggestions.value[highlightIdx.value]);
                    }
                    break;
            }
        }

        // --- Date validation ---

        function getDateWarnings(d) {
            const warnings = [];
            if (!d.departure && !d.return) return warnings;

            if (d.departure && d.return) {
                if (new Date(d.return) <= new Date(d.departure)) {
                    warnings.push({ type: 'error', text: 'Le retour doit \u00eatre apr\u00e8s le d\u00e9part' });
                }
                const days = (new Date(d.return) - new Date(d.departure)) / 86400000;
                if (days > 730) {
                    warnings.push({ type: 'warn', text: 'Voyage de plus de 2 ans' });
                }
            }

            if (d.departure) {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                if (new Date(d.departure) < today) {
                    warnings.push({ type: 'warn', text: 'Date de d\u00e9part dans le pass\u00e9' });
                }
            }

            return warnings;
        }

        return {
            isEditing, destinations, nature, natureAutre,
            hebergement, hebergementAutre, activites, activitesAutre,
            zonesRurales, hasData,
            activeDropdown, suggestions, highlightIdx,
            addDestination, removeDestination, toggleArrayItem, toggleActivity,
            getVoyageData, getCountryName, daysBetween, formatDateDisplay,
            onCountryInput, onCountryFocus, onCountryBlur, onCountryKeydown,
            selectCountry, getDateWarnings,
            FORM_LABELS
        };
    },

    template: `
    <div class="voyage-editor" style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #eee;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <h4 style="margin: 0;">Voyage</h4>
            <button v-if="!isEditing" class="btn-secondary btn-small" @click="isEditing = true">Modifier</button>
        </div>

        <!-- Compact view -->
        <div v-if="!isEditing" class="voyage-compact">
            <template v-if="hasData">
                <div v-for="d in destinations" :key="d.country + d.departure" class="dest-line">
                    <strong>{{ getCountryName(d.country) || d.country }}</strong>
                    <template v-if="d.departure">
                        : {{ formatDateDisplay(d.departure) }} \u2013 {{ formatDateDisplay(d.return) }}
                        <span v-if="daysBetween(d.departure, d.return)" style="color: #999;">({{ daysBetween(d.departure, d.return) }})</span>
                    </template>
                </div>
                <div class="voyage-cols" v-if="nature.length || hebergement.length || activites.length">
                    <div v-if="nature.length">
                        <div class="voyage-section-label">Nature</div>
                        <div class="voyage-chips">
                            <span v-for="n in nature" class="voyage-chip travel">{{ FORM_LABELS.travel_reason[n] || n }}</span>
                            <span v-if="natureAutre" class="voyage-chip travel">{{ natureAutre }}</span>
                        </div>
                    </div>
                    <div v-if="hebergement.length">
                        <div class="voyage-section-label">Hebergement</div>
                        <div class="voyage-chips">
                            <span v-for="h in hebergement" class="voyage-chip neutral">{{ FORM_LABELS.accommodation[h] || h }}</span>
                            <span v-if="hebergementAutre" class="voyage-chip neutral">{{ hebergementAutre }}</span>
                        </div>
                    </div>
                    <div v-if="activites.length">
                        <div class="voyage-section-label">Activites</div>
                        <div class="voyage-chips">
                            <span v-for="a in activites" class="voyage-chip activity">{{ FORM_LABELS.activities[a] || a }}</span>
                            <span v-if="activitesAutre" class="voyage-chip activity">{{ activitesAutre }}</span>
                        </div>
                    </div>
                </div>
                <div v-if="zonesRurales === 'oui'" style="margin-top: 4px;">
                    <span class="voyage-chip rural">Zones rurales</span>
                </div>
            </template>
            <div v-else class="no-data-message" style="padding: 8px;">Aucune destination</div>
        </div>

        <!-- Edit view -->
        <div v-else>
            <div class="destination-header">
                <span>Pays</span><span>Depart</span><span>Retour</span><span></span>
            </div>
            <div v-for="(d, idx) in destinations" :key="idx" class="destination-row">
                <div class="country-autocomplete-wrapper">
                    <input type="text"
                           :value="d._searchText"
                           @input="onCountryInput(idx, $event.target.value)"
                           @focus="onCountryFocus(idx)"
                           @blur="onCountryBlur(idx)"
                           @keydown="onCountryKeydown(idx, $event)"
                           placeholder="Pays..."
                           autocomplete="off">
                    <div v-if="activeDropdown === idx && suggestions.length > 0"
                         class="country-dropdown">
                        <div v-for="(s, si) in suggestions" :key="s.code"
                             class="country-dropdown-item"
                             :class="{ highlighted: highlightIdx === si }"
                             @mousedown.prevent="selectCountry(idx, s)">
                            {{ s.fr }}
                        </div>
                    </div>
                </div>
                <input type="date" v-model="d.departure">
                <input type="date" v-model="d.return">
                <button class="remove-dest" @click="removeDestination(idx)"
                        :disabled="destinations.length <= 1">\u2715</button>
                <div v-if="getDateWarnings(d).length" class="date-warnings">
                    <span v-for="w in getDateWarnings(d)" :key="w.text"
                          :class="'date-warning-' + w.type">
                        {{ w.text }}
                    </span>
                </div>
            </div>
            <button class="btn-secondary btn-small" @click="addDestination" style="margin-bottom: 12px;">
                + Destination
            </button>

            <!-- Nature du voyage -->
            <div class="medical-field">
                <label>Nature du voyage</label>
                <div class="checkbox-multiselect">
                    <label v-for="(label, key) in FORM_LABELS.travel_reason" :key="key" class="checkbox-item">
                        <input type="checkbox" :checked="nature.includes(key)" @change="toggleArrayItem(nature, key)">
                        {{ label }}
                    </label>
                </div>
                <input v-if="nature.includes('autre')" type="text" v-model="natureAutre"
                       placeholder="Preciser..." style="margin-top: 4px;">
            </div>

            <!-- Hebergement -->
            <div class="medical-field">
                <label>Hebergement</label>
                <div class="checkbox-multiselect">
                    <label v-for="(label, key) in FORM_LABELS.accommodation" :key="key" class="checkbox-item">
                        <input type="checkbox" :checked="hebergement.includes(key)" @change="toggleArrayItem(hebergement, key)">
                        {{ label }}
                    </label>
                </div>
                <input v-if="hebergement.includes('autre')" type="text" v-model="hebergementAutre"
                       placeholder="Preciser..." style="margin-top: 4px;">
            </div>

            <!-- Activites -->
            <div class="medical-field">
                <label>Activites</label>
                <div class="checkbox-multiselect">
                    <label v-for="(label, key) in FORM_LABELS.activities" :key="key" class="checkbox-item">
                        <input type="checkbox" :checked="activites.includes(key)" @change="toggleActivity(key)">
                        {{ label }}
                    </label>
                </div>
                <input v-if="activites.includes('autre')" type="text" v-model="activitesAutre"
                       placeholder="Preciser..." style="margin-top: 4px;">
            </div>

            <!-- Zones rurales -->
            <div class="medical-field">
                <label>Sejour en zones rurales</label>
                <select v-model="zonesRurales" class="tri-state-select">
                    <option value="">--</option>
                    <option value="oui">Oui</option>
                    <option value="non">Non</option>
                    <option value="ne_sais_pas">Ne sait pas</option>
                </select>
            </div>

            <button class="btn-secondary btn-small" @click="isEditing = false" style="margin-top: 8px;">
                Valider
            </button>
        </div>
    </div>
    `
};
