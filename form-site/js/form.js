/**
 * Travel Doctor Patient Form - Main JavaScript
 * Handles wizard navigation, validation, file uploads, and form submission
 */

// Configuration
const API_URL = '/api';
const MAX_FILES = 10;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/heic', 'image/heif'];
const DRAFT_SAVE_INTERVAL = 30000; // 30 seconds

// State
let currentStep = 1;
const totalSteps = 6;
let currentToken = null;
let isEditMode = false;
let uploadedFiles = [];
let draftSaveTimer = null;
let formModified = false;

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', function() {
    initLanguage();
    initForm();
    initFileUpload();
    initCountryAutocomplete();
    checkUrlParams();
    startDraftAutoSave();

    // Re-render dynamic content when language changes
    document.addEventListener('languageChanged', function() {
        if (currentStep === 6) {
            generateSummary();
        }
        // Re-render success screen if visible
        const successScreen = document.querySelector('.success-screen');
        if (successScreen) {
            const email = successScreen.querySelector('strong')?.textContent || '';
            successScreen.remove();
            showSuccessScreen(email);
        }
    });
});

/**
 * Initialize form and event listeners
 */
function initForm() {
    const form = document.getElementById('patient-form');

    // Form submission
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        await submitForm();
    });

    // Track form modifications
    form.addEventListener('change', function() {
        formModified = true;
    });
    form.addEventListener('input', function() {
        formModified = true;
    });

    // Gender change handler for reproductive section
    document.querySelectorAll('input[name="gender"]').forEach(radio => {
        radio.addEventListener('change', handleGenderChange);
    });

    // AVS formatting
    initAvsField();

    // Set dynamic date max attributes (today)
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('birthdate').setAttribute('max', today);
    const lastMenses = document.getElementById('last_menses');
    if (lastMenses) lastMenses.setAttribute('max', today);
    const hivDate = document.getElementById('hiv_cd4_date');
    if (hivDate) hivDate.setAttribute('max', today);

    // Update placeholders with translations
    updatePlaceholders();

    // Real-time blur validation for key fields
    initBlurValidation();

    // Character counters on textareas
    initCharCounters();
}

/**
 * Initialize AVS field with auto-formatting
 */
function initAvsField() {
    const avsField = document.getElementById('avs');
    if (!avsField) return;

    avsField.addEventListener('input', function(e) {
        let value = e.target.value.replace(/[^\d]/g, '');

        // Auto-format: 756.XXXX.XXXX.XX
        if (value.length > 0) {
            let formatted = '';
            if (value.length >= 3) {
                formatted = value.substring(0, 3);
                if (value.length > 3) {
                    formatted += '.' + value.substring(3, 7);
                }
                if (value.length > 7) {
                    formatted += '.' + value.substring(7, 11);
                }
                if (value.length > 11) {
                    formatted += '.' + value.substring(11, 13);
                }
            } else {
                formatted = value;
            }
            e.target.value = formatted;
        }
    });

    // Validate on blur
    avsField.addEventListener('blur', function(e) {
        const value = e.target.value;
        if (value && !/^756\.\d{4}\.\d{4}\.\d{2}$/.test(value)) {
            e.target.setCustomValidity('Format AVS invalide (756.XXXX.XXXX.XX)');
        } else {
            e.target.setCustomValidity('');
        }
    });
}

/**
 * Check URL parameters for edit mode
 */
function checkUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const editToken = urlParams.get('edit');

    if (editToken) {
        loadDraft(editToken);
    }
}

/**
 * Navigation Functions
 */
function goToStep(step) {
    if (step < 1 || step > totalSteps) return;

    // Save draft when navigating
    if (formModified) {
        saveDraft();
    }

    // Update step visibility
    document.querySelectorAll('.form-step').forEach(s => s.classList.remove('active'));
    document.querySelector(`.form-step[data-step="${step}"]`).classList.add('active');

    // Update progress indicator
    document.querySelectorAll('.progress-steps .step').forEach(s => {
        const stepNum = parseInt(s.dataset.step);
        s.classList.remove('active', 'completed');
        if (stepNum === step) {
            s.classList.add('active');
        } else if (stepNum < step) {
            s.classList.add('completed');
        }
    });

    // Update navigation buttons
    updateNavigationButtons(step);

    // Generate summary if going to step 6
    if (step === 6) {
        generateSummary();
    }

    currentStep = step;

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function nextStep() {
    if (validateCurrentStep()) {
        goToStep(currentStep + 1);
    } else {
        scrollToFirstError();
    }
}

function scrollToFirstError() {
    const firstError = document.querySelector('.form-step.active .has-error');
    if (firstError) {
        firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const input = firstError.querySelector('input, select, textarea');
        if (input) input.focus();
    }
}

function previousStep() {
    goToStep(currentStep - 1);
}

function updateNavigationButtons(step) {
    const btnPrevious = document.getElementById('btn-previous');
    const btnNext = document.getElementById('btn-next');
    const btnSubmit = document.getElementById('btn-submit');

    btnPrevious.style.display = step > 1 ? 'inline-flex' : 'none';
    btnNext.style.display = step < totalSteps ? 'inline-flex' : 'none';
    btnSubmit.style.display = step === totalSteps ? 'inline-flex' : 'none';
}

/**
 * Validation Functions
 */
function validateCurrentStep() {
    clearErrors();
    let isValid = true;
    const step = document.querySelector(`.form-step[data-step="${currentStep}"]`);

    switch (currentStep) {
        case 1:
            isValid = validateIdentity(step);
            break;
        case 2:
            isValid = validateTravel(step);
            break;
        case 3:
            isValid = validateHealth(step);
            break;
        case 4:
            isValid = validateVaccination(step);
            break;
        case 5:
            // Referral step is optional
            isValid = true;
            break;
        case 6:
            isValid = validateSummary(step);
            break;
    }

    return isValid;
}

function validateIdentity(step) {
    let isValid = true;

    // Full name
    const fullName = step.querySelector('#full_name');
    if (!fullName.value.trim() || fullName.value.trim().length < 2) {
        showError(fullName, t('errors.required'));
        isValid = false;
    }

    // Birthdate
    const birthdate = step.querySelector('#birthdate');
    if (!birthdate.value) {
        showError(birthdate, t('errors.required'));
        isValid = false;
    } else if (new Date(birthdate.value) > new Date()) {
        showError(birthdate, t('errors.invalid_date'));
        isValid = false;
    } else if (new Date(birthdate.value) < new Date('1900-01-01')) {
        showError(birthdate, t('errors.invalid_date'));
        isValid = false;
    }

    // Email
    const email = step.querySelector('#email');
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.value.trim()) {
        showError(email, t('errors.required'));
        isValid = false;
    } else if (!emailRegex.test(email.value)) {
        showError(email, t('errors.invalid_email'));
        isValid = false;
    }

    // Gender
    const gender = step.querySelector('input[name="gender"]:checked');
    if (!gender) {
        showError(step.querySelector('.radio-group'), t('errors.required'));
        isValid = false;
    }

    return isValid;
}

