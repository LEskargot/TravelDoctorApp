/**
 * Stock management composable — Singleton
 *
 * Manages vaccine lot inventory: CRUD, PIN-protected editing,
 * quantity adjustments with audit trail, and summary statistics.
 */
import * as pbApi from '../api/pocketbase.js';
import { useAuth } from './useAuth.js';
import { useVaccines } from './useVaccines.js';

const { ref, computed } = Vue;

const stockLots = ref([]);
const editUnlocked = ref(false);
const searchQuery = ref('');
const locationPin = ref(null); // cached PIN for current location
const adjustingLot = ref(null); // lot being adjusted (inline dialog)
const adjustNewQty = ref(0);
const adjustReason = ref('correction');

const ADJUSTMENT_REASONS = [
    { value: 'casse', label: 'Casse' },
    { value: 'perime', label: 'Perime' },
    { value: 'correction', label: 'Correction inventaire' },
    { value: 'transfert', label: 'Transfert' },
    { value: 'autre', label: 'Autre' }
];

export function useStock() {
    const { location, locationName } = useAuth();
    const vaccines = useVaccines();

    // ==================== Load ====================

    async function loadStock() {
        if (!location.value) return;
        const records = await pbApi.getVaccineLots(location.value);
        stockLots.value = records.map(r => ({
            id: r.id,
            vaccine: r.vaccine,
            lot: r.lot,
            expiration: r.expiration || null,
            quantity: r.quantity ?? 0
        }));
    }

    // ==================== Status helpers ====================

    function lotStatus(lot) {
        if (!lot.expiration) return 'ok';
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const exp = new Date(lot.expiration);
        const diffDays = Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
        if (diffDays < 0) return 'expired';
        if (diffDays <= 30) return 'expiring';
        if (lot.quantity === 0) return 'out_of_stock';
        if (lot.quantity <= 5) return 'low_stock';
        return 'ok';
    }

    function statusLabel(status) {
        const labels = {
            expired: 'Expire',
            expiring: 'Expire bientot',
            out_of_stock: 'Rupture',
            low_stock: 'Stock bas',
            ok: 'OK'
        };
        return labels[status] || status;
    }

    // ==================== Summary stats ====================

    const summaryStats = computed(() => {
        const lots = stockLots.value;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let totalDoses = 0;
        let expiringSoon = 0;
        let expired = 0;
        let outOfStock = 0;

        for (const lot of lots) {
            totalDoses += lot.quantity || 0;
            if (lot.expiration) {
                const exp = new Date(lot.expiration);
                const diffDays = Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
                if (diffDays < 0) expired++;
                else if (diffDays <= 30) expiringSoon++;
            }
            if (lot.quantity === 0) outOfStock++;
        }

        return {
            totalLots: lots.length,
            totalDoses,
            expiringSoon,
            expired,
            outOfStock
        };
    });

    // ==================== Sorted & filtered ====================

    const sortedFilteredLots = computed(() => {
        const q = searchQuery.value.toLowerCase().trim();
        let filtered = stockLots.value;

        if (q) {
            filtered = filtered.filter(l =>
                l.vaccine.toLowerCase().includes(q) ||
                l.lot.toLowerCase().includes(q)
            );
        }

        // Sort: expired first, then expiring, then by vaccine name
        return [...filtered].sort((a, b) => {
            const statusOrder = { expired: 0, out_of_stock: 1, expiring: 2, low_stock: 3, ok: 4 };
            const sa = statusOrder[lotStatus(a)] ?? 4;
            const sb = statusOrder[lotStatus(b)] ?? 4;
            if (sa !== sb) return sa - sb;
            return a.vaccine.localeCompare(b.vaccine) || a.lot.localeCompare(b.lot);
        });
    });

    // ==================== CRUD ====================

    function findExistingLot(vaccineName, lotNumber) {
        return stockLots.value.find(l =>
            l.vaccine.toLowerCase() === vaccineName.toLowerCase() &&
            l.lot.toLowerCase() === lotNumber.toLowerCase()
        );
    }

    async function upsertLot(data) {
        if (data.id) {
            // Explicit edit — overwrite
            await pbApi.updateVaccineLot(data.id, {
                vaccine: data.vaccine,
                lot: data.lot,
                expiration: data.expiration || null,
                quantity: data.quantity
            });
        } else {
            // Check for existing lot with same vaccine + lot number
            const existing = findExistingLot(data.vaccine, data.lot);
            if (existing) {
                // Merge: add quantity, update expiration if provided
                await pbApi.updateVaccineLot(existing.id, {
                    quantity: existing.quantity + data.quantity,
                    expiration: data.expiration || existing.expiration
                });
            } else {
                await pbApi.createVaccineLot({
                    location: location.value,
                    vaccine: data.vaccine,
                    lot: data.lot,
                    expiration: data.expiration || null,
                    quantity: data.quantity
                });
            }
        }
    }

    async function saveLot(data) {
        await upsertLot(data);
        await loadStock();
        await vaccines.loadLots(location.value);
    }

    async function saveLotsBatch(lotsArray) {
        for (const data of lotsArray) {
            await upsertLot(data);
            // Refresh local state after each upsert so the next findExistingLot sees updated quantities
            await loadStock();
        }
        await vaccines.loadLots(location.value);
    }

    async function deleteLot(id) {
        await pbApi.deleteVaccineLot(id);
        await loadStock();
        await vaccines.loadLots(location.value);
    }

    // ==================== Adjustments ====================

    function startAdjustment(lot) {
        adjustingLot.value = lot;
        adjustNewQty.value = lot.quantity;
        adjustReason.value = 'correction';
    }

    function cancelAdjustment() {
        adjustingLot.value = null;
    }

    async function confirmAdjustment() {
        const lot = adjustingLot.value;
        if (!lot) return;

        const { user } = useAuth();
        const previousQty = lot.quantity;
        const newQty = adjustNewQty.value;

        if (previousQty === newQty) {
            adjustingLot.value = null;
            return;
        }

        // Update lot quantity
        await pbApi.updateVaccineLot(lot.id, { quantity: newQty });

        // Create audit record
        await pbApi.createStockAdjustment({
            vaccine_lot: lot.id,
            previous_qty: previousQty,
            new_qty: newQty,
            reason: adjustReason.value,
            adjusted_by: user.value?.id
        });

        adjustingLot.value = null;
        await loadStock();
        await vaccines.loadLots(location.value);
    }

    // ==================== PIN ====================

    async function loadLocationPin() {
        if (!location.value) return;
        try {
            const loc = await pbApi.getPb().collection('locations').getOne(location.value);
            locationPin.value = loc.stock_pin || null;
        } catch {
            locationPin.value = null;
        }
    }

    function hasPinSetup() {
        return !!locationPin.value;
    }

    function verifyPin(pin) {
        if (pin === locationPin.value) {
            editUnlocked.value = true;
            return true;
        }
        return false;
    }

    async function setupPin(pin) {
        if (!location.value) return;
        await pbApi.updateLocation(location.value, { stock_pin: pin });
        locationPin.value = pin;
        editUnlocked.value = true;
    }

    function lockEditing() {
        editUnlocked.value = false;
    }

    // ==================== Reset ====================

    function reset() {
        stockLots.value = [];
        editUnlocked.value = false;
        searchQuery.value = '';
        locationPin.value = null;
        adjustingLot.value = null;
    }

    return {
        stockLots,
        editUnlocked,
        searchQuery,
        adjustingLot,
        adjustNewQty,
        adjustReason,
        ADJUSTMENT_REASONS,
        summaryStats,
        sortedFilteredLots,
        loadStock,
        lotStatus,
        statusLabel,
        saveLot,
        saveLotsBatch,
        deleteLot,
        startAdjustment,
        cancelAdjustment,
        confirmAdjustment,
        loadLocationPin,
        hasPinSetup,
        verifyPin,
        setupPin,
        lockEditing,
        reset
    };
}
