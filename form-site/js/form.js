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

    // Update placeholders with translations
    updatePlaceholders();
}

/**
 * Check URL parameters for token or edit mode
 */
function checkUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const editToken = urlParams.get('edit');

    // Check if this is the authenticated form (not public.html)
    const isPublicForm = window.location.pathname.includes('public.html');

    if (editToken) {
        loadDraft(editToken);
    } else if (token) {
        currentToken = token;
        // Pre-fill email if available
        verifyToken(token);
    } else if (!isPublicForm) {
        // No token on authenticated form - redirect to main site
        showAccessDenied();
    }
}

/**
 * Show access denied message and redirect
 */
function showAccessDenied() {
    document.body.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; font-family: 'Open Sans', sans-serif; text-align: center; padding: 20px;">
            <h1 style="color: #333; margin-bottom: 20px;">Accès non autorisé</h1>
            <p style="color: #666; margin-bottom: 30px;">Ce formulaire nécessite un lien d'accès valide.<br>Veuillez utiliser le lien reçu par email.</p>
            <a href="https://www.traveldoctor.ch" style="background: #2ea3f2; color: white; padding: 12px 24px; border-radius: 3px; text-decoration: none;">Retour au site</a>
        </div>
    `;
}

/**
 * Verify access token
 */
async function verifyToken(token) {
    try {
        const response = await fetch(API_URL + '/verify-token.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token })
        });

        const data = await response.json();

        if (data.success) {
            currentToken = token;
            if (data.email) {
                document.getElementById('email').value = data.email;
            }
            // Clear token from URL
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    } catch (error) {
        console.error('Token verification error:', error);
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

    // Destinations
    const destinations = step.querySelectorAll('.destination-row');
    let hasValidDestination = false;

    destinations.forEach(row => {
        const country = row.querySelector('.destination-country').value;
        const departure = row.querySelector('.destination-departure').value;
        const returnDate = row.querySelector('.destination-return').value;

        if (country && departure && returnDate) {
            if (new Date(departure) > new Date(returnDate)) {
                showError(row.querySelector('.destination-departure'), t('errors.departure_after_return'));
                isValid = false;
            } else {
                hasValidDestination = true;
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
    }

    // Accommodation
    const accommodations = step.querySelectorAll('input[name="accommodation"]:checked');
    if (accommodations.length === 0) {
        showError(step.querySelector('input[name="accommodation"]').closest('.form-group'), t('errors.required'));
        isValid = false;
    }

    // Activities
    const activities = step.querySelectorAll('input[name="activities"]:checked');
    if (activities.length === 0) {
        showError(step.querySelector('input[name="activities"]').closest('.form-group'), t('errors.required'));
        isValid = false;
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
    if (!weight.value || weight.value <= 0) {
        showError(weight, t('errors.required'));
        isValid = false;
    }

    // Allergies
    const hasAllergies = step.querySelector('input[name="has_allergies"]:checked');
    if (!hasAllergies) {
        showError(step.querySelector('input[name="has_allergies"]').closest('.form-group'), t('errors.required'));
        isValid = false;
    } else if (hasAllergies.value === 'oui') {
        const allergiesDetails = step.querySelector('#allergies_details');
        if (!allergiesDetails.value.trim()) {
            showError(allergiesDetails, t('errors.required'));
            isValid = false;
        }
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

function clearErrors() {
    document.querySelectorAll('.has-error').forEach(el => {
        el.classList.remove('has-error');
    });
    document.querySelectorAll('.error-message').forEach(el => {
        el.textContent = '';
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

function toggleAllergiesSection() {
    const hasAllergies = document.querySelector('input[name="has_allergies"]:checked');
    const allergiesDetails = document.getElementById('allergies-details');

    if (hasAllergies && hasAllergies.value === 'oui') {
        allergiesDetails.classList.remove('hidden');
    } else {
        allergiesDetails.classList.add('hidden');
    }
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
    } else {
        field.classList.add('hidden');
        field.value = '';
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
 * Destination Management
 */
let destinationIndex = 1;

function addDestination() {
    const container = document.getElementById('destinations-container');
    const newRow = document.createElement('div');
    newRow.className = 'destination-row';
    newRow.dataset.index = destinationIndex;

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
            <input type="date" class="destination-departure" name="destinations[${destinationIndex}][departure]"
                   title="${t('travel.departure')}">
            <input type="date" class="destination-return" name="destinations[${destinationIndex}][return]"
                   title="${t('travel.return')}">
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

    if (data.street || data.city) {
        const address = [data.street, data.postal_code, data.city].filter(Boolean).join(', ');
        html += `<p><strong>${t('summary.address')}:</strong> ${address}</p>`;
    }

    if (data.residence_country) {
        html += `<p><strong>${t('identity.country')}:</strong> ${getCountryName(data.residence_country, currentLang)}</p>`;
    }

    html += `<p><strong>${t('identity.gender')}:</strong> ${t('identity.gender_' + data.gender) || data.gender}</p>`;

    container.innerHTML = html;
}

function generateTravelSummary() {
    const container = document.getElementById('summary-travel');
    const data = collectFormData();

    let html = `<p><strong>${t('travel.destinations')}:</strong></p><ul>`;

    if (data.destinations && data.destinations.length > 0) {
        data.destinations.forEach(dest => {
            if (dest.country) {
                html += `<li>${getCountryName(dest.country, currentLang)}: ${formatDate(dest.departure)} - ${formatDate(dest.return)}</li>`;
            }
        });
    }
    html += '</ul>';

    if (data.travel_reason && data.travel_reason.length > 0) {
        const reasons = data.travel_reason.map(r => t('travel.reason_' + r) || r).join(', ');
        html += `<p><strong>${t('travel.reason')}:</strong> ${reasons}</p>`;
    }

    if (data.accommodation && data.accommodation.length > 0) {
        const accommodations = data.accommodation.map(a => t('travel.accommodation_' + a) || a).join(', ');
        html += `<p><strong>${t('travel.accommodation')}:</strong> ${accommodations}</p>`;
    }

    if (data.activities && data.activities.length > 0) {
        const activities = data.activities.map(a => t('travel.activity_' + a) || a).join(', ');
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
    if (data.has_allergies === 'oui') {
        html += `${t('buttons.yes')} - ${data.allergies_details || ''}`;
    } else {
        html += t('buttons.no');
    }
    html += '</p>';

    // Diseases
    html += `<p><strong>${t('health.dengue')}:</strong> ${data.dengue_history === 'oui' ? t('buttons.yes') : t('buttons.no')}</p>`;
    html += `<p><strong>${t('health.chickenpox_disease')}:</strong> ${data.chickenpox_disease === 'oui' ? t('buttons.yes') : t('buttons.no')}</p>`;

    // Comorbidities
    if (data.comorbidities && data.comorbidities.length > 0) {
        if (data.comorbidities.includes('aucune')) {
            html += `<p><strong>${t('health.comorbidities_title')}:</strong> ${t('health.comorbidity_none')}</p>`;
        } else {
            const comorbidities = data.comorbidities.map(c => t('health.comorbidity_' + c) || c).join(', ');
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

    if (data.referral_source && data.referral_source.length > 0) {
        const sources = data.referral_source.map(s => t('referral.source_' + s) || s).join(', ');
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
        'residence_country', 'gender', 'weight', 'show_reproductive', 'pregnancy',
        'contraception', 'breastfeeding', 'last_menses', 'has_allergies', 'allergies_details',
        'dengue_history', 'chickenpox_disease', 'chickenpox_vaccine', 'vaccination_problem',
        'vaccination_problem_details', 'hiv_cd4', 'psychiatric_details', 'comorbidity_other',
        'recent_chemotherapy', 'takes_medication', 'medication_list', 'no_vaccination_card',
        'referral_social_platform', 'referral_doctor_name', 'referral_friend_name',
        'referral_ad_location', 'referral_other_specify', 'comment', 'consent',
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

    // Destinations
    data.destinations = [];
    document.querySelectorAll('.destination-row').forEach(row => {
        const country = row.querySelector('.destination-country').value;
        const departure = row.querySelector('.destination-departure').value;
        const returnDate = row.querySelector('.destination-return').value;

        if (country || departure || returnDate) {
            data.destinations.push({
                country: country,
                departure: departure,
                return: returnDate
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
            }
        });
    }

    // Trigger conditional fields
    const gender = document.querySelector('input[name="gender"]:checked');
    if (gender) handleGenderChange({ target: gender });

    toggleAllergiesSection();
    toggleVaccinationProblem();
    toggleMedicationField();
    toggleChemoQuestion();
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

        const response = await fetch(API_URL + '/submit-form.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                token: currentToken,
                form_data: formData
            })
        });

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

    const container = document.querySelector('.form-container');
    const successHtml = `
        <div class="success-screen">
            <div class="success-icon">&#10003;</div>
            <h2>${t('messages.success_title')}</h2>
            <p>${t('messages.success_message')}</p>
            <p><strong>${email}</strong></p>
            <a href="https://www.traveldoctor.ch" class="btn btn-primary">${t('buttons.back_to_site')}</a>
        </div>
    `;

    container.insertAdjacentHTML('beforeend', successHtml);
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