function validateTravel(step) {
    let isValid = true;
    const isFlexible = document.getElementById('flexible-dates').checked;

    // Trip dates (always required)
    const tripDeparture = step.querySelector('#trip-departure');
    const tripReturn = step.querySelector('#trip-return');

    if (!tripDeparture.value || !tripReturn.value) {
        showError(tripDeparture.closest('.form-group'), t('errors.trip_dates_required'));
        isValid = false;
    } else if (new Date(tripDeparture.value) > new Date(tripReturn.value)) {
        showError(tripDeparture.closest('.form-group'), t('errors.trip_departure_before_return'));
        isValid = false;
    }

    // Destinations - country alone is sufficient
    const destinations = step.querySelectorAll('.destination-row');
    let hasValidDestination = false;

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    destinations.forEach(row => {
        const country = row.querySelector('.destination-country').value;

        if (country) {
            hasValidDestination = true;

            // Per-country date validation only when NOT in flexible mode
            if (!isFlexible) {
                const departure = row.querySelector('.destination-departure').value;
                const returnDate = row.querySelector('.destination-return').value;

                if (departure && returnDate) {
                    if (new Date(departure) > new Date(returnDate)) {
                        showError(row.querySelector('.destination-departure'), t('errors.departure_after_return'));
                        isValid = false;
                    } else {
                        // Soft warning: departure in the past
                        if (new Date(departure) < now) {
                            showWarning(row.querySelector('.destination-departure'), t('warnings.date_in_past'));
                        }

                        // Soft warning: trip longer than 2 years
                        const durationDays = (new Date(returnDate) - new Date(departure)) / (1000 * 60 * 60 * 24);
                        if (durationDays > 730) {
                            showWarning(row.querySelector('.destination-return'), t('warnings.long_duration'));
                        }
                    }
                }
            }
        }
    });

    if (!hasValidDestination) {
        showError(step.querySelector('#destinations-container'), t('errors.min_destination'));
        isValid = false;
    }

    // Travel reason
    const reasons = step.querySelectorAll('input[name="travel_reason"]:checked');
    if (reasons.length === 0) {
        showError(step.querySelector('input[name="travel_reason"]').closest('.form-group'), t('errors.required'));
        isValid = false;
    } else {
        const autreReason = step.querySelector('input[name="travel_reason"][value="autre"]');
        if (autreReason && autreReason.checked) {
            const otherText = step.querySelector('#travel_reason_other');
            if (!otherText.value.trim()) {
                showError(otherText, t('errors.other_required'));
                isValid = false;
            }
        }
    }

    // Accommodation
    const accommodations = step.querySelectorAll('input[name="accommodation"]:checked');
    if (accommodations.length === 0) {
        showError(step.querySelector('input[name="accommodation"]').closest('.form-group'), t('errors.required'));
        isValid = false;
    } else {
        const autreAccom = step.querySelector('input[name="accommodation"][value="autre"]');
        if (autreAccom && autreAccom.checked) {
            const otherText = step.querySelector('#accommodation_other');
            if (!otherText.value.trim()) {
                showError(otherText, t('errors.other_required'));
                isValid = false;
            }
        }
    }

    // Activities
    const activities = step.querySelectorAll('input[name="activities"]:checked');
    if (activities.length === 0) {
        showError(step.querySelector('input[name="activities"]').closest('.form-group'), t('errors.required'));
        isValid = false;
    } else {
        const autreActivity = step.querySelector('input[name="activities"][value="autre"]');
        if (autreActivity && autreActivity.checked) {
            const otherText = step.querySelector('#activities_other');
            if (!otherText.value.trim()) {
                showError(otherText, t('errors.other_required'));
                isValid = false;
            }
        }
    }

    // Rural stay
    const ruralStay = step.querySelector('input[name="rural_stay"]:checked');
    if (!ruralStay) {
        showError(step.querySelector('input[name="rural_stay"]').closest('.form-group'), t('errors.required'));
        isValid = false;
    }

    return isValid;
}

function validateHealth(step) {
    let isValid = true;

    // Weight
    const weight = step.querySelector('#weight');
    const w = parseFloat(weight.value);
    if (!weight.value || isNaN(w) || w < 2 || w > 400) {
        showError(weight, t('errors.weight_range'));
        isValid = false;
    }

    // Last menses - not in future (only when visible)
    const lastMenses = step.querySelector('#last_menses');
    if (lastMenses && lastMenses.value && !lastMenses.closest('.hidden')) {
        if (new Date(lastMenses.value) > new Date()) {
            showError(lastMenses.closest('.form-group') || lastMenses, t('errors.date_not_future'));
            isValid = false;
        }
    }

    // HIV CD4 date - not in future (only when visible)
    const hivDateField = step.querySelector('#hiv_cd4_date');
    if (hivDateField && hivDateField.value && !hivDateField.closest('.hidden')) {
        if (new Date(hivDateField.value) > new Date()) {
            showInlineError(hivDateField, t('errors.date_not_future'));
            isValid = false;
        }
    }

    // HIV CD4 range (only when visible)
    const hivCd4 = step.querySelector('#hiv_cd4');
    if (hivCd4 && hivCd4.value && !hivCd4.closest('.hidden')) {
        const cd4 = parseInt(hivCd4.value);
        if (cd4 < 0 || cd4 > 5000) {
            showInlineError(hivCd4, t('errors.cd4_range'));
            isValid = false;
        }
    }

    // Allergies - at least one checkbox must be selected
    const allergyChecked = step.querySelectorAll('input[name="allergy_types"]:checked');
    if (allergyChecked.length === 0) {
        showError(step.querySelector('input[name="allergy_types"]').closest('.form-group'), t('errors.required'));
        isValid = false;
    } else {
        // Validate detail fields for each checked allergy type (except "aucune")
        const allergyTypes = ['oeufs', 'medicaments', 'aliments', 'environnement', 'autre'];
        allergyTypes.forEach(type => {
            const cb = step.querySelector(`input[name="allergy_types"][value="${type}"]`);
            if (cb && cb.checked) {
                const textarea = step.querySelector(`textarea[name="allergy_detail_${type}"]`);
                if (textarea && !textarea.value.trim()) {
                    showError(textarea.closest('.form-group'), t('errors.required'));
                    isValid = false;
                }
            }
        });
    }

    // Dengue
    const dengue = step.querySelector('input[name="dengue_history"]:checked');
    if (!dengue) {
        showError(step.querySelector('input[name="dengue_history"]').closest('.form-group'), t('errors.required'));
        isValid = false;
    }

    // Chickenpox disease
    const chickenpoxDisease = step.querySelector('input[name="chickenpox_disease"]:checked');
    if (!chickenpoxDisease) {
        showError(step.querySelector('input[name="chickenpox_disease"]').closest('.form-group'), t('errors.required'));
        isValid = false;
    }

    // Chickenpox vaccine
    const chickenpoxVaccine = step.querySelector('input[name="chickenpox_vaccine"]:checked');
    if (!chickenpoxVaccine) {
        showError(step.querySelector('input[name="chickenpox_vaccine"]').closest('.form-group'), t('errors.required'));
        isValid = false;
    }

    // Vaccination problem
    const vaccinationProblem = step.querySelector('input[name="vaccination_problem"]:checked');
    if (!vaccinationProblem) {
        showError(step.querySelector('input[name="vaccination_problem"]').closest('.form-group'), t('errors.required'));
        isValid = false;
    } else if (vaccinationProblem.value === 'oui') {
        const details = step.querySelector('#vaccination_problem_details');
        if (!details.value.trim()) {
            showError(details, t('errors.required'));
            isValid = false;
        }
    }

    // Comorbidities
    const comorbidities = step.querySelectorAll('input[name="comorbidities"]:checked');
    if (comorbidities.length === 0) {
        showError(step.querySelector('input[name="comorbidities"]').closest('.form-group'), t('errors.required'));
        isValid = false;
    }

    // Medications
    const takesMedication = step.querySelector('input[name="takes_medication"]:checked');
    if (!takesMedication) {
        showError(step.querySelector('input[name="takes_medication"]').closest('.form-group'), t('errors.required'));
        isValid = false;
    } else if (takesMedication.value === 'oui') {
        const medicationList = step.querySelector('#medication_list');
        if (!medicationList.value.trim()) {
            showError(medicationList, t('errors.required'));
            isValid = false;
        }
    }

    return isValid;
}

