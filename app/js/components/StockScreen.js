/**
 * Stock Screen Component
 *
 * Full vaccine stock management screen:
 * - Read-only stock view for all practitioners
 * - PIN-protected edit mode for inventory management
 * - Manual lot entry + PDF delivery note parsing
 * - Manual quantity adjustments with audit trail
 */
import { useStock } from '../composables/useStock.js';
import { useAuth } from '../composables/useAuth.js';
import { formatDateSwiss } from '../utils/formatting.js';
import PinModal from './PinModal.js';
import StockLotForm from './StockLotForm.js';

export default {
    name: 'StockScreen',
    components: { PinModal, StockLotForm },

    emits: ['back'],

    setup(props, { emit }) {
        const { locationName } = useAuth();
        const stock = useStock();

        const showPinModal = Vue.ref(false);
        const showLotForm = Vue.ref(false);
        const editingLot = Vue.ref(null);
        const pinError = Vue.ref('');
        const confirmDelete = Vue.ref(null); // lot id pending delete confirmation
        const loading = Vue.ref(false);

        // Load stock on mount
        Vue.onMounted(async () => {
            loading.value = true;
            try {
                await stock.loadLocationPin();
                await stock.loadStock();
            } finally {
                loading.value = false;
            }
        });

        // ==================== Navigation ====================

        function goBack() {
            stock.lockEditing();
            emit('back');
        }

        // ==================== PIN ====================

        function onEditClick() {
            pinError.value = '';
            showPinModal.value = true;
        }

        function onPinVerified(pin) {
            const ok = stock.verifyPin(pin);
            if (ok) {
                showPinModal.value = false;
                pinError.value = '';
            } else {
                pinError.value = 'PIN incorrect';
            }
        }

        function onPinSetup(pin) {
            stock.setupPin(pin);
            showPinModal.value = false;
        }

        function onPinClose() {
            showPinModal.value = false;
            pinError.value = '';
        }

        function lockEditing() {
            stock.lockEditing();
        }

        // ==================== Lot CRUD ====================

        function openAddLot() {
            editingLot.value = null;
            showLotForm.value = true;
        }

        function openEditLot(lot) {
            editingLot.value = lot;
            showLotForm.value = true;
        }

        async function onLotSave(data) {
            try {
                await stock.saveLot(data);
                showLotForm.value = false;
                editingLot.value = null;
            } catch (e) {
                alert('Erreur: ' + e.message);
            }
        }

        async function onLotSaveBatch(lotsArray) {
            try {
                await stock.saveLotsBatch(lotsArray);
                showLotForm.value = false;
                editingLot.value = null;
            } catch (e) {
                alert('Erreur: ' + e.message);
            }
        }

        function onLotFormClose() {
            showLotForm.value = false;
            editingLot.value = null;
        }

        // ==================== Delete ====================

        function askDelete(lot) {
            confirmDelete.value = lot.id;
        }

        async function doDelete(lotId) {
            try {
                await stock.deleteLot(lotId);
            } catch (e) {
                alert('Erreur: ' + e.message);
            }
            confirmDelete.value = null;
        }

        function cancelDelete() {
            confirmDelete.value = null;
        }

        // ==================== Helpers ====================

        function formatExp(expiration) {
            if (!expiration) return '-';
            return formatDateSwiss(new Date(expiration));
        }

        function statusClass(lot) {
            return 'stock-status-' + stock.lotStatus(lot);
        }

        return {
            locationName, stock, loading,
            showPinModal, showLotForm, editingLot, pinError,
            confirmDelete,
            goBack, onEditClick, onPinVerified, onPinSetup, onPinClose, lockEditing,
            openAddLot, openEditLot, onLotSave, onLotSaveBatch, onLotFormClose,
            askDelete, doDelete, cancelDelete,
            formatExp, statusClass
        };
    },

    template: `
    <div class="stock-screen">
        <!-- Header -->
        <div class="stock-header">
            <div class="stock-header-left">
                <button class="btn-secondary btn-small" @click="goBack">&larr; Retour</button>
                <h1>Stock Vaccins</h1>
                <span class="location-badge">{{ locationName }}</span>
            </div>
            <div class="stock-header-right">
                <template v-if="stock.editUnlocked.value">
                    <button class="btn-success btn-small" @click="openAddLot">+ Ajouter un lot</button>
                    <button class="btn-secondary btn-small" @click="lockEditing">Verrouiller</button>
                </template>
                <button v-else class="btn-primary btn-small" @click="onEditClick">
                    Modifier le stock
                </button>
            </div>
        </div>

        <!-- Summary cards -->
        <div class="stock-summary">
            <div class="stock-stat-card">
                <div class="stock-stat-value">{{ stock.summaryStats.value.totalLots }}</div>
                <div class="stock-stat-label">Lots</div>
            </div>
            <div class="stock-stat-card">
                <div class="stock-stat-value">{{ stock.summaryStats.value.totalDoses }}</div>
                <div class="stock-stat-label">Doses</div>
            </div>
            <div class="stock-stat-card" :class="{ 'stock-stat-warn': stock.summaryStats.value.expiringSoon > 0 }">
                <div class="stock-stat-value">{{ stock.summaryStats.value.expiringSoon }}</div>
                <div class="stock-stat-label">Expire bientot</div>
            </div>
            <div class="stock-stat-card" :class="{ 'stock-stat-danger': stock.summaryStats.value.expired > 0 }">
                <div class="stock-stat-value">{{ stock.summaryStats.value.expired }}</div>
                <div class="stock-stat-label">Expires</div>
            </div>
        </div>

        <!-- Search -->
        <div class="stock-controls">
            <input type="text" v-model="stock.searchQuery.value" placeholder="Rechercher un vaccin ou lot..."
                   class="stock-search-input">
        </div>

        <!-- Loading -->
        <div v-if="loading" class="no-data-message">Chargement du stock...</div>

        <!-- Empty state -->
        <div v-else-if="stock.sortedFilteredLots.value.length === 0" class="no-data-message">
            {{ stock.searchQuery.value ? 'Aucun resultat pour cette recherche.' : 'Aucun lot en stock.' }}
        </div>

        <!-- Stock table -->
        <div v-else class="stock-table-wrapper">
            <table class="stock-table">
                <thead>
                    <tr>
                        <th>Vaccin</th>
                        <th>Lot</th>
                        <th>Expiration</th>
                        <th>Quantite</th>
                        <th>Statut</th>
                        <th v-if="stock.editUnlocked.value">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="lot in stock.sortedFilteredLots.value" :key="lot.id"
                        :class="statusClass(lot)">
                        <td class="stock-cell-vaccine">{{ lot.vaccine }}</td>
                        <td class="stock-cell-lot">{{ lot.lot }}</td>
                        <td>{{ formatExp(lot.expiration) }}</td>
                        <td class="stock-cell-qty">
                            <template v-if="stock.adjustingLot.value?.id === lot.id">
                                <div class="stock-adjust-inline">
                                    <input type="number" v-model.number="stock.adjustNewQty.value"
                                           min="0" class="stock-adjust-input">
                                    <select v-model="stock.adjustReason.value" class="stock-adjust-reason">
                                        <option v-for="r in stock.ADJUSTMENT_REASONS" :key="r.value"
                                                :value="r.value">{{ r.label }}</option>
                                    </select>
                                    <button class="btn-success btn-small" @click="stock.confirmAdjustment()"
                                            style="padding:4px 8px;">&#10003;</button>
                                    <button class="btn-secondary btn-small" @click="stock.cancelAdjustment()"
                                            style="padding:4px 8px;">&#10005;</button>
                                </div>
                            </template>
                            <template v-else>
                                {{ lot.quantity }}
                            </template>
                        </td>
                        <td>
                            <span class="stock-status-badge" :class="'badge-' + stock.lotStatus(lot)">
                                {{ stock.statusLabel(stock.lotStatus(lot)) }}
                            </span>
                        </td>
                        <td v-if="stock.editUnlocked.value" class="stock-cell-actions">
                            <template v-if="confirmDelete === lot.id">
                                <span class="stock-confirm-delete">Supprimer ?</span>
                                <button class="btn-danger btn-small" @click="doDelete(lot.id)"
                                        style="padding:3px 8px; font-size:11px;">Oui</button>
                                <button class="btn-secondary btn-small" @click="cancelDelete"
                                        style="padding:3px 8px; font-size:11px;">Non</button>
                            </template>
                            <template v-else>
                                <button class="stock-action-btn" @click="stock.startAdjustment(lot)"
                                        title="Ajuster quantite">&#177;</button>
                                <button class="stock-action-btn" @click="openEditLot(lot)"
                                        title="Modifier">&#9998;</button>
                                <button class="stock-action-btn stock-action-delete" @click="askDelete(lot)"
                                        title="Supprimer">&#128465;</button>
                            </template>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        <!-- PIN Modal -->
        <PinModal :visible="showPinModal"
                  :is-setup="!stock.hasPinSetup()"
                  :external-error="pinError"
                  @close="onPinClose"
                  @verified="onPinVerified"
                  @setup="onPinSetup" />

        <!-- Lot Form Modal -->
        <StockLotForm :visible="showLotForm"
                      :edit-lot="editingLot"
                      @close="onLotFormClose"
                      @save="onLotSave"
                      @save-batch="onLotSaveBatch" />
    </div>
    `
};
