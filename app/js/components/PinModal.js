/**
 * PIN Modal Component
 *
 * Two modes:
 * - Setup: no PIN set on location → enter 4 digits + confirm → emit 'setup'
 * - Verify: PIN exists → enter 4 digits → emit 'verified' on match
 */
export default {
    name: 'PinModal',

    props: {
        visible: { type: Boolean, default: false },
        isSetup: { type: Boolean, default: false },
        externalError: { type: String, default: '' }
    },

    emits: ['close', 'verified', 'setup'],

    setup(props, { emit }) {
        const pin = Vue.ref('');
        const confirmPin = Vue.ref('');
        const error = Vue.ref('');
        const pinInput = Vue.ref(null);

        Vue.watch(() => props.visible, (v) => {
            if (v) {
                pin.value = '';
                confirmPin.value = '';
                error.value = '';
                Vue.nextTick(() => { if (pinInput.value) pinInput.value.focus(); });
            }
        });

        function onSubmit() {
            if (pin.value.length !== 4 || !/^\d{4}$/.test(pin.value)) {
                error.value = 'Le PIN doit contenir 4 chiffres';
                return;
            }

            if (props.isSetup) {
                if (pin.value !== confirmPin.value) {
                    error.value = 'Les PIN ne correspondent pas';
                    return;
                }
                emit('setup', pin.value);
            } else {
                emit('verified', pin.value);
            }
        }

        function onClose() {
            emit('close');
        }

        return { pin, confirmPin, error, pinInput, onSubmit, onClose };
    },

    template: `
    <div v-if="visible" class="modal-overlay" @click.self="onClose">
        <div class="modal-content pin-modal">
            <div class="modal-header">
                <h2>{{ isSetup ? 'Creer un PIN' : 'Entrer le PIN' }}</h2>
                <button class="modal-close" @click="onClose">&times;</button>
            </div>
            <div class="modal-body">
                <p v-if="isSetup" class="pin-description">
                    Definissez un code PIN a 4 chiffres pour proteger la modification du stock a ce lieu.
                </p>
                <p v-else class="pin-description">
                    Entrez le code PIN pour modifier le stock.
                </p>

                <div class="pin-error" v-if="error || externalError">{{ error || externalError }}</div>

                <div class="pin-field">
                    <label>PIN</label>
                    <input ref="pinInput" type="password" inputmode="numeric" maxlength="4"
                           v-model="pin" pattern="[0-9]*" autocomplete="off"
                           class="pin-input" placeholder="____"
                           @keydown.enter="onSubmit">
                </div>

                <div v-if="isSetup" class="pin-field">
                    <label>Confirmer le PIN</label>
                    <input type="password" inputmode="numeric" maxlength="4"
                           v-model="confirmPin" pattern="[0-9]*" autocomplete="off"
                           class="pin-input" placeholder="____"
                           @keydown.enter="onSubmit">
                </div>

                <div class="pin-actions">
                    <button class="btn-secondary btn-small" @click="onClose">Annuler</button>
                    <button class="btn-primary btn-small" @click="onSubmit"
                            :disabled="pin.length !== 4">
                        {{ isSetup ? 'Enregistrer' : 'Valider' }}
                    </button>
                </div>
            </div>
        </div>
    </div>
    `
};