function validateVaccination(step) {
    const noCard = step.querySelector('#no_vaccination_card').checked;

    if (!noCard && uploadedFiles.length === 0) {
        showError(step.querySelector('.file-dropzone'), t('errors.vaccination_required'));
        return false;
    }

    return true;
}

function validateSummary(step) {
    const consent = step.querySelector('#consent');

    if (!consent.checked) {
        showError(consent.closest('.form-group'), t('errors.consent_required'));
        return false;
    }

    return true;
}

function showError(element, message) {
    const formGroup = element.closest('.form-group') || element;
    formGroup.classList.add('has-error');
    const errorSpan = formGroup.querySelector('.error-message');
    if (errorSpan) {
        errorSpan.textContent = message;
    }
}

function showInlineError(element, message) {
    const container = element.closest('.inline-field') || element;
    container.classList.add('has-error');
    let errorSpan = container.querySelector('.error-message');
    if (!errorSpan) {
        errorSpan = document.createElement('span');
        errorSpan.className = 'error-message';
        errorSpan.style.display = 'block';
        container.appendChild(errorSpan);
    }
    errorSpan.textContent = message;
    errorSpan.style.display = 'block';
}

function showWarning(element, message) {
    const formGroup = element.closest('.form-group') || element.closest('.destination-row') || element;
    formGroup.classList.add('has-warning');
    let warningSpan = formGroup.querySelector('.warning-message');
    if (!warningSpan) {
        warningSpan = document.createElement('span');
        warningSpan.className = 'warning-message';
        formGroup.appendChild(warningSpan);
    }
    warningSpan.textContent = message;
}

function clearErrors() {
    document.querySelectorAll('.has-error').forEach(el => {
        el.classList.remove('has-error');
    });
    document.querySelectorAll('.form-group .error-message').forEach(el => {
        el.textContent = '';
    });
    // Remove dynamically-created error messages in inline fields
    document.querySelectorAll('.inline-field .error-message').forEach(el => {
        el.remove();
    });
    document.querySelectorAll('.has-warning').forEach(el => {
        el.classList.remove('has-warning');
    });
    document.querySelectorAll('.warning-message').forEach(el => {
        el.remove();
    });
}

/**
 * Conditional Field Toggles
 */
function handleGenderChange(e) {
    const gender = e.target.value;
    const reproSection = document.getElementById('reproductive-section');
    const showReproQuestion = document.getElementById('show-reproductive-question');
    const reproQuestions = document.getElementById('reproductive-questions');

    if (gender === 'homme') {
        reproSection.classList.add('hidden');
    } else if (gender === 'femme') {
        reproSection.classList.remove('hidden');
        showReproQuestion.classList.add('hidden');
        reproQuestions.classList.remove('hidden');
    } else {
        // Non-binary or other
        reproSection.classList.remove('hidden');
        showReproQuestion.classList.remove('hidden');
        reproQuestions.classList.add('hidden');
    }
}

function toggleReproductiveQuestions() {
    const showRepro = document.querySelector('input[name="show_reproductive"]:checked');
    const reproQuestions = document.getElementById('reproductive-questions');

    if (showRepro && showRepro.value === 'oui') {
        reproQuestions.classList.remove('hidden');
    } else {
        reproQuestions.classList.add('hidden');
    }
}

function handleAllergyChange(isNone) {
    const checkboxes = document.querySelectorAll('input[name="allergy_types"]');
    const allergyTypes = ['oeufs', 'medicaments', 'aliments', 'environnement', 'autre'];

    if (isNone) {
        // "Aucune allergie" clicked - uncheck all others
        const noneCheckbox = document.querySelector('input[name="allergy_types"][value="aucune"]');
        if (noneCheckbox.checked) {
            checkboxes.forEach(cb => {
                if (cb.value !== 'aucune') cb.checked = false;
            });
        }
    } else {
        // Any allergy option clicked - uncheck "aucune"
        const noneCheckbox = document.querySelector('input[name="allergy_types"][value="aucune"]');
        if (noneCheckbox) noneCheckbox.checked = false;
    }

    // Show/hide detail textboxes for each checked allergy type
    allergyTypes.forEach(type => {
        const detailDiv = document.getElementById('allergy-detail-' + type);
        const checkbox = document.querySelector(`input[name="allergy_types"][value="${type}"]`);
        if (detailDiv) {
            if (checkbox && checkbox.checked) {
                detailDiv.classList.remove('hidden');
            } else {
                detailDiv.classList.add('hidden');
            }
        }
    });
}

function toggleVaccinationProblem() {
    const hasProblem = document.querySelector('input[name="vaccination_problem"]:checked');
    const problemDetails = document.getElementById('vaccination-problem-details');

    if (hasProblem && hasProblem.value === 'oui') {
        problemDetails.classList.remove('hidden');
    } else {
        problemDetails.classList.add('hidden');
    }
}

function toggleMedicationField() {
    const takesMedication = document.querySelector('input[name="takes_medication"]:checked');
    const medicationDetails = document.getElementById('medication-details');

    if (takesMedication && takesMedication.value === 'oui') {
        medicationDetails.classList.remove('hidden');
    } else {
        medicationDetails.classList.add('hidden');
    }
}

function toggleComorbidityDetail(checkbox) {
    const value = checkbox.value;
    const detailField = document.getElementById('comorbidity-detail-' + value);
    if (detailField) {
        if (checkbox.checked) {
            detailField.classList.remove('hidden');
        } else {
            detailField.classList.add('hidden');
        }
    }
    if (checkbox.checked) {
        uncheckNoneComorbidity();
    }
}

function toggleNoneComorbidity(checkbox) {
    if (checkbox.checked) {
        // Uncheck all other comorbidities
        document.querySelectorAll('input[name="comorbidities"]').forEach(cb => {
            if (cb !== checkbox) {
                cb.checked = false;
            }
        });
        // Hide all conditional fields
        document.getElementById('hiv-cd4-field').classList.add('hidden');
        document.getElementById('psychiatric-details-field').classList.add('hidden');
        document.getElementById('comorbidity-other-field').classList.add('hidden');
        document.getElementById('chemotherapy-question').classList.add('hidden');
        // Hide all comorbidity detail fields
        document.querySelectorAll('[id^="comorbidity-detail-"]').forEach(el => {
            el.classList.add('hidden');
        });
    }
}

function toggleNoneActivity(checkbox) {
    if (checkbox.checked) {
        // Uncheck all other activities
        document.querySelectorAll('input[name="activities"]').forEach(cb => {
            if (cb !== checkbox) {
                cb.checked = false;
            }
        });
        // Hide "other" field if visible
        const otherField = document.getElementById('activities_other');
        if (otherField) {
            otherField.classList.add('hidden');
        }
    }
}

function uncheckNoneActivity() {
    const noneCheckbox = document.querySelector('input[name="activities"][value="aucune"]');
    if (noneCheckbox) {
        noneCheckbox.checked = false;
    }
}

function toggleHivField(checkbox) {
    const hivField = document.getElementById('hiv-cd4-field');
    if (checkbox.checked) {
        hivField.classList.remove('hidden');
        uncheckNoneComorbidity();
    } else {
        hivField.classList.add('hidden');
    }
}

function togglePsychiatricField(checkbox) {
    const field = document.getElementById('psychiatric-details-field');
    if (checkbox.checked) {
        field.classList.remove('hidden');
        uncheckNoneComorbidity();
    } else {
        field.classList.add('hidden');
    }
}

