/**
 * Vaccine Panel Component — Unified card-based workflow
 *
 * Each vaccine = a card with: name, administered toggle, dose, lot, site, boosters.
 * Dropdown to add vaccines (grouped: lots available / planning).
 * Pre-loaded cards from teleconsultation show a badge.
 */
import { useVaccines } from '../composables/useVaccines.js';
import { formatDateSwiss } from '../utils/formatting.js';

export default {
    name: 'VaccinePanel',

    setup() {
        const {
            vaccineLots, vaccines, allVaccineNames,
            uniqueVaccineNames, lotsCount,
            getLotsForVaccine, getValidLotsForVaccine, hasLots,
            isLotExpired, isLotExpiringSoon, isLotLowStock, getDaysUntilExpiry,
            getTotalDoses,
            addVaccine, removeVaccine: removeVax, changeDoseNumber: changeDose,
            onAdministeredToggle, addManualBooster, removeBooster
        } = useVaccines();

        const showDropdown = Vue.ref(false);
        const searchQuery = Vue.ref('');
        const searchInput = Vue.ref(null);
        const dropdownWrapper = Vue.ref(null);

        const injectionSites = [
            { value: 'bras_gauche', label: 'Bras G' },
            { value: 'bras_droit', label: 'Bras D' },
            { value: 'cuisse_gauche', label: 'Cuisse G' },
            { value: 'cuisse_droit', label: 'Cuisse D' }
        ];

        // ==================== Dropdown logic ====================

        function toggleDropdown() {
            showDropdown.value = !showDropdown.value;
            if (showDropdown.value) {
                searchQuery.value = '';
                Vue.nextTick(() => { if (searchInput.value) searchInput.value.focus(); });
            }
        }

        const filteredWithLots = Vue.computed(() => {
            const q = searchQuery.value.toLowerCase();
            const addedNames = new Set(vaccines.value.map(v => v.vaccine));
            return uniqueVaccineNames.value
                .filter(name => name.toLowerCase().includes(q))
                .map(name => {
                    const validLots = getValidLotsForVaccine(name);
                    const totalStock = validLots.reduce((sum, l) => sum + (l.quantity || 0), 0);
                    return {
                        name,
                        added: addedNames.has(name),
                        totalStock,
                        doses: getTotalDoses(name)
                    };
                });
        });

        const filteredWithoutLots = Vue.computed(() => {
            const q = searchQuery.value.toLowerCase();
            const lotsSet = new Set(uniqueVaccineNames.value);
            const addedNames = new Set(vaccines.value.map(v => v.vaccine));
            return allVaccineNames
                .filter(name => !lotsSet.has(name))
                .filter(name => name.toLowerCase().includes(q))
                .map(name => ({
                    name,
                    added: addedNames.has(name),
                    doses: getTotalDoses(name)
                }));
        });

        function selectFromDropdown(name, administered) {
            addVaccine(name, administered);
            showDropdown.value = false;
            searchQuery.value = '';
        }

        // Close dropdown on outside click
        function onDocumentClick(e) {
            if (showDropdown.value && dropdownWrapper.value && !dropdownWrapper.value.contains(e.target)) {
                showDropdown.value = false;
            }
        }
        Vue.onMounted(() => document.addEventListener('click', onDocumentClick));
        Vue.onUnmounted(() => document.removeEventListener('click', onDocumentClick));

        // ==================== Lot helpers ====================

        function lotDisplayText(lot) {
            const expStr = lot.expiration ? formatDateSwiss(new Date(lot.expiration)) : '';
            const expired = isLotExpired(lot.expiration);
            let suffix = '';
            if (expired) suffix = ' [EXPIRE]';
            else if (isLotLowStock(lot)) suffix = ' [STOCK BAS]';
            const qtyStr = lot.quantity != null ? ` [${lot.quantity} doses]` : '';
            return `${lot.lot}${expStr ? ` (exp: ${expStr})` : ''}${qtyStr}${suffix}`;
        }

        function selectedLotExpiryWarning(vax) {
            const lots = getLotsForVaccine(vax.vaccine);
            const selected = lots.find(l => l.lot === vax.lot);
            if (selected && isLotExpiringSoon(selected.expiration)) {
                return getDaysUntilExpiry(selected.expiration);
            }
            return null;
        }

        function selectedLotLowStock(vax) {
            const lots = getLotsForVaccine(vax.vaccine);
            const selected = lots.find(l => l.lot === vax.lot);
            return selected ? isLotLowStock(selected) : false;
        }

        // ==================== Card actions (wrappers) ====================

        function onRemoveVaccine(id) { removeVax(id); }

        function onChangeDose(vax, newDose) { changeDose(vax, Number(newDose)); }

        function onToggleAdministered(vax) { onAdministeredToggle(vax); }

        function onAddBooster(vax) { addManualBooster(vax); }

        function onRemoveBooster(vax, idx) { removeBooster(vax, idx); }

        return {
            vaccines, lotsCount, uniqueVaccineNames,
            injectionSites,
            showDropdown, searchQuery, searchInput, dropdownWrapper,
            toggleDropdown, filteredWithLots, filteredWithoutLots, selectFromDropdown,
            getLotsForVaccine, hasLots, isLotExpired,
            getTotalDoses,
            lotDisplayText, selectedLotExpiryWarning, selectedLotLowStock,
            onRemoveVaccine, onChangeDose, onToggleAdministered,
            onAddBooster, onRemoveBooster
        };
    },

    template: `
    <div class="accordion-body">
        <h3>Vaccins</h3>
        <div class="vaccine-lot-status">
            {{ lotsCount }} lots charges &mdash; {{ uniqueVaccineNames.length }} vaccins disponibles
        </div>

        <!-- Empty state -->
        <div v-if="vaccines.length === 0" class="no-data-message">
            Aucun vaccin selectionne. Utilisez le bouton ci-dessous pour ajouter un vaccin.
        </div>

        <!-- Vaccine cards -->
        <div v-for="vax in vaccines" :key="vax.id"
             class="vax-card" :class="{ 'vax-planning': !vax.administered, 'vax-preloaded': vax.preloaded }">

            <div class="vax-card-header">
                <div class="vax-card-title">
                    <span class="vax-card-name">{{ vax.vaccine }}</span>
                    <span v-if="vax.preloaded" class="vax-preloaded-badge">Teleconsultation</span>
                </div>
                <button class="remove-btn" @click="onRemoveVaccine(vax.id)" title="Retirer">&#10005;</button>
            </div>

            <!-- Administered toggle -->
            <div class="vax-toggle">
                <input type="checkbox" :id="'adm-' + vax.id" v-model="vax.administered"
                       @change="onToggleAdministered(vax)">
                <label :for="'adm-' + vax.id">Administre aujourd'hui</label>
                <span v-if="!vax.administered" class="vax-planning-hint">— planification uniquement</span>
            </div>

            <!-- Dose + Lot row -->
            <div class="vax-fields">
                <template v-if="getTotalDoses(vax.vaccine) > 1">
                    <label>Dose :</label>
                    <select class="vax-dose-select" :value="vax.doseNumber"
                            @change="onChangeDose(vax, $event.target.value)">
                        <option v-for="d in getTotalDoses(vax.vaccine)" :key="d" :value="d">{{ d }}</option>
                    </select>
                </template>

                <template v-if="vax.administered && hasLots(vax.vaccine)">
                    <label>Lot :</label>
                    <select class="vax-lot-select" v-model="vax.lot">
                        <option v-for="lot in getLotsForVaccine(vax.vaccine)" :key="lot.lot"
                                :value="lot.lot" :disabled="isLotExpired(lot.expiration)">
                            {{ lotDisplayText(lot) }}
                        </option>
                    </select>
                    <span v-if="selectedLotExpiryWarning(vax)" class="lot-tag-expiring">
                        Expire dans {{ selectedLotExpiryWarning(vax) }}j
                    </span>
                    <span v-if="selectedLotLowStock(vax)" class="lot-tag-low-stock">
                        STOCK BAS
                    </span>
                </template>
            </div>

            <!-- Site injection -->
            <div v-if="vax.administered" class="vax-fields">
                <label>Site :</label>
                <div class="vax-site-group">
                    <label class="vax-site-radio" v-for="site in injectionSites" :key="site.value">
                        <input type="radio" :name="'site-' + vax.id" :value="site.value" v-model="vax.site">
                        {{ site.label }}
                    </label>
                </div>
                <span v-if="!vax.site" class="vax-site-missing">requis</span>
            </div>

            <!-- Boosters -->
            <div class="vax-boosters">
                <template v-if="vax.boosters.length > 0">
                    <div class="vax-boosters-title">Rappels</div>
                    <div v-for="(booster, idx) in vax.boosters" :key="idx" class="vax-booster-line">
                        <span class="vax-booster-dose">Dose {{ booster.dose }}</span>
                        <span class="vax-booster-interval">{{ booster.interval }}</span>
                        <span style="color:#ccc;">&#8594;</span>
                        <input type="date" v-model="booster.date"
                               :placeholder="vax.administered ? '' : 'a definir'">
                        <button v-if="booster.manual" class="remove-btn"
                                @click="onRemoveBooster(vax, idx)" title="Retirer"
                                style="padding:2px 6px; font-size:11px;">&#10005;</button>
                    </div>
                </template>
                <template v-else>
                    <div class="vax-no-booster">(pas de rappel)</div>
                </template>
                <button class="vax-add-booster" @click="onAddBooster(vax)">+ Rappel</button>
            </div>
        </div>

        <!-- Add vaccine dropdown -->
        <div class="vax-dropdown-wrapper" ref="dropdownWrapper">
            <button class="vax-add-btn" @click="toggleDropdown">
                + Ajouter un vaccin
            </button>
            <div class="vax-dropdown" v-if="showDropdown">
                <div class="vax-dropdown-search">
                    <input ref="searchInput" type="text" v-model="searchQuery"
                           placeholder="Rechercher un vaccin..."
                           @keydown.escape="showDropdown = false">
                </div>

                <template v-if="filteredWithLots.length > 0">
                    <div class="vax-dropdown-group">Lots disponibles (administration)</div>
                    <div v-for="v in filteredWithLots" :key="v.name"
                         class="vax-dropdown-item" :class="{ disabled: v.added }"
                         @click="!v.added && selectFromDropdown(v.name, true)">
                        <span>{{ v.name }}</span>
                    </div>
                </template>

                <template v-if="filteredWithoutLots.length > 0">
                    <div class="vax-dropdown-group">Autres vaccins (planification)</div>
                    <div v-for="v in filteredWithoutLots" :key="v.name"
                         class="vax-dropdown-item" :class="{ disabled: v.added }"
                         @click="!v.added && selectFromDropdown(v.name, false)">
                        <span>{{ v.name }}</span>
                    </div>
                </template>
            </div>
        </div>
    </div>
    `
};
