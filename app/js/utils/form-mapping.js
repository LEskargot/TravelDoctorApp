/**
 * Form data mapping utilities
 * Converts patient form submission data to component structures.
 * Handles field name differences between form and app.
 */

/**
 * Detect "Prénom NOM" (last word all uppercase) and flip to "NOM Prénom"
 */
export function flipNameOrder(name) {
    if (!name) return '';
    const parts = name.trim().split(/\s+/);
    if (parts.length < 2) return name;
    const last = parts[parts.length - 1];
    // If last word is all uppercase (and at least 2 chars), assume it's the family name
    if (last.length >= 2 && last === last.toUpperCase() && /^[A-ZÀ-Ü]+$/.test(last)) {
        return last + ' ' + parts.slice(0, -1).join(' ');
    }
    return name;
}

/**
 * Map form data to patient fields
 */
export function mapFormToPatient(fd) {
    if (!fd) return {};
    const address = [fd.street, fd.postal_code, fd.city].filter(Boolean).join(', ');
    return {
        name: flipNameOrder(fd.full_name || ''),
        dob: fd.birthdate || '',
        address: address,
        email: fd.email || '',
        phone: fd.phone || '',
        avs: fd.avs || '',
        gender: fd.gender || '',
        weight: fd.weight || ''
    };
}

/**
 * Map form data to voyage structure
 */
export function mapFormToVoyage(fd) {
    if (!fd) return {};
    return {
        destinations: fd.destinations || [],
        nature: fd.travel_reason || [],
        natureAutre: fd.travel_reason_other || '',
        hebergement: fd.accommodation || [],
        hebergementAutre: fd.accommodation_other || '',
        activites: fd.activities || [],
        activitesAutre: fd.activities_other || '',
        zonesRurales: fd.rural_stay || ''
    };
}

/**
 * Map form data to medical structure
 * Handles field name differences between form and app
 */
export function mapFormToMedical(fd) {
    if (!fd) return {};

    // Build comorbidity details map
    const comorbidityDetails = {};
    const detailFields = [
        'thymus', 'rate', 'cancer', 'hematologie', 'cardiaque',
        'diabete', 'inflammatoire', 'digestive', 'rhumatologie',
        'musculaire', 'chirurgie'
    ];
    for (const key of detailFields) {
        if (fd[`comorbidity_detail_${key}`]) {
            comorbidityDetails[key] = fd[`comorbidity_detail_${key}`];
        }
    }

    // Build allergy details map
    const allergyDetails = {};
    const allergyFields = ['oeufs', 'medicaments', 'aliments', 'environnement', 'autre'];
    for (const key of allergyFields) {
        if (fd[`allergy_detail_${key}`]) {
            allergyDetails[key] = fd[`allergy_detail_${key}`];
        }
    }

    return {
        comorbidities: fd.comorbidities || [],
        comorbidityDetails: comorbidityDetails,
        comorbidityOther: fd.comorbidity_other || '',
        psychiatricDetails: fd.psychiatric_details || '',
        recentChemotherapy: fd.recent_chemotherapy || '',
        allergies: fd.allergy_types || [],
        allergyDetails: allergyDetails,
        grossesse: fd.pregnancy || '',
        contraception: fd.contraception || '',
        allaitement: fd.breastfeeding || '',
        dernieresRegles: fd.last_menses || '',
        medicaments: fd.takes_medication || '',
        medicamentsDetails: fd.medication_list || '',
        varicelleContractee: fd.chickenpox_disease || '',
        varicelleVaccine: fd.chickenpox_vaccine || '',
        problemeVaccination: fd.vaccination_problem || '',
        problemeVaccinationDetails: fd.vaccination_problem_details || '',
        dengueHistory: fd.dengue_history || '',
        cd4: fd.hiv_cd4 || '',
        cd4Date: fd.hiv_cd4_date || '',
        poids: fd.weight || ''
    };
}