function toggleOtherComorbidity(checkbox) {
    const field = document.getElementById('comorbidity-other-field');
    if (checkbox.checked) {
        field.classList.remove('hidden');
        uncheckNoneComorbidity();
    } else {
        field.classList.add('hidden');
    }
}

function toggleChemoQuestion() {
    const triggers = ['cancer', 'hematologie', 'rhumatologie', 'thymus'];
    const hasAny = triggers.some(val => {
        const cb = document.querySelector(`input[name="comorbidities"][value="${val}"]`);
        return cb && cb.checked;
    });

    const chemoQuestion = document.getElementById('chemotherapy-question');
    if (hasAny) {
        chemoQuestion.classList.remove('hidden');
        uncheckNoneComorbidity();
    } else {
        chemoQuestion.classList.add('hidden');
    }
}

function uncheckNoneComorbidity() {
    const noneCheckbox = document.querySelector('input[name="comorbidities"][value="aucune"]');
    if (noneCheckbox) {
        noneCheckbox.checked = false;
    }
}

function toggleOtherField(checkbox, fieldId) {
    const field = document.getElementById(fieldId);
    if (checkbox.checked) {
        field.classList.remove('hidden');
        field.setAttribute('required', '');
        // Add asterisk to placeholder if not already present
        const placeholder = field.getAttribute('placeholder') || field.dataset.placeholder && t(field.dataset.placeholder) || '';
        if (placeholder && !placeholder.endsWith(' *')) {
            field.placeholder = placeholder + ' *';
        }
    } else {
        field.classList.add('hidden');
        field.value = '';
        field.removeAttribute('required');
        // Remove asterisk from placeholder
        if (field.placeholder && field.placeholder.endsWith(' *')) {
            field.placeholder = field.placeholder.slice(0, -2);
        }
    }
}

function toggleReferralDetail(checkbox, fieldId) {
    const field = document.getElementById(fieldId);
    if (checkbox.checked) {
        field.classList.remove('hidden');
    } else {
        field.classList.add('hidden');
    }
}

function toggleNoVaccinationCard() {
    const noCard = document.getElementById('no_vaccination_card').checked;
    const dropzone = document.getElementById('file-dropzone');

    if (noCard) {
        dropzone.classList.add('disabled');
    } else {
        dropzone.classList.remove('disabled');
    }
}

/**
 * Flexible Dates Toggle
 */
function toggleFlexibleDates() {
    const isFlexible = document.getElementById('flexible-dates').checked;
    const container = document.getElementById('destinations-container');

    if (isFlexible) {
        container.classList.add('flexible-mode');
    } else {
        container.classList.remove('flexible-mode');
    }
}

/**
 * Destination Management
 */
let destinationIndex = 1;

function addDestination() {
    const container = document.getElementById('destinations-container');
    const newRow = document.createElement('div');
    newRow.className = 'destination-row';
    newRow.dataset.index = destinationIndex;

    // Build duration options from translations
    const durationKeys = ['few_days', 'less_1_week', '1_2_weeks', '2_3_weeks', '1_month', '1_2_months', '2_3_months', '3_6_months', 'over_6_months'];
    const durationOptionsHtml = durationKeys.map(key =>
        `<option value="${key}">${t('travel.duration_options.' + key)}</option>`
    ).join('');

    newRow.innerHTML = `
        <div class="destination-fields">
            <div class="country-autocomplete destination-country-wrapper">
                <input type="text" class="destination-country-search"
                       data-placeholder="travel.country_placeholder"
                       autocomplete="off"
                       placeholder="${t('travel.country_placeholder')}">
                <input type="hidden" class="destination-country" name="destinations[${destinationIndex}][country]">
                <div class="autocomplete-dropdown"></div>
            </div>
            <div class="date-field-wrapper destination-dates">
                <label class="mobile-label">${t('travel.departure')}</label>
                <input type="date" class="destination-departure" name="destinations[${destinationIndex}][departure]"
                       aria-label="${t('travel.departure')}">
            </div>
            <div class="date-field-wrapper destination-dates">
                <label class="mobile-label">${t('travel.return')}</label>
                <input type="date" class="destination-return" name="destinations[${destinationIndex}][return]"
                       aria-label="${t('travel.return')}">
            </div>
            <div class="destination-duration">
                <label class="mobile-label">${t('travel.estimated_duration')}</label>
                <select class="destination-estimated-duration" name="destinations[${destinationIndex}][estimated_duration]">
                    <option value="">--</option>
                    ${durationOptionsHtml}
                </select>
            </div>
            <button type="button" class="btn-remove-destination" onclick="removeDestination(this)">
                &times;
            </button>
        </div>
    `;

    container.appendChild(newRow);

    // Initialize autocomplete for new row
    initCountryAutocompleteForElement(newRow.querySelector('.destination-country-search'));

    // Show remove buttons if more than one destination
    updateRemoveButtons();

    destinationIndex++;
}

function removeDestination(button) {
    const row = button.closest('.destination-row');
    row.remove();
    updateRemoveButtons();
}

function updateRemoveButtons() {
    const rows = document.querySelectorAll('.destination-row');
    rows.forEach((row, index) => {
        const btn = row.querySelector('.btn-remove-destination');
        if (btn) {
            btn.style.display = rows.length > 1 ? 'inline-flex' : 'none';
        }
    });
}

/**
 * Country Autocomplete
 */
function initCountryAutocomplete() {
    // Residence country
    const residenceInput = document.getElementById('residence_country_search');
    if (residenceInput) {
        initCountryAutocompleteForElement(residenceInput);
    }

    // Destination countries
    document.querySelectorAll('.destination-country-search').forEach(input => {
        initCountryAutocompleteForElement(input);
    });
}

function initCountryAutocompleteForElement(input) {
    const wrapper = input.closest('.country-autocomplete');
    const dropdown = wrapper.querySelector('.autocomplete-dropdown');
    const hiddenInput = wrapper.querySelector('input[type="hidden"]');

    input.addEventListener('input', function() {
        const query = this.value.trim();

        if (query.length < 2) {
            dropdown.innerHTML = '';
            dropdown.classList.remove('active');
            return;
        }

        const results = searchCountries(query, currentLang, 10);

        if (results.length > 0) {
            dropdown.innerHTML = results.map(country => `
                <div class="autocomplete-item" data-code="${country.code}">
                    ${getCountryName(country.code, currentLang)}
                </div>
            `).join('');
            dropdown.classList.add('active');

            // Add click handlers
            dropdown.querySelectorAll('.autocomplete-item').forEach(item => {
                item.addEventListener('click', function() {
                    const code = this.dataset.code;
                    input.value = getCountryName(code, currentLang);
                    hiddenInput.value = code;
                    dropdown.classList.remove('active');
                });
            });
        } else {
            dropdown.innerHTML = `<div class="autocomplete-no-results">${t('messages.no_results')}</div>`;
            dropdown.classList.add('active');
        }
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', function(e) {
        if (!wrapper.contains(e.target)) {
            dropdown.classList.remove('active');
        }
    });

    // Keyboard navigation
    input.addEventListener('keydown', function(e) {
        const items = dropdown.querySelectorAll('.autocomplete-item');
        const active = dropdown.querySelector('.autocomplete-item.active');

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (!active && items.length > 0) {
                items[0].classList.add('active');
            } else if (active && active.nextElementSibling) {
                active.classList.remove('active');
                active.nextElementSibling.classList.add('active');
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (active && active.previousElementSibling) {
                active.classList.remove('active');
                active.previousElementSibling.classList.add('active');
            }
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (active) {
                active.click();
            }
        } else if (e.key === 'Escape') {
            dropdown.classList.remove('active');
        }
    });
}

