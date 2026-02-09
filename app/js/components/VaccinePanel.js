/**
 * Vaccine Panel Component
 * Vaccine administration + booster scheduling
 *
 * Before: ~250 lines of innerHTML with onclick strings (lines 2845-2993)
 * After: reactive v-for, v-model, computed properties
 */
import { useVaccines } from '../composables/useVaccines.js';
import { formatDateSwiss } from '../utils/formatting.js';

export default {
    name: 'VaccinePanel',

    setup() {
        const {
            vaccineLots, administeredVaccines, plannedBoosters,
            uniqueVaccineNames, vaccineScheduleList, hasSecondBooster,
            getLotsForVaccine, getValidLotsForVaccine,
            isLotExpired, isLotExpiringSoon, getDaysUntilExpiry,
            toggleVaccine, isVaccineSelected, updateLot, removeVaccine,
            toggleBooster, isBoosterSelected, updateBoosterDate, removeBooster
        } = useVaccines();

        function lotDisplayText(lot) {
            const expStr = lot.expiration ? formatDateSwiss(new Date(lot.expiration)) : '';
            const expired = isLotExpired(lot.expiration);
            const expiring = isLotExpiringSoon(lot.expiration);
            let suffix = '';
            if (expired) suffix = ' [EXPIRE]';
            else if (expiring) suffix = ' [!]';
            return `${lot.lot}${expStr ? ` (exp: ${expStr})` : ''}${suffix}`;
        }

        function allLotsExpired(vaccineName) {
            const lots = getLotsForVaccine(vaccineName);
            return lots.length > 0 && lots.every(l => isLotExpired(l.expiration));
        }

        function hasExpiringSoonLots(vaccineName) {
            return getLotsForVaccine(vaccineName).some(l => isLotExpiringSoon(l.expiration));
        }

        function selectedLotExpiryWarning(item) {
            const lots = getLotsForVaccine(item.vaccine);
            const selected = lots.find(l => l.lot === item.lot);
            if (selected && isLotExpiringSoon(selected.expiration)) {
                return `Expire dans ${getDaysUntilExpiry(selected.expiration)} jours`;
            }
            return null;
        }

        return {
            vaccineLots, administeredVaccines, plannedBoosters,
            uniqueVaccineNames, vaccineScheduleList, hasSecondBooster,
            getLotsForVaccine, getValidLotsForVaccine,
            isLotExpired, isLotExpiringSoon,
            toggleVaccine, isVaccineSelected, updateLot, removeVaccine,
            toggleBooster, isBoosterSelected, updateBoosterDate, removeBooster,
            lotDisplayText, allLotsExpired, hasExpiringSoonLots, selectedLotExpiryWarning
        };
    },

    template: `
    <div class="accordion-body">
        <!-- Administered vaccines -->
        <h3>Vaccins administres aujourd'hui</h3>
        <label>Selectionner les vaccins :</label>

        <div v-if="vaccineLots.length === 0" class="no-data-message">
            Importez d'abord le fichier des lots vaccins
        </div>

        <div v-else class="checkbox-multiselect">
            <div v-for="vaccine in uniqueVaccineNames" :key="vaccine"
                 class="checkbox-item"
                 :class="{ selected: isVaccineSelected(vaccine), disabled: allLotsExpired(vaccine) }"
                 @click="!allLotsExpired(vaccine) && toggleVaccine(vaccine)">
                <input type="checkbox" :checked="isVaccineSelected(vaccine)" :disabled="allLotsExpired(vaccine)" @click.stop>
                <label>{{ vaccine }}</label>
                <span v-if="allLotsExpired(vaccine)" class="lot-expired">Tous lots expires</span>
                <span v-else-if="hasExpiringSoonLots(vaccine)" class="lot-warning">Lot proche expiration</span>
            </div>
        </div>

        <!-- Administered vaccines table -->
        <table v-if="administeredVaccines.length > 0" class="vaccine-table">
            <thead>
                <tr><th>Vaccin</th><th>N de lot</th><th></th></tr>
            </thead>
            <tbody>
                <tr v-for="item in administeredVaccines" :key="item.id">
                    <td>{{ item.vaccine }}</td>
                    <td>
                        <select :value="item.lot" @change="updateLot(item.id, $event.target.value)">
                            <option v-for="lot in getLotsForVaccine(item.vaccine)" :key="lot.lot"
                                    :value="lot.lot" :disabled="isLotExpired(lot.expiration)">
                                {{ lotDisplayText(lot) }}
                            </option>
                        </select>
                        <span v-if="selectedLotExpiryWarning(item)" class="expiry-warning">
                            {{ selectedLotExpiryWarning(item) }}
                        </span>
                    </td>
                    <td><button class="remove-row" @click="removeVaccine(item.id)">x</button></td>
                </tr>
            </tbody>
        </table>

        <!-- Booster scheduling -->
        <h3 style="margin-top: 30px;">Rappels a planifier</h3>
        <label>Selectionner les vaccins necessitant un rappel :</label>

        <div class="checkbox-multiselect">
            <div v-for="vaccine in vaccineScheduleList" :key="vaccine.name"
                 class="checkbox-item" :class="{ selected: isBoosterSelected(vaccine.name) }"
                 @click="toggleBooster(vaccine.name)">
                <input type="checkbox" :checked="isBoosterSelected(vaccine.name)" @click.stop>
                <label>{{ vaccine.name }}</label>
                <span v-if="vaccine.booster1Interval" class="booster-info">
                    -> {{ vaccine.booster1Interval }}
                    <template v-if="vaccine.booster2Interval">, {{ vaccine.booster2Interval }}</template>
                </span>
                <span v-else class="booster-info-manual">(date manuelle)</span>
            </div>
        </div>

        <!-- Booster table -->
        <table v-if="plannedBoosters.length > 0" class="vaccine-table">
            <thead>
                <tr>
                    <th>Vaccin</th>
                    <th>1er rappel</th>
                    <th v-if="hasSecondBooster">2eme rappel</th>
                    <th></th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="item in plannedBoosters" :key="item.id">
                    <td>{{ item.vaccine }}</td>
                    <td>
                        <input type="date" :value="item.booster1Date"
                               @change="updateBoosterDate(item.id, 1, $event.target.value)">
                    </td>
                    <td v-if="hasSecondBooster">
                        <input type="date" :value="item.booster2Date"
                               @change="updateBoosterDate(item.id, 2, $event.target.value)">
                    </td>
                    <td><button class="remove-row" @click="removeBooster(item.id)">x</button></td>
                </tr>
            </tbody>
        </table>
    </div>
    `
};
