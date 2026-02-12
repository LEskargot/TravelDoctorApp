/**
 * Login Screen Component
 *
 * Compare with the original (lines 309-325, 770-832 of Travel_Doctor_App_v1.0.html):
 * - No more getElementById, manual DOM updates, or style.display toggling
 * - Template is declarative: v-if/v-model handle everything
 * - Error state is reactive
 */
import { useAuth } from '../composables/useAuth.js';

export default {
    name: 'LoginScreen',

    emits: ['logged-in'],

    setup(props, { emit }) {
        const { login, loadLocations } = useAuth();
        const email = Vue.ref('');
        const password = Vue.ref('');
        const error = Vue.ref('');
        const loading = Vue.ref(false);

        async function handleLogin() {
            if (!email.value || !password.value) {
                error.value = 'Veuillez entrer votre email et mot de passe';
                return;
            }
            loading.value = true;
            error.value = '';
            try {
                await login(email.value, password.value);
                await loadLocations();
                email.value = '';
                password.value = '';
                emit('logged-in');
            } catch (e) {
                error.value = e.message === 'Failed to authenticate.'
                    ? 'Email ou mot de passe incorrect'
                    : 'Erreur de connexion: ' + e.message;
            } finally {
                loading.value = false;
            }
        }

        function onKeypress(e) {
            if (e.key === 'Enter') handleLogin();
        }

        return { email, password, error, loading, handleLogin, onKeypress };
    },

    template: `
    <div class="login-screen">
        <h1>Travel Doctor App</h1>
        <h2>Connexion</h2>

        <div class="login-form">
            <div v-if="error" class="login-error">{{ error }}</div>

            <label for="loginEmail">Email</label>
            <input type="email" id="loginEmail" v-model="email"
                   placeholder="votre@email.com" autocomplete="email"
                   @keypress.enter="$refs.pw.focus()">

            <label for="loginPassword">Mot de passe</label>
            <input type="password" id="loginPassword" v-model="password" ref="pw"
                   placeholder="Mot de passe" autocomplete="current-password"
                   @keypress="onKeypress">

            <button class="login-btn" @click="handleLogin" :disabled="loading">
                {{ loading ? 'Connexion...' : 'Se connecter' }}
            </button>
        </div>
    </div>
    `
};