/**
 * File Upload
 */
function initFileUpload() {
    const dropzone = document.getElementById('file-dropzone');
    const fileInput = document.getElementById('vaccination_files');

    // Click to upload
    dropzone.addEventListener('click', function() {
        if (!dropzone.classList.contains('disabled')) {
            fileInput.click();
        }
    });

    // Drag and drop
    dropzone.addEventListener('dragover', function(e) {
        e.preventDefault();
        if (!dropzone.classList.contains('disabled')) {
            dropzone.classList.add('dragover');
        }
    });

    dropzone.addEventListener('dragleave', function() {
        dropzone.classList.remove('dragover');
    });

    dropzone.addEventListener('drop', function(e) {
        e.preventDefault();
        dropzone.classList.remove('dragover');

        if (!dropzone.classList.contains('disabled')) {
            handleFiles(e.dataTransfer.files);
        }
    });

    // File input change
    fileInput.addEventListener('change', function() {
        handleFiles(this.files);
        this.value = ''; // Reset input
    });
}

function handleFiles(files) {
    const fileList = document.getElementById('file-list');

    for (let file of files) {
        // Check max files
        if (uploadedFiles.length >= MAX_FILES) {
            alert(t('errors.too_many_files'));
            break;
        }

        // Check file size
        if (file.size > MAX_FILE_SIZE) {
            alert(t('errors.file_too_large').replace('{name}', file.name));
            continue;
        }

        // Check file type
        if (!ALLOWED_FILE_TYPES.includes(file.type) &&
            !file.name.toLowerCase().endsWith('.heic') &&
            !file.name.toLowerCase().endsWith('.heif')) {
            alert(t('errors.invalid_file_type').replace('{name}', file.name));
            continue;
        }

        // Add to list
        uploadedFiles.push(file);

        // Create file item
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        fileItem.dataset.index = uploadedFiles.length - 1;

        const icon = file.type === 'application/pdf' ? '&#128196;' : '&#128247;';
        const size = (file.size / 1024 / 1024).toFixed(1);

        fileItem.innerHTML = `
            <span class="file-icon">${icon}</span>
            <span class="file-name">${file.name}</span>
            <span class="file-size">(${size} MB)</span>
            <button type="button" class="file-remove" onclick="removeFile(${uploadedFiles.length - 1})">&times;</button>
        `;

        fileList.appendChild(fileItem);
    }

    updateFileCount();
}

function removeFile(index) {
    uploadedFiles.splice(index, 1);

    // Rebuild file list
    const fileList = document.getElementById('file-list');
    fileList.innerHTML = '';

    uploadedFiles.forEach((file, i) => {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        fileItem.dataset.index = i;

        const icon = file.type === 'application/pdf' ? '&#128196;' : '&#128247;';
        const size = (file.size / 1024 / 1024).toFixed(1);

        fileItem.innerHTML = `
            <span class="file-icon">${icon}</span>
            <span class="file-name">${file.name}</span>
            <span class="file-size">(${size} MB)</span>
            <button type="button" class="file-remove" onclick="removeFile(${i})">&times;</button>
        `;

        fileList.appendChild(fileItem);
    });

    updateFileCount();
}

function updateFileCount() {
    const dropzone = document.getElementById('file-dropzone');
    let countElement = dropzone.querySelector('.file-count');

    if (!countElement) {
        countElement = document.createElement('div');
        countElement.className = 'file-count';
        dropzone.appendChild(countElement);
    }

    if (uploadedFiles.length > 0) {
        countElement.textContent = `${t('vaccination.files_added')}: ${uploadedFiles.length}/${MAX_FILES}`;
        countElement.style.display = 'block';
    } else {
        countElement.style.display = 'none';
    }
}

/**
 * Summary Generation
 */
function generateSummary() {
    generateIdentitySummary();
    generateTravelSummary();
    generateHealthSummary();
    generateVaccinationSummary();
    generateReferralSummary();
}

function generateIdentitySummary() {
    const container = document.getElementById('summary-identity');
    const data = collectFormData();

    let html = `<p><strong>${t('identity.full_name')}:</strong> ${data.full_name || '-'}</p>`;
    html += `<p><strong>${t('identity.birthdate')}:</strong> ${formatDate(data.birthdate) || '-'}</p>`;
    html += `<p><strong>${t('identity.email')}:</strong> ${data.email || '-'}</p>`;

    if (data.phone) {
        html += `<p><strong>${t('identity.phone')}:</strong> ${data.phone}</p>`;
    }

    if (data.avs) {
        html += `<p><strong>${t('identity.avs')}:</strong> ${data.avs}</p>`;
    }

    if (data.street || data.city) {
        const address = [data.street, data.postal_code, data.city].filter(Boolean).join(', ');
        html += `<p><strong>${t('summary.address')}:</strong> ${address}</p>`;
    }

    if (data.residence_country) {
        html += `<p><strong>${t('identity.country')}:</strong> ${getCountryName(data.residence_country, currentLang)}</p>`;
    }

    // Map gender values to translation keys
    const genderKeyMap = {
        'femme': 'female',
        'homme': 'male',
        'non_binaire': 'nonbinary',
        'autre': 'other'
    };
    const genderKey = genderKeyMap[data.gender] || data.gender;
    html += `<p><strong>${t('identity.gender')}:</strong> ${t('identity.gender_' + genderKey) || data.gender}</p>`;

    container.innerHTML = html;
}

function generateTravelSummary() {
    const container = document.getElementById('summary-travel');
    const data = collectFormData();

    let html = '';

    // Trip dates
    if (data.trip_departure || data.trip_return) {
        html += `<p><strong>${t('travel.trip_dates')}:</strong> ${formatDate(data.trip_departure)} - ${formatDate(data.trip_return)}</p>`;
    }

    html += `<p><strong>${t('travel.destinations')}:</strong></p><ul>`;

    if (data.destinations && data.destinations.length > 0) {
        data.destinations.forEach(dest => {
            if (dest.country) {
                let line = getCountryName(dest.country, currentLang);
                if (data.flexible_dates && dest.estimated_duration) {
                    const durationLabel = t('travel.duration_options.' + dest.estimated_duration) || dest.estimated_duration;
                    line += ` (~${durationLabel})`;
                } else if (dest.departure || dest.return) {
                    line += `: ${formatDate(dest.departure)} - ${formatDate(dest.return)}`;
                }
                html += `<li>${line}</li>`;
            }
        });
    }
    html += '</ul>';

    if (data.travel_reason && data.travel_reason.length > 0) {
        const reasonKeyMap = {
            'tourisme_organise': 'organized',
            'tourisme_independant': 'independent',
            'affaires': 'business',
            'aventure': 'adventure',
            'visite_famille': 'family',
            'humanitaire': 'humanitarian',
            'pelerinage': 'pilgrimage',
            'expatriation': 'expatriation',
            'autre': 'other'
        };
        const reasons = data.travel_reason.map(r => {
            const key = reasonKeyMap[r] || r;
            return t('travel.reason_' + key) || r;
        }).join(', ');
        html += `<p><strong>${t('travel.reason')}:</strong> ${reasons}</p>`;
    }

    if (data.accommodation && data.accommodation.length > 0) {
        const accommodationKeyMap = {
            'pas_decide': 'undecided',
            'habitant': 'local',
            'hotel': 'hotel',
            'autre': 'other'
        };
        const accommodations = data.accommodation.map(a => {
            const key = accommodationKeyMap[a] || a;
            return t('travel.accommodation_' + key) || a;
        }).join(', ');
        html += `<p><strong>${t('travel.accommodation')}:</strong> ${accommodations}</p>`;
    }

    if (data.activities && data.activities.length > 0) {
        // Map checkbox values to translation keys
        const activityKeyMap = {
            'alpinisme': 'mountaineering',
            'randonnee': 'hiking',
            'plongee': 'diving',
            'rafting': 'rafting',
            'velo': 'cycling',
            'snorkeling': 'snorkeling',
            'autre': 'other',
            'aucune': 'none'
        };
        const activities = data.activities.map(a => {
            const key = activityKeyMap[a] || a;
            return t('travel.activity_' + key) || a;
        }).join(', ');
        html += `<p><strong>${t('travel.activities')}:</strong> ${activities}</p>`;
    }

    html += `<p><strong>${t('travel.rural')}:</strong> ${data.rural_stay === 'oui' ? t('buttons.yes') : t('buttons.no')}</p>`;

    container.innerHTML = html;
}

