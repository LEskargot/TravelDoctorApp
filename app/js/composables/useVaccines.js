/**
 * Vaccines composable
 * Manages vaccine lots, administered vaccines, and booster scheduling
 *
 * Before: ~400 lines of global state + innerHTML rendering (lines 2845-2993)
 * After: reactive arrays, computed properties, no DOM access
 */
import * as pbApi from '../api/pocketbase.js';
import { VACCINE_SCHEDULES } from '../data/vaccine-schedules.js';

const { ref, computed } = Vue;

const vaccineLots = ref([]);
const administeredVaccines = ref([]);
const plannedBoosters = ref([]);

export function useVaccines() {

    // ==================== Lots ====================

    const uniqueVaccineNames = computed(() =>
        [...new Set(vaccineLots.value.map(l => l.vaccine))].sort()
    );

    const lotsCount = computed(() => vaccineLots.value.length);

    async function loadLots(locationId) {
        const records = await pbApi.getVaccineLots(locationId);
        vaccineLots.value = records.map(r => ({
            id: r.id,
            vaccine: r.vaccine,
            lot: r.lot,
            expiration: r.expiration ? new Date(r.expiration) : null
        }));
    }

    function getLotsForVaccine(vaccineName) {
        return vaccineLots.value.filter(l => l.vaccine === vaccineName);
    }

    function getValidLotsForVaccine(vaccineName) {
        return getLotsForVaccine(vaccineName).filter(l => !isLotExpired(l.expiration));
    }

    // ==================== Expiration helpers ====================

    function isLotExpired(expirationDate) {
        if (!expirationDate) return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return new Date(expirationDate) < today;
    }

    function isLotExpiringSoon(expirationDate, daysThreshold = 30) {
        if (!expirationDate) return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const diffDays = Math.ceil((new Date(expirationDate) - today) / (1000 * 60 * 60 * 24));
        return diffDays > 0 && diffDays <= daysThreshold;
    }

    function getDaysUntilExpiry(expirationDate) {
        if (!expirationDate) return null;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return Math.ceil((new Date(expirationDate) - today) / (1000 * 60 * 60 * 24));
    }

    // ==================== Administered vaccines ====================

    function toggleVaccine(vaccineName) {
        const idx = administeredVaccines.value.findIndex(v => v.vaccine === vaccineName);
        if (idx === -1) {
            const validLots = getValidLotsForVaccine(vaccineName);
            administeredVaccines.value.push({
                vaccine: vaccineName,
                lot: validLots.length > 0 ? validLots[0].lot : '',
                id: Date.now() + Math.random()
            });
        } else {
            administeredVaccines.value.splice(idx, 1);
        }
    }

    function isVaccineSelected(vaccineName) {
        return administeredVaccines.value.some(v => v.vaccine === vaccineName);
    }

    function updateLot(id, newLot) {
        const item = administeredVaccines.value.find(v => v.id === id);
        if (item) item.lot = newLot;
    }

    function removeVaccine(id) {
        administeredVaccines.value = administeredVaccines.value.filter(v => v.id !== id);
    }

    // ==================== Boosters ====================

    const vaccineScheduleList = computed(() =>
        Object.keys(VACCINE_SCHEDULES).map(name => ({
            name,
            boosters: VACCINE_SCHEDULES[name].boosters,
            booster1Interval: VACCINE_SCHEDULES[name].boosters[0]?.interval || null,
            booster2Interval: VACCINE_SCHEDULES[name].boosters[1]?.interval || null
        }))
    );

    const hasSecondBooster = computed(() =>
        plannedBoosters.value.some(b => b.booster2Date)
    );

    function toggleBooster(vaccineName) {
        const idx = plannedBoosters.value.findIndex(b => b.vaccine === vaccineName);
        if (idx === -1) {
            const schedule = VACCINE_SCHEDULES[vaccineName];
            const today = new Date();
            let booster1Date = null, booster2Date = null, booster3Date = null;
            if (schedule?.boosters[0]) booster1Date = calculateBoosterDate(today, schedule.boosters[0].days);
            if (schedule?.boosters[1]) booster2Date = calculateBoosterDate(today, schedule.boosters[1].days);
            if (schedule?.boosters[2]) booster3Date = calculateBoosterDate(today, schedule.boosters[2].days);
            plannedBoosters.value.push({
                vaccine: vaccineName,
                booster1Date,
                booster2Date,
                booster3Date,
                id: Date.now() + Math.random()
            });
        } else {
            plannedBoosters.value.splice(idx, 1);
        }
    }

    function isBoosterSelected(vaccineName) {
        return plannedBoosters.value.some(b => b.vaccine === vaccineName);
    }

    function updateBoosterDate(id, boosterNum, date) {
        const item = plannedBoosters.value.find(b => b.id === id);
        if (!item) return;
        if (boosterNum === 1) item.booster1Date = date;
        else if (boosterNum === 2) item.booster2Date = date;
        else if (boosterNum === 3) item.booster3Date = date;
    }

    function removeBooster(id) {
        plannedBoosters.value = plannedBoosters.value.filter(b => b.id !== id);
    }

    function calculateBoosterDate(fromDate, days) {
        const date = new Date(fromDate);
        date.setDate(date.getDate() + days);
        return date.toISOString().split('T')[0];
    }

    // ==================== Save helpers ====================

    async function saveAdministeredVaccines(patientId, consultationId) {
        for (const vaccine of administeredVaccines.value) {
            await pbApi.createVaccineAdministered({
                patient: patientId,
                consultation: consultationId,
                vaccine_name: vaccine.vaccine,
                lot: vaccine.lot,
                date: new Date().toISOString().split('T')[0]
            });
        }
    }

    async function saveScheduledBoosters(patientId, caseId) {
        for (const booster of plannedBoosters.value) {
            const dueDates = [booster.booster1Date, booster.booster2Date, booster.booster3Date].filter(Boolean);
            for (let i = 0; i < dueDates.length; i++) {
                await pbApi.createBooster({
                    patient: patientId,
                    case: caseId || null,
                    vaccine_name: booster.vaccine,
                    due_date: dueDates[i],
                    dose_number: i + 2,
                    status: 'planifie'
                });
            }
        }
    }

    // ==================== Reset ====================

    function clearAll() {
        administeredVaccines.value = [];
        plannedBoosters.value = [];
    }

    return {
        vaccineLots,
        administeredVaccines,
        plannedBoosters,
        uniqueVaccineNames,
        lotsCount,
        vaccineScheduleList,
        hasSecondBooster,
        loadLots,
        getLotsForVaccine,
        getValidLotsForVaccine,
        isLotExpired,
        isLotExpiringSoon,
        getDaysUntilExpiry,
        toggleVaccine,
        isVaccineSelected,
        updateLot,
        removeVaccine,
        toggleBooster,
        isBoosterSelected,
        updateBoosterDate,
        removeBooster,
        saveAdministeredVaccines,
        saveScheduledBoosters,
        clearAll
    };
}
