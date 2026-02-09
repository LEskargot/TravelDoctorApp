/**
 * PocketBase direct API layer
 * Used for NON-sensitive data: patient name/dob search, consultations metadata,
 * vaccine lots, locations, cases (voyage data), etc.
 */

const POCKETBASE_URL = 'https://db.traveldoctor.ch';

let pb = null;

export function initPocketBase() {
    pb = new PocketBase(POCKETBASE_URL);
    return pb;
}

export function getPb() {
    if (!pb) throw new Error('PocketBase not initialized');
    return pb;
}

// ==================== Connection ====================

export async function checkConnection() {
    try {
        await getPb().health.check();
        return true;
    } catch {
        return false;
    }
}

// ==================== Auth ====================

export function isAuthenticated() {
    return getPb().authStore.isValid;
}

export function getCurrentUser() {
    return getPb().authStore.record;
}

export async function login(email, password) {
    return await getPb().collection('users').authWithPassword(email, password);
}

export function logout() {
    getPb().authStore.clear();
}

// ==================== Locations ====================

export async function fetchLocations() {
    return await getPb().collection('locations').getFullList({ sort: 'name' });
}

// ==================== Patients (non-sensitive fields only) ====================

export async function searchPatients(query) {
    return await getPb().collection('patients').getList(1, 20, {
        filter: `nom ~ "${query}" || prenom ~ "${query}"`,
        sort: '-updated'
    });
}

export async function getPatient(id) {
    return await getPb().collection('patients').getOne(id);
}

export async function createPatient(data) {
    return await getPb().collection('patients').create(data);
}

export async function updatePatient(id, data) {
    return await getPb().collection('patients').update(id, data);
}

// ==================== Cases ====================

export async function getCasesForPatient(patientId) {
    return await getPb().collection('cases').getFullList({
        filter: `patient = "${patientId}"`,
        sort: '-opened_at'
    });
}

export async function createCase(data) {
    return await getPb().collection('cases').create(data);
}

export async function updateCase(id, data) {
    return await getPb().collection('cases').update(id, data);
}

// ==================== Consultations ====================

export async function getConsultationsForCase(caseId) {
    return await getPb().collection('consultations').getFullList({
        filter: `case = "${caseId}"`,
        sort: '-date'
    });
}

export async function getConsultationsForPatient(patientId) {
    return await getPb().collection('consultations').getFullList({
        filter: `patient = "${patientId}"`,
        sort: '-date'
    });
}

export async function createConsultation(data) {
    return await getPb().collection('consultations').create(data);
}

// ==================== Vaccines ====================

export async function getVaccineLots(locationId) {
    return await getPb().collection('vaccine_lots').getFullList({
        filter: `location = "${locationId}"`,
        sort: 'vaccine'
    });
}

export async function getVaccinesForConsultation(consultationId) {
    return await getPb().collection('vaccines_administered').getFullList({
        filter: `consultation = "${consultationId}"`
    });
}

export async function createVaccineAdministered(data) {
    return await getPb().collection('vaccines_administered').create(data);
}

// ==================== Boosters ====================

export async function getBoostersForPatient(patientId) {
    return await getPb().collection('boosters_scheduled').getFullList({
        filter: `patient = "${patientId}"`,
        sort: 'due_date'
    });
}

export async function createBooster(data) {
    return await getPb().collection('boosters_scheduled').create(data);
}