function generateHealthSummary() {
    const container = document.getElementById('summary-health');
    const data = collectFormData();

    let html = `<p><strong>${t('health.weight')}:</strong> ${data.weight} kg</p>`;

    // Allergies
    html += `<p><strong>${t('health.allergies_title')}:</strong> `;
    if (data.allergy_types && data.allergy_types.includes('aucune')) {
        html += t('health.allergy_none');
    } else if (data.allergy_types && data.allergy_types.length > 0) {
        const allergyLabels = {
            oeufs: t('health.allergy_eggs'),
            medicaments: t('health.allergy_medication'),
            aliments: t('health.allergy_food'),
            environnement: t('health.allergy_environment'),
            autre: t('health.allergy_other')
        };
        const details = data.allergy_types.map(type => {
            const label = allergyLabels[type] || type;
            const detail = data['allergy_detail_' + type];
            return detail ? `${label} (${detail})` : label;
        });
        html += details.join(', ');
    } else {
        html += '-';
    }
    html += '</p>';

    // Diseases
    const yesNoDk = (val) => val === 'oui' ? t('buttons.yes') : val === 'ne_sais_pas' ? t('buttons.dont_know') : t('buttons.no');
    html += `<p><strong>${t('health.dengue')}:</strong> ${yesNoDk(data.dengue_history)}</p>`;
    html += `<p><strong>${t('health.chickenpox_disease')}:</strong> ${yesNoDk(data.chickenpox_disease)}</p>`;
    html += `<p><strong>${t('health.chickenpox_vaccine')}:</strong> ${yesNoDk(data.chickenpox_vaccine)}</p>`;

    // Comorbidities
    if (data.comorbidities && data.comorbidities.length > 0) {
        if (data.comorbidities.includes('aucune')) {
            html += `<p><strong>${t('health.comorbidities_title')}:</strong> ${t('health.comorbidity_none')}</p>`;
        } else {
            // Map checkbox values to translation keys
            const comorbidityKeyMap = {
                'vih': 'hiv',
                'thymus': 'thymus',
                'rate': 'spleen',
                'cancer': 'cancer',
                'hematologie': 'hematologic',
                'hypertension': 'hypertension',
                'cardiaque': 'heart',
                'diabete': 'diabetes',
                'asthme': 'asthma',
                'inflammatoire': 'inflammatory',
                'digestive': 'digestive',
                'rhumatologie': 'rheumatic',
                'epilepsie': 'epilepsy',
                'musculaire': 'muscular',
                'psychiatrique': 'psychiatric',
                'chirurgie': 'surgery',
                'autre': 'other'
            };
            const comorbidities = data.comorbidities.map(c => {
                const key = comorbidityKeyMap[c] || c;
                const label = t('health.comorbidity_' + key) || c;
                const detail = data['comorbidity_detail_' + c] || data[c === 'psychiatrique' ? 'psychiatric_details' : ''] || '';
                return detail ? `${label} (${detail})` : label;
            }).join(', ');
            html += `<p><strong>${t('health.comorbidities_title')}:</strong> ${comorbidities}</p>`;
        }
    }

    // Medications
    html += `<p><strong>${t('health.medications_title')}:</strong> `;
    if (data.takes_medication === 'oui') {
        html += `${t('buttons.yes')} - ${data.medication_list || ''}`;
    } else {
        html += t('buttons.no');
    }
    html += '</p>';

    container.innerHTML = html;
}

function generateVaccinationSummary() {
    const container = document.getElementById('summary-vaccination');
    const noCard = document.getElementById('no_vaccination_card').checked;

    let html = '';

    if (noCard) {
        html = `<p>${t('vaccination.no_card')}</p>`;
    } else if (uploadedFiles.length > 0) {
        html = '<ul>';
        uploadedFiles.forEach(file => {
            const icon = file.type === 'application/pdf' ? '&#128196;' : '&#128247;';
            const size = (file.size / 1024 / 1024).toFixed(1);
            html += `<li>${icon} ${file.name} (${size} MB)</li>`;
        });
        html += '</ul>';
    } else {
        html = `<p>${t('messages.no_files')}</p>`;
    }

    container.innerHTML = html;
}

function generateReferralSummary() {
    const container = document.getElementById('summary-referral');
    const data = collectFormData();

    let html = '';

    if (data.returning_patient) {
        const val = data.returning_patient === 'oui' ? t('buttons.yes') : t('buttons.no');
        html += `<p><strong>${t('referral.returning_question')}:</strong> ${val}</p>`;
    }

    if (data.referral_source && data.referral_source.length > 0) {
        const sourceKeyMap = {
            'internet': 'internet',
            'social_media': 'social',
            'doctor': 'doctor',
            'friend': 'friend',
            'pharmacy': 'pharmacy',
            'travel_agency': 'travel_agency',
            'other': 'other'
        };
        const sources = data.referral_source.map(s => {
            const key = sourceKeyMap[s] || s;
            let label = t('referral.source_' + key) || s;
            if (s === 'doctor' && data.referral_doctor_name) label += ` (${data.referral_doctor_name})`;
            if (s === 'friend' && data.referral_friend_name) label += ` (${data.referral_friend_name})`;
            if (s === 'other' && data.referral_other_specify) label += ` (${data.referral_other_specify})`;
            return label;
        }).join(', ');
        html += `<p><strong>${t('referral.source')}:</strong> ${sources}</p>`;
    }

    if (data.choice_factor && data.choice_factor.length > 0) {
        const factors = data.choice_factor.map(f => t('referral.factor_' + f) || f).join(', ');
        html += `<p><strong>${t('referral.choice_factor')}:</strong> ${factors}</p>`;
    }

    if (data.comment) {
        html += `<p><strong>${t('referral.comment')}:</strong> ${data.comment}</p>`;
    }

    if (!html) {
        html = `<p><em>${t('messages.no_referral')}</em></p>`;
    }

    container.innerHTML = html;
}

/**
 * Form Data Collection
 */
