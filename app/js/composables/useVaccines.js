/**
 * Vaccines composable — Unified workflow
 *
 * Each vaccine = a card with: name, administered toggle, dose, lot, site, boosters.
 * Modes: administered (in-cabinet) or planned (teleconsultation).
 * Planned vaccines persist as boosters_scheduled (status=a_planifier) and
 * pre-load into the panel when the patient returns.
 */
import * as pbApi from '../api/pocketbase.js';
import { VACCINE_SCHEDULES } from '../data/vaccine-schedules.js';

const { ref, computed } = Vue;

const vaccineLots = ref([]);
const vaccines = ref([]);
let nextId = 1;

const ALL_VACCINE_NAMES = Object.keys(VACCINE_SCHEDULES).sort();

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
            expiration: r.expiration ? new Date(r.expiration) : null,
            quantity: r.quantity ?? 0
        }));
    }

    function getLotsForVaccine(vaccineName) {
        return vaccineLots.value.filter(l => l.vaccine === vaccineName);
    }

    function getValidLotsForVaccine(vaccineName) {
        return getLotsForVaccine(vaccineName).filter(l => !isLotExpired(l.expiration) && l.quantity !== 0);
    }

    function isLotLowStock(lot, threshold = 5) {
        return lot.quantity > 0 && lot.quantity <= threshold;
    }

    function hasLots(vaccineName) {
        return uniqueVaccineNames.value.includes(vaccineName);
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

    // ==================== Schedule helpers ====================

    function getSchedule(vaccineName) {
        return VACCINE_SCHEDULES[vaccineName]?.boosters || [];
    }

    function getTotalDoses(vaccineName) {
        return 1 + getSchedule(vaccineName).length;
    }

    function calculateBoosterDate(fromDate, days) {
        const d = new Date(fromDate);
        d.setDate(d.getDate() + days);
        return d.toISOString().split('T')[0];
    }

    /**
     * Build remaining boosters after doseNumber.
     * administered=true: dates pre-filled from today.
     * administered=false: dates empty.
     */
    function buildBoosters(vaccineName, doseNumber, administered) {
        const schedule = getSchedule(vaccineName);
        const today = new Date();
        const result = [];
        for (const b of schedule) {
            if (b.dose > doseNumber) {
                result.push({
                    dose: b.dose,
                    interval: b.interval,
                    date: administered ? calculateBoosterDate(today, b.days) : '',
                    manual: false
                });
            }
        }
        return result;
    }

    // ==================== Vaccine card operations ====================

    function addVaccine(vaccineName, administered) {
        // Don't add duplicates
        if (vaccines.value.some(v => v.vaccine === vaccineName)) return;

        const validLots = administered ? getValidLotsForVaccine(vaccineName) : [];
        vaccines.value.push({
            vaccine: vaccineName,
            administered,
            doseNumber: 1,
            lot: validLots.length > 0 ? validLots[0].lot : '',
            site: '',
            boosters: buildBoosters(vaccineName, 1, administered),
            preloaded: false,
            preloadedBoosterIds: [],
            id: nextId++
        });
    }

    function removeVaccine(id) {
        vaccines.value = vaccines.value.filter(v => v.id !== id);
    }

    function changeDoseNumber(vax, newDose) {
        vax.doseNumber = newDose;
        vax.boosters = buildBoosters(vax.vaccine, newDose, vax.administered);
    }

    function onAdministeredToggle(vax) {
        if (vax.administered) {
            const validLots = getValidLotsForVaccine(vax.vaccine);
            vax.lot = validLots.length > 0 ? validLots[0].lot : '';
        } else {
            vax.lot = '';
            vax.site = '';
        }
        vax.boosters = buildBoosters(vax.vaccine, vax.doseNumber, vax.administered);
    }

    function updateLot(vax, newLot) {
        vax.lot = newLot;
    }

    function updateSite(vax, site) {
        vax.site = site;
    }

    function addManualBooster(vax) {
        const lastDose = vax.boosters.length > 0
            ? Math.max(...vax.boosters.map(b => b.dose))
            : vax.doseNumber;
        vax.boosters.push({
            dose: lastDose + 1,
            interval: 'manuel',
            date: '',
            manual: true
        });
    }

    function removeBooster(vax, index) {
        vax.boosters.splice(index, 1);
    }

    // ==================== Load pending boosters from DB ====================

    async function loadPendingBoosters(patientId) {
        if (!patientId) return;
        try {
            const records = await pbApi.getPendingBoosters(patientId);
            if (records.length === 0) return;

            // Group by vaccine_name
            const grouped = {};
            for (const r of records) {
                if (!grouped[r.vaccine_name]) grouped[r.vaccine_name] = [];
                grouped[r.vaccine_name].push(r);
            }

            // Create a card per vaccine
            for (const [vaccineName, boosters] of Object.entries(grouped)) {
                // Skip if already added
                if (vaccines.value.some(v => v.vaccine === vaccineName)) continue;

                // Sort by dose_number
                boosters.sort((a, b) => (a.dose_number || 1) - (b.dose_number || 1));

                const minDose = boosters[0].dose_number || 1;
                const validLots = getValidLotsForVaccine(vaccineName);
                const hasAvailableLots = validLots.length > 0;

                vaccines.value.push({
                    vaccine: vaccineName,
                    administered: hasAvailableLots, // auto-check if lots available
                    doseNumber: minDose,
                    lot: hasAvailableLots ? validLots[0].lot : '',
                    site: '',
                    boosters: buildBoosters(vaccineName, minDose, hasAvailableLots),
                    preloaded: true,
                    preloadedBoosterIds: boosters.map(b => b.id),
                    id: nextId++
                });
            }
        } catch (e) {
            console.error('Failed to load pending boosters:', e);
        }
    }

    // ==================== Save ====================

    async function saveVaccines(patientId, consultationId, caseId) {
        for (const vax of vaccines.value) {
            if (vax.administered) {
                // --- Administered vaccine ---
                const vaccineRecord = await pbApi.createVaccineAdministered({
                    patient: patientId,
                    consultation: consultationId,
                    vaccine_name: vax.vaccine,
                    lot: vax.lot,
                    site_injection: vax.site || '',
                    dose_number: vax.doseNumber,
                    date: new Date().toISOString().split('T')[0]
                });

                // Auto-decrement stock + audit trail
                if (vax.lot) {
                    const matchingLot = vaccineLots.value.find(
                        l => l.vaccine === vax.vaccine && l.lot === vax.lot
                    );
                    if (matchingLot && matchingLot.quantity > 0) {
                        const previousQty = matchingLot.quantity;
                        const newQty = previousQty - 1;
                        try {
                            await pbApi.updateVaccineLot(matchingLot.id, { quantity: newQty });
                            matchingLot.quantity = newQty;
                        } catch (e) {
                            console.warn('Stock decrement failed (permission?):', e.message);
                        }
                        try {
                            await pbApi.createStockAdjustment({
                                vaccine_lot: matchingLot.id,
                                previous_qty: previousQty,
                                new_qty: newQty,
                                reason: 'administration',
                                adjusted_by: pbApi.getCurrentUser()?.id
                            });
                        } catch (e) {
                            console.warn('Stock audit trail failed:', e.message, 'details:', JSON.stringify(e.response || e.data || e));
                        }
                    }
                    // Set vaccine_lot relation on the administered record
                    if (matchingLot) {
                        try {
                            await pbApi.updateVaccineAdministered(vaccineRecord.id, {
                                vaccine_lot: matchingLot.id
                            });
                        } catch (e) {
                            console.warn('Vaccine lot link failed:', e.message);
                        }
                    }
                }

                if (vax.preloaded && vax.preloadedBoosterIds.length > 0) {
                    // Update pre-loaded boosters
                    // First booster ID = the administered dose -> complete
                    await pbApi.updateBooster(vax.preloadedBoosterIds[0], {
                        status: 'complete',
                        vaccine_administered: vaccineRecord.id
                    });

                    // Remaining pre-loaded boosters -> planifie with dates
                    const schedule = getSchedule(vax.vaccine);
                    let boosterIdx = 1;
                    for (const b of schedule) {
                        if (b.dose > vax.doseNumber && boosterIdx < vax.preloadedBoosterIds.length) {
                            const boosterDate = vax.boosters.find(bst => bst.dose === b.dose)?.date || null;
                            await pbApi.updateBooster(vax.preloadedBoosterIds[boosterIdx], {
                                due_date: boosterDate || calculateBoosterDate(new Date(), b.days),
                                status: 'planifie',
                                vaccine_administered: vaccineRecord.id
                            });
                            boosterIdx++;
                        }
                    }
                } else {
                    // Direct administration: create new boosters for remaining doses
                    for (const b of vax.boosters) {
                        await pbApi.createBooster({
                            patient: patientId,
                            case: caseId || null,
                            vaccine_name: vax.vaccine,
                            vaccine_administered: vaccineRecord.id,
                            due_date: b.date || null,
                            dose_number: b.dose,
                            status: b.date ? 'planifie' : 'a_planifier'
                        });
                    }
                }
            } else {
                // --- Planned vaccine (teleconsultation) ---
                // Create booster for the planned dose itself
                await pbApi.createBooster({
                    patient: patientId,
                    case: caseId || null,
                    vaccine_name: vax.vaccine,
                    vaccine_administered: null,
                    due_date: null,
                    dose_number: vax.doseNumber,
                    status: 'a_planifier'
                });
                // Create boosters for remaining doses
                for (const b of vax.boosters) {
                    await pbApi.createBooster({
                        patient: patientId,
                        case: caseId || null,
                        vaccine_name: vax.vaccine,
                        vaccine_administered: null,
                        due_date: null,
                        dose_number: b.dose,
                        status: 'a_planifier'
                    });
                }
            }
        }
    }

    // ==================== Reset ====================

    function clearAll() {
        vaccines.value = [];
    }

    return {
        vaccineLots,
        vaccines,
        allVaccineNames: ALL_VACCINE_NAMES,
        uniqueVaccineNames,
        lotsCount,
        loadLots,
        getLotsForVaccine,
        getValidLotsForVaccine,
        hasLots,
        isLotExpired,
        isLotExpiringSoon,
        isLotLowStock,
        getDaysUntilExpiry,
        getSchedule,
        getTotalDoses,
        addVaccine,
        removeVaccine,
        changeDoseNumber,
        onAdministeredToggle,
        updateLot,
        updateSite,
        addManualBooster,
        removeBooster,
        loadPendingBoosters,
        saveVaccines,
        clearAll
    };
}