function collectFormData() {
    const form = document.getElementById('patient-form');
    const formData = new FormData(form);
    const data = {};

    // Simple fields
    const simpleFields = [
        'full_name', 'birthdate', 'email', 'phone', 'street', 'postal_code', 'city',
        'residence_country', 'gender', 'trip_departure', 'trip_return',
        'weight', 'show_reproductive', 'pregnancy',
        'contraception', 'breastfeeding', 'last_menses',
        'allergy_detail_oeufs', 'allergy_detail_medicaments', 'allergy_detail_aliments',
        'allergy_detail_environnement', 'allergy_detail_autre',
        'dengue_history', 'chickenpox_disease', 'chickenpox_vaccine', 'vaccination_problem',
        'vaccination_problem_details', 'hiv_cd4', 'psychiatric_details', 'comorbidity_other',
        'comorbidity_detail_thymus', 'comorbidity_detail_rate', 'comorbidity_detail_cancer',
        'comorbidity_detail_hematologie', 'comorbidity_detail_cardiaque', 'comorbidity_detail_diabete',
        'comorbidity_detail_inflammatoire', 'comorbidity_detail_digestive',
        'comorbidity_detail_rhumatologie', 'comorbidity_detail_musculaire', 'comorbidity_detail_chirurgie',
        'recent_chemotherapy', 'takes_medication', 'medication_list', 'no_vaccination_card',
        'returning_patient', 'referral_doctor_name', 'referral_friend_name',
        'referral_other_specify', 'comment', 'consent',
        'travel_reason_other', 'accommodation_other', 'activities_other', 'rural_stay'
    ];

    simpleFields.forEach(field => {
        const value = formData.get(field);
        if (value !== null) {
            data[field] = value;
        }
    });

    // Multi-select fields
    const multiFields = ['travel_reason', 'accommodation', 'activities', 'allergy_types',
                         'comorbidities', 'referral_source', 'choice_factor'];

    multiFields.forEach(field => {
        data[field] = formData.getAll(field);
    });

    // Flexible dates flag
    data.flexible_dates = document.getElementById('flexible-dates').checked;

    // Destinations
    data.destinations = [];
    document.querySelectorAll('.destination-row').forEach(row => {
        const country = row.querySelector('.destination-country').value;
        const departure = row.querySelector('.destination-departure').value;
        const returnDate = row.querySelector('.destination-return').value;
        const durationSelect = row.querySelector('.destination-estimated-duration');
        const estimatedDuration = durationSelect ? durationSelect.value : '';

        if (country || departure || returnDate) {
            data.destinations.push({
                country: country,
                departure: departure,
                return: returnDate,
                estimated_duration: estimatedDuration
            });
        }
    });

    return data;
}

/**
 * Draft Management
 */
function startDraftAutoSave() {
    draftSaveTimer = setInterval(() => {
        if (formModified) {
            saveDraft();
        }
    }, DRAFT_SAVE_INTERVAL);
}

async function saveDraft() {
    if (!currentToken) return;

    try {
        const response = await fetch(API_URL + '/save-draft.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                token: currentToken,
                step_reached: currentStep,
                form_data: collectFormData(),
                language: currentLang
            })
        });

        const data = await response.json();

        if (data.success) {
            formModified = false;
            showDraftIndicator();
        }
    } catch (error) {
        console.error('Draft save error:', error);
    }
}

async function loadDraft(editToken) {
    try {
        const response = await fetch(API_URL + '/get-draft.php?token=' + editToken);
        const data = await response.json();

        if (data.success && data.form_data) {
            currentToken = editToken;
            isEditMode = !!data.is_submitted;
            populateForm(data.form_data);

            if (data.step_reached) {
                goToStep(data.step_reached);
            }

            if (data.language) {
                setLanguage(data.language);
            }

            // Clear token from URL
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    } catch (error) {
        console.error('Draft load error:', error);
    }
}

function populateForm(data) {
    // Simple fields
    Object.keys(data).forEach(key => {
        const element = document.querySelector(`[name="${key}"]`);

        if (!element) return;

        if (element.type === 'checkbox') {
            element.checked = data[key] === true || data[key] === 'on';
        } else if (element.type === 'radio') {
            const radio = document.querySelector(`[name="${key}"][value="${data[key]}"]`);
            if (radio) radio.checked = true;
        } else {
            element.value = data[key];
        }
    });

    // Multi-select fields
    ['travel_reason', 'accommodation', 'activities', 'allergy_types',
     'comorbidities', 'referral_source', 'choice_factor'].forEach(field => {
        if (data[field] && Array.isArray(data[field])) {
            data[field].forEach(value => {
                const checkbox = document.querySelector(`[name="${field}"][value="${value}"]`);
                if (checkbox) checkbox.checked = true;
            });
        }
    });

    // Flexible dates checkbox
    if (data.flexible_dates) {
        const flexCheckbox = document.getElementById('flexible-dates');
        flexCheckbox.checked = true;
        toggleFlexibleDates();
    }

    // Destinations
    if (data.destinations && data.destinations.length > 0) {
        // Clear existing destinations except first
        document.querySelectorAll('.destination-row').forEach((row, index) => {
            if (index > 0) row.remove();
        });

        data.destinations.forEach((dest, index) => {
            if (index > 0) addDestination();

            const rows = document.querySelectorAll('.destination-row');
            const row = rows[index];

            if (row) {
                if (dest.country) {
                    row.querySelector('.destination-country').value = dest.country;
                    row.querySelector('.destination-country-search').value =
                        getCountryName(dest.country, currentLang);
                }
                if (dest.departure) {
                    row.querySelector('.destination-departure').value = dest.departure;
                }
                if (dest.return) {
                    row.querySelector('.destination-return').value = dest.return;
                }
                if (dest.estimated_duration) {
                    const durationSelect = row.querySelector('.destination-estimated-duration');
                    if (durationSelect) durationSelect.value = dest.estimated_duration;
                }
            }
        });
    }

    // Trigger conditional fields
    const gender = document.querySelector('input[name="gender"]:checked');
    if (gender) handleGenderChange({ target: gender });

    handleAllergyChange();
    toggleVaccinationProblem();
    toggleMedicationField();
    toggleChemoQuestion();

    // Trigger comorbidity detail fields
    document.querySelectorAll('input[name="comorbidities"]:checked').forEach(cb => {
        toggleComorbidityDetail(cb);
        if (cb.value === 'vih') toggleHivField(cb);
        if (cb.value === 'psychiatrique') togglePsychiatricField(cb);
        if (cb.value === 'autre') toggleOtherComorbidity(cb);
    });

    // Trigger referral detail fields
    document.querySelectorAll('input[name="referral_source"]:checked').forEach(cb => {
        if (cb.value === 'doctor') toggleReferralDetail(cb, 'referral-doctor-detail');
        if (cb.value === 'friend') toggleReferralDetail(cb, 'referral-friend-detail');
        if (cb.value === 'other') toggleReferralDetail(cb, 'referral-other-detail');
    });
}

function showDraftIndicator() {
    const indicator = document.getElementById('draft-indicator');
    indicator.classList.remove('hidden');

    setTimeout(() => {
        indicator.classList.add('hidden');
    }, 2000);
}

/**
 * Form Submission
 */
async function submitForm() {
    if (!validateCurrentStep()) return;

    const btnSubmit = document.getElementById('btn-submit');
    btnSubmit.disabled = true;
    btnSubmit.innerHTML = '<span class="spinner"></span> ' + t('messages.submitting');

    try {
        // First, upload files if any
        let fileIds = [];
        if (uploadedFiles.length > 0) {
            fileIds = await uploadFiles();
        }

        // Then submit form data
        const formData = collectFormData();
        formData.vaccination_file_ids = fileIds;
        formData.language = currentLang;

        let response;
        if (isEditMode && currentToken) {
            // Update existing form (no captcha needed)
            response = await fetch(API_URL + '/update-form.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    edit_token: currentToken,
                    form_data: formData
                })
            });
        } else {
            // New submission with captcha
            response = await fetch(API_URL + '/submit-public.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    captcha_token: currentToken,
                    form_data: formData
                })
            });
        }

        const data = await response.json();

        if (data.success) {
            showSuccessScreen(formData.email);
        } else {
            alert(data.error || t('errors.submission_failed'));
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = '<span>' + t('buttons.submit') + '</span>';
        }
    } catch (error) {
        console.error('Submission error:', error);
        alert(t('errors.connection_error'));
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = '<span>' + t('buttons.submit') + '</span>';
    }
}

async function uploadFiles() {
    const formData = new FormData();

    uploadedFiles.forEach((file, index) => {
        formData.append('files[]', file);
    });

    if (currentToken) {
        formData.append('token', currentToken);
    }

    const response = await fetch(API_URL + '/upload-files.php', {
        method: 'POST',
        body: formData
    });

    const data = await response.json();

    if (data.success) {
        return data.file_ids || [];
    } else {
        throw new Error(data.error || 'Upload failed');
    }
}

function showSuccessScreen(email) {
    document.getElementById('patient-form').style.display = 'none';
    document.querySelector('.progress-container').style.display = 'none';
    document.querySelector('.form-navigation').style.display = 'none';

    const formBaseUrl = window.location.origin + window.location.pathname;
    const shareMessage = t('messages.share_message');
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareMessage + ' ' + formBaseUrl)}`;
    const emailSubject = t('messages.share_email_subject');
    const emailBody = shareMessage + '\n' + formBaseUrl;
    const mailtoUrl = `mailto:?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;

    const container = document.querySelector('.form-container');
    const successHtml = `
        <div class="success-screen">
            <div class="success-icon">&#10003;</div>
            <h2>${t('messages.success_title')}</h2>
            <p>${t('messages.success_message')}</p>
            <p><strong>${email}</strong></p>
            <div class="share-section">
                <p>${t('messages.share_with_travelers')}</p>
                <div class="share-buttons">
                    <a href="${whatsappUrl}" target="_blank" class="btn btn-whatsapp">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                        WhatsApp
                    </a>
                    <a href="${mailtoUrl}" class="btn btn-email">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 4l-10 8L2 4"/></svg>
                        Email
                    </a>
                </div>
                <div class="share-link-box">
                    <input type="text" readonly value="${formBaseUrl}" id="share-link-input" onclick="this.select()">
                    <button type="button" class="btn btn-secondary" onclick="copyShareLink()">${t('buttons.copy_link')}</button>
                </div>
            </div>
            <a href="https://www.traveldoctor.ch" class="btn btn-primary">${t('buttons.back_to_site')}</a>
        </div>
    `;

    container.insertAdjacentHTML('beforeend', successHtml);
}

function copyShareLink() {
    const input = document.getElementById('share-link-input');
    input.select();
    input.setSelectionRange(0, 99999);
    navigator.clipboard.writeText(input.value).then(() => {
        const btn = event.target;
        const originalText = btn.textContent;
        btn.textContent = t('messages.link_copied');
        setTimeout(() => { btn.textContent = originalText; }, 2000);
    });
}

/**
 * Utility Functions
 */
function formatDate(dateString) {
    if (!dateString) return '';

    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
}

function updatePlaceholders() {
    document.querySelectorAll('[data-placeholder]').forEach(element => {
        const key = element.dataset.placeholder;
        const translation = t(key);
        if (translation) {
            element.placeholder = translation;
        }
    });
}

// Update placeholders when language changes
const originalSetLanguage = typeof setLanguage === 'function' ? setLanguage : null;
if (originalSetLanguage) {
    window.setLanguage = function(lang) {
        originalSetLanguage(lang);
        updatePlaceholders();
    };
}

/**
 * Real-time blur validation for key fields
 */
function initBlurValidation() {
    // Birthdate blur validation
    const birthdate = document.getElementById('birthdate');
    if (birthdate) {
        birthdate.addEventListener('blur', function() {
            clearFieldError(this);
            if (!this.value) return;
            if (new Date(this.value) > new Date()) {
                showError(this, t('errors.date_not_future'));
            } else if (new Date(this.value) < new Date('1900-01-01')) {
                showError(this, t('errors.invalid_date'));
            }
        });
    }

    // Weight blur validation
    const weight = document.getElementById('weight');
    if (weight) {
        weight.addEventListener('blur', function() {
            clearFieldError(this);
            if (!this.value) return;
            const w = parseFloat(this.value);
            if (isNaN(w) || w < 2 || w > 400) {
                showError(this, t('errors.weight_range'));
            }
        });
    }

    // Last menses blur validation
    const lastMenses = document.getElementById('last_menses');
    if (lastMenses) {
        lastMenses.addEventListener('blur', function() {
            clearFieldError(this);
            if (!this.value) return;
            if (new Date(this.value) > new Date()) {
                showError(this.closest('.form-group') || this, t('errors.date_not_future'));
            }
        });
    }

    // Trip dates blur validation
    const tripDeparture = document.getElementById('trip-departure');
    const tripReturn = document.getElementById('trip-return');
    if (tripDeparture && tripReturn) {
        function validateTripDates() {
            const group = tripDeparture.closest('.form-group');
            if (group) {
                group.classList.remove('has-error', 'has-warning');
                const errSpan = group.querySelector('.error-message');
                if (errSpan) errSpan.textContent = '';
                const warnSpan = group.querySelector('.warning-message');
                if (warnSpan) warnSpan.remove();
            }
            if (tripDeparture.value && tripReturn.value) {
                if (new Date(tripDeparture.value) > new Date(tripReturn.value)) {
                    showError(tripDeparture, t('errors.trip_departure_before_return'));
                }
            }
            if (tripDeparture.value) {
                const now = new Date();
                now.setHours(0, 0, 0, 0);
                if (new Date(tripDeparture.value) < now) {
                    showWarning(tripDeparture, t('warnings.date_in_past'));
                }
            }
        }
        tripDeparture.addEventListener('blur', validateTripDates);
        tripReturn.addEventListener('blur', validateTripDates);
    }

    // Travel dates blur validation (event delegation)
    document.addEventListener('blur', function(e) {
        if (e.target.classList.contains('destination-departure') || e.target.classList.contains('destination-return')) {
            const row = e.target.closest('.destination-row');
            if (!row) return;

            // Clear previous warnings/errors on this row
            row.classList.remove('has-warning');
            const existingWarning = row.querySelector('.warning-message');
            if (existingWarning) existingWarning.remove();

            const departure = row.querySelector('.destination-departure');
            const returnDate = row.querySelector('.destination-return');

            if (departure.value && returnDate.value) {
                const depDate = new Date(departure.value);
                const retDate = new Date(returnDate.value);

                if (depDate > retDate) {
                    showWarning(departure, t('errors.departure_after_return'));
                    return;
                }

                const durationDays = (retDate - depDate) / (1000 * 60 * 60 * 24);
                if (durationDays > 730) {
                    showWarning(returnDate, t('warnings.long_duration'));
                }
            }

            if (departure.value) {
                const now = new Date();
                now.setHours(0, 0, 0, 0);
                if (new Date(departure.value) < now) {
                    showWarning(departure, t('warnings.date_in_past'));
                }
            }
        }
    }, true);
}

/**
 * Clear error state for a specific field
 */
function clearFieldError(element) {
    const formGroup = element.closest('.form-group');
    if (formGroup) {
        formGroup.classList.remove('has-error');
        const errorSpan = formGroup.querySelector('.error-message');
        if (errorSpan) errorSpan.textContent = '';
    }
}

/**
 * Character counters for textareas with maxlength
 */
function initCharCounters() {
    document.querySelectorAll('textarea[maxlength]').forEach(textarea => {
        const max = textarea.getAttribute('maxlength');
        const counter = document.createElement('span');
        counter.className = 'char-counter';
        counter.textContent = `0 / ${max}`;
        textarea.parentNode.appendChild(counter);
        textarea.addEventListener('input', () => {
            counter.textContent = `${textarea.value.length} / ${max}`;
            counter.classList.toggle('near-limit', textarea.value.length > max * 0.9);
        });
    });
}
