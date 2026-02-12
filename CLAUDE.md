# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Travel Doctor App is a web application for managing travel medicine consultations. It handles patient management, vaccine administration tracking, prescription generation, and document export. The application uses PocketBase as a backend for multi-user data sharing across multiple clinic locations.

Two versions coexist:
- **v2.0** (`app/`) — Active development. Modular Vue 3 app with ES modules, composables, and component-based architecture.
- **v1.0** (`Travel_Doctor_App_v1.0.html`) — Legacy single-file app. Still functional but no longer updated.

## Development

**No build process required.**

- **v2.0**: Open `app/index.html` in a browser. Uses ES modules (`<script type="module">`). Edit files under `app/js/`.
- **v1.0** (legacy): Open `Travel_Doctor_App_v1.0.html` directly in a browser.

Cache busting: bump the `?v=N` param in `app/index.html` when deploying JS changes.

### External Libraries (loaded from CDN)

- Vue 3 - Reactive UI framework (global build, used via `Vue.ref`, `Vue.computed`, etc.)
- PocketBase 0.21.1 - Backend SDK for authentication and data storage
- jsPDF 2.5.1 - PDF generation
- PDF.js 3.11.174 - PDF parsing for delivery note import fallback
- Tesseract.js 5 - OCR fallback for delivery note images
- xlsx 0.18.5 - Excel file parsing (vaccine lot imports)

## Architecture (v2.0)

### Directory Structure

```
app/
├── index.html              # Entry point
├── css/style.css           # All styles
├── js/
│   ├── app.js              # Root Vue app, screen routing, event wiring
│   ├── api/
│   │   ├── pocketbase.js   # PocketBase direct API (non-sensitive data)
│   │   └── secure-api.js   # PHP API for encrypted data (medical, prescriptions)
│   ├── composables/        # Shared reactive state (singleton pattern)
│   │   ├── useAuth.js      # Login, user, location, role detection
│   │   ├── useCase.js      # Case CRUD, consultation creation
│   │   ├── usePatient.js   # Patient search, selection, history
│   │   ├── useVaccines.js  # Vaccine cards, lots, boosters, save logic
│   │   ├── useStock.js     # Stock management (admin)
│   │   ├── usePrescription.js  # Prescription management
│   │   └── useChronometer.js   # Consultation timer
│   ├── components/         # Vue components (Options API with setup())
│   │   ├── LoginScreen.js
│   │   ├── PendingForms.js     # "NOUVEAU RDV" — calendar + forms view
│   │   ├── PatientSearch.js    # "PATIENT CONNU" — search by name
│   │   ├── CaseView.js        # Patient cases list, start consultation
│   │   ├── ConsultationForm.js # Full consultation (practitioner)
│   │   ├── VaccinationScreen.js # Lean vaccination (vaccinateur)
│   │   ├── VaccinePanel.js     # Vaccine card workflow (shared)
│   │   ├── PatientEditForm.js  # Patient demographics editor
│   │   ├── VoyageEditor.js     # Travel destinations editor
│   │   ├── MedicalEditor.js    # Medical history editor
│   │   ├── PrescriptionPanel.js # Medications panel
│   │   ├── NotesSection.js     # Free-text consultation notes
│   │   ├── DossierStatus.js    # Case status display
│   │   ├── Chronometer.js      # Consultation timer display
│   │   ├── PatientHistory.js   # Past consultations timeline
│   │   ├── TimelineModal.js    # Detailed timeline view
│   │   ├── StockScreen.js      # Vaccine stock management
│   │   ├── StockLotForm.js     # Lot import (PDF/camera + AI parsing)
│   │   └── PinModal.js         # PIN entry for stock access
│   ├── data/
│   │   ├── vaccine-schedules.js # 27 vaccines with booster intervals
│   │   ├── form-labels.js      # French labels for form field values
│   │   └── countries.js        # Country code → name mapping
│   └── utils/
│       ├── formatting.js       # Date/number formatting helpers
│       ├── form-mapping.js     # Patient form → app field mapping
│       ├── pdf-generator.js    # PDF export (consultation, prescription)
│       └── export-helpers.js   # JSON/DOCX export helpers
```

### Application Flow

1. **Login**: Email/password via PocketBase → `useAuth.login()`
2. **Location Selection**: Choose clinic → `useAuth.selectLocation()`
3. **Home Screen**: Role-dependent buttons:
   - Practitioner: NOUVEAU VOYAGEUR, PATIENT CONNU, NOUVEAU RDV, STOCK VACCINS
   - Vaccinateur: PATIENT CONNU, NOUVEAU RDV only
4. **Patient Path**:
   - NOUVEAU RDV → PendingForms (calendar events + pending forms) → select → ConsultationForm or VaccinationScreen
   - PATIENT CONNU → PatientSearch → CaseView → start consultation/vaccination
   - NOUVEAU VOYAGEUR → ConsultationForm (new patient)
5. **Consultation/Vaccination**: Fill form → save → back to home
6. **Screen routing**: Reactive `screen` ref in `app.js` (no vue-router)

### Composables (Shared State)

Composables use Vue 3 `ref`/`computed` at module level (singleton pattern). All components sharing state call the same composable function.

| Composable | Shared State |
|------------|-------------|
| `useAuth()` | `user`, `location`, `locationName`, `isLoggedIn`, `isAdmin`, `isVaccinateur` |
| `usePatient()` | `currentPatient`, `patients`, `searchQuery` |
| `useCase()` | `currentCase`, `cases`, consultations |
| `useVaccines()` | `vaccines`, `vaccineLots`, lot management, booster scheduling, save logic |
| `useStock()` | Stock CRUD, adjustments, lot import |
| `usePrescription()` | Medication selection, dosing |

### API Layers

- **`pocketbase.js`** — Direct PocketBase SDK calls for non-sensitive data (patients name/dob, cases, consultations metadata, vaccine lots, boosters, stock)
- **`secure-api.js`** — Calls PHP endpoints on `form.traveldoctor.ch` for encrypted data (medical history, prescriptions, observations, delivery note parsing). Uses PocketBase auth token for authentication.

### Data Persistence

- **PocketBase Database**: Primary storage for all data
- **PHP encryption layer**: Medical data encrypted at rest via `encrypt-data.php` / `decrypt-data.php`
- **Location-based vaccine lots**: Each clinic has its own inventory

### PocketBase Collections

| Collection | Purpose |
|------------|---------|
| `users` | Practitioner accounts (email, password, name, role, default_location) |
| `locations` | Clinic/site locations (name, address, phone, google_calendar_id, stock_pin) |
| `patients` | Patient records (nom, dob, contact info, medical_encrypted) |
| `cases` | Per-visit lifecycle: booking → form → consultation → done (patient, patient_form, type, voyage, status) |
| `consultations` | Consultation records linked to patient, case, location |
| `observations` | Clinical observations per patient (type, value_encrypted, unit, date) |
| `vaccines_administered` | Vaccines given during consultation |
| `boosters_scheduled` | Planned booster dates (linked to case) |
| `prescriptions` | Medications prescribed (medications_encrypted) |
| `vaccine_lots` | Vaccine inventory per location |
| `stock_adjustments` | Audit trail for stock quantity changes (vaccine_lot, previous_qty, new_qty, reason, adjusted_by) |
| `patient_forms` | Patient intake forms (encrypted, status: draft/submitted/processed/cancelled) |
| `vaccination_files` | Uploaded vaccination documents |

### Configuration

PocketBase URL is configured in `app/js/api/pocketbase.js`:
```javascript
const POCKETBASE_URL = 'https://db.traveldoctor.ch';
```

Secure API base URL is in `app/js/api/secure-api.js`:
```javascript
const API_BASE = 'https://form.traveldoctor.ch/api';
```

## Vaccine Database

27 vaccines integrated with predefined booster schedules: Adacel, Adacel Polio, Boostrix, Boostrix polio, Comirnaty, Efluelda, Encepur (adults/children), Engerix B-20, FSME-Immun (CC/Junior), Havrix (1440/720), IPV Polio, Ixiaro, Menveo, Priorix, Qdenga, Rabipur, Revaxis, Shingrix, Stamaril, Twinrix 720/20, Typhim, Varilrix, VaxigripTetra, Vivotif.

## Prescription Medications

Predefined medications with automatic pediatric dosing calculations for patients under 40kg: MALARONE, MEPHAQUIN, RIAMET. Other medications: Doxycycline, Vivotif, Acetazolamide, plus custom medication support.

## User Roles

- **admin**: Can upload vaccine lots, import legacy JSON files, delete data
- **practitioner**: Can create/update patients, save consultations, view all data
- **vaccinateur**: Restricted role for external vaccination staff — can only administer vaccines and record them. No patient creation, no case management, no prescriptions, no medical editing, no stock management

## Testing

No automated tests. Manual testing required for:
- Login/logout flow
- Location selection and persistence
- Patient search and selection
- Consultation save to database
- Vaccine lots filtered by location
- PDF extraction accuracy (depends on KoBoToolbox PDF structure)
- Date calculations for boosters
- PDF generation output quality
- Offline/connection error handling

## Notes

- Application language is French
- Practitioner information comes from logged-in user account
- PocketBase SDK 0.21.1 uses `authStore.model` (not `authStore.record`) — `getCurrentUser()` handles both
- File naming convention for JSON backups: `lastname_firstname_dd-mm-yyyy.json`

---

## Current Work Status (2026-02-12)

### Completed ✓

1. **Removed PDF-related code** from Travel_Doctor_App_v1.0.html (~550 lines)
   - Renamed `extractedKoboData` to `patientFormData`
   - Only online forms are now used

2. **Simplified PocketBase schema**
   - Deleted `email_tokens` collection (unused)
   - Deleted `form_drafts` collection (unused)
   - Removed `token_id` field from `patient_forms`
   - Added `insurance_card_encrypted` field to `patient_forms`
   - Added `onedoc` to `source` select values

3. **Simplified form architecture**
   - Deleted old `index.html` (required email tokens)
   - Renamed `public.html` → `index.html` (main form)
   - Deleted unused API files: `send-token.php`, `verify-token.php`, `submit-form.php`, `save-draft.php`
   - Cleaned up `form.js`: removed token verification code
   - Simplified `get-draft.php`: only searches `patient_forms`

4. **OneDoc email processor** (`form-site/cron/process-onedoc-emails.php`) ✓
   - Uses `webklex/php-imap` library (no native extension needed)
   - Monitors `OneDoc` IMAP folder
   - Filters by subject: "Nouveau RDV en ligne" or "Nouvelle consultation vidéo en ligne"
   - Parses HTML body using icon images (fa-user, fa-phone, etc.) for reliable extraction
   - Extracts: name, birthdate, phone, email, insurance card, AVS, address, appointment info
   - Sends HTML email with prefilled KoBoToolbox form link (temporary workaround)
   - Duplicate check: (email + appointment date/time) as unique key
   - Cron runs every 15 minutes

5. **Security hardening**
   - `form-site/.htaccess` - security headers
   - `form-site/api/.htaccess` - blocks config.php, helpers.php, encryption.php
   - `form-site/cron/.htaccess` - blocks all web access
   - Root `.gitignore` for logs, .claude/, sample files

6. **API endpoints for practitioners**
   - `decrypt-form.php` - Decrypt form for display
   - `get-pending-forms.php` - List forms awaiting processing
   - `get-patient-history.php` - Patient history by AVS/email
   - `mark-form-processed.php` - Mark form as processed
   - `match-patient.php` - Match form to existing patient

7. **Travel Doctor App integration** ✓
   - "NOUVEAU RDV" button → pending forms screen
   - Forms show patient name, DOB, destination, known/new badge
   - Click form → populates consultation fields automatically
   - After save → form marked as processed

8. **Form UX improvements** ✓
   - Removed "Formulaire public" notice banner
   - Prefilled forms now open at step 1 (not step 5)
   - Added share link after form submission for fellow travelers
   - Copy link button with confirmation

9. **Form validation feedback UX** ✓ (2026-02-08)
   - Scroll to first error + focus input on validation failure
   - Destination date column headers (Country/Departure/Return) with responsive mobile labels
   - aria-label attributes on date inputs for accessibility
   - Field hints: birthdate ("past date"), last menses ("past only"), weight ("2-400 kg")
   - Real-time blur validation for birthdate, weight, last menses, travel dates
   - "Autre" text fields show required indicator (*) when checkbox is checked
   - Character counters on all textareas with maxlength (amber near limit)
   - All hints translated in 4 languages (FR/EN/IT/ES)

10. **PocketBase schema update for cases/patient data model** ✓ (2026-02-09)
   - New collection: `cases` — per-visit lifecycle (patient, patient_form, opened_by, location, type, voyage, medical_encrypted, status, notes, opened_at, closed_at)
   - New collection: `observations` — clinical observations (patient, consultation, type, value_encrypted, unit, date)
   - `patients`: added `medical_encrypted` (encrypted JSON with allergies, conditions, medications, pregnancy etc.)
   - `consultations`: added `case` relation (optional, will become required after migration); removed `voyage` and `medical` (moved to cases/patients); updated `consultation_type` values to teleconsultation/vaccination/rappel/suivi
   - `boosters_scheduled`: added `case` relation
   - `prescriptions`: replaced `medications` (json) with `medications_encrypted` (text)
   - `patient_forms`: added `cancelled` to status values
   - `locations`: added `google_calendar_id` to schema file (was already in DB)

11. **Application code adapted to new cases/patient data model** ✓ (2026-02-10)
   - **New PHP endpoints**: `encrypt-data.php` (batch encrypt), `decrypt-data.php` (batch decrypt)
   - **`submit-public.php`**: now creates patient (find or create by AVS/DOB+name) + case on form submission
   - **`decrypt-form.php`**: uses `linked_patient` from form record, returns `case_id` in response
   - **`get-pending-forms.php`**: uses `linked_patient`, returns `case_id`, checks consultations for "known" badge
   - **`get-patient-history.php`**: fetches cases (decrypts medical_encrypted), attaches case data to consultations, decrypts medications_encrypted on prescriptions
   - **`mark-form-processed.php`**: also closes associated case (status=termine, closed_at)
   - **`saveConsultationToDb()`**: encrypts medical/medications via PHP API, updates patient with medical_encrypted, creates/updates case with voyage + medical_encrypted, consultation links to case (no voyage/medical), boosters link to case, prescriptions use medications_encrypted
   - **`selectPatientFromSearch()`**: single API call to get-patient-history.php, builds loadedPatientJSON from cases (voyage/medical from case, not consultation)
   - **`loadPatientHistoryFromDb()`**: same API-first approach
   - **`selectPendingForm()`**: stores case_id from decrypt-form.php response, sets selectedPatientId from linked patient
   - **`displayPatientHistory()`**: updated consultation_type labels (vaccination, teleconsultation, rappel, suivi)
   - **Data flow**: Patient created at form submission → case created → practitioner updates patient/case at consultation save

12. **Google Calendar integration** ✓ (code ready, 2026-02-08)
   - OneDoc pushes bookings to Google Calendar (one per location: Lausanne, Bulle)
   - Read calendar events via Google Calendar API (service account + JWT, no google/apiclient)
   - Display today's appointments in PendingForms view, grouped by time
   - Match calendar events with PocketBase forms (by email or name)
   - 3 visual states: Formulaire reçu (green), En attente du formulaire (orange), Sans RDV
   - **New files**: `form-site/api/google-calendar.php`, `form-site/api/get-calendar-events.php`
   - **Setup required**: Google Cloud project + service account + calendar sharing + `GOOGLE_SERVICE_ACCOUNT_KEY_PATH` in `config-secrets.php`

13. **AI-powered delivery note parsing** ✓ (2026-02-11)
   - **New PHP endpoint**: `form-site/api/parse-delivery-note.php`
     - Receives PDF or image (JPEG/PNG) via multipart upload
     - PDFs: tries `pdftotext` for text extraction (cheap text-only API call), falls back to vision mode
     - Images: always use vision mode
     - Sends to Claude API (`claude-sonnet-4-20250514`, temperature=0) with structured extraction prompt
     - Validates response: vaccine names must match 27-name allowlist, dates validated, quantities clamped
     - Assistant prefill (`[`) forces JSON array output
     - Returns `{success, lots, mode}` — mode is "text" or "vision"
     - On any failure returns `{fallback: true}` so frontend uses local parsing
   - **`app/js/api/secure-api.js`**: added `parseDeliveryNote(file, fieldName)` — uploads via FormData
   - **`app/js/components/StockLotForm.js`**:
     - Two import buttons: "Importer un PDF" + "Photographier" (device camera, `capture="environment"`)
     - AI-first flow: tries API, falls back to local PDF.js+Tesseract+regex for PDFs
     - PDF/image preview pane (side-by-side with lot fields) for practitioner verification
     - Lot number required: empty lots highlighted red, save button disabled
     - All existing regex parsing functions kept as fallback
   - **Config**: `ANTHROPIC_API_KEY` must be in `config-secrets.php` on server
   - **Note**: `pdftotext` (poppler-utils) not installable on Jelastic due to OOM on `yum` — all PDFs use vision mode for now. Functionally fine, slightly higher API cost per call.
   - **Deploy**: `cp form-site/api/parse-delivery-note.php /var/www/webroot/ROOT/api/`

14. **Vaccinateur role — lean vaccination interface** ✓ (2026-02-12)
   - **`app/js/composables/useAuth.js`**: added `isVaccinateur` computed (`role === 'vaccinateur'`)
   - **`app/js/components/VaccinationScreen.js`**: new lean screen with:
     - Read-only patient summary (name, DOB, age, weight, gender)
     - Medical alerts panel (vaccination problems, pregnancy, immune comorbidities, allergies, chemotherapy)
     - Reused VaccinePanel component (with pre-loaded pending boosters)
     - Optional note textarea
     - Save: creates consultation (type=vaccination) + saves vaccines with stock decrement
     - No: PatientEditForm, VoyageEditor, MedicalEditor, PrescriptionPanel, DossierStatus, Chronometer
   - **`app/js/app.js`**: routes vaccinateur to VaccinationScreen for all paths (onStartConsultation, onFormSelected, onCalendarSelected); hides NOUVEAU VOYAGEUR and STOCK VACCINS home buttons; shows purple "Vaccinateur" role badge
   - **`app/js/components/CaseView.js`**: hides Nouveau dossier, Fermer le dossier, Consultation, and Teleconsultation buttons for vaccinateur (only Vaccination button remains)
   - **`app/js/components/PendingForms.js`**: hides Saisie manuelle (walk-in) button for vaccinateur
   - **`app/js/components/VaccinePanel.js`**: simplified dropdown to show vaccine name only
   - **`app/css/style.css`**: added `.role-badge-vaccinateur`, `.vaccination-screen`, `.medical-alerts` styles
   - **Bug fixes during implementation**:
     - `pocketbase.js`: `getCurrentUser()` now uses `authStore.record || authStore.model` (SDK 0.21.1 uses `model`, not `record`)
     - `useVaccines.js`: removed invalid `consultation` field from `createStockAdjustment` (caused 400 error); added try-catch around stock operations so audit trail failures don't block vaccine save
   - **Server fix**: restored `get-observations.php` which had been overwritten with calendar events content on the production server

### Pending Tasks

1. **Optional improvements**
   - Add Italian/Spanish translations for share link messages
   - Add email notification to practitioner when form is submitted

2. **Add 2FA for practitioner login**
   - PocketBase supports OTP (one-time password) MFA — investigate built-in support

3. **Switch from KoBoToolbox to internal form** (when app is ready)
   - In `process-onedoc-emails.php`, function `sendFormInvitation()`:
   - Change `$formLink = buildKoboUrl($patientData);`
   - Back to `$formLink = FORM_URL . '/?edit=' . $editToken;`
   - The `buildKoboUrl()` function can then be deleted

### Temporary Workaround (2026-02-06)

**KoBoToolbox prefilled forms**: While waiting for the internal form app to be finalized, the OneDoc email processor sends patients to a prefilled KoBoToolbox form instead of the internal form.

- KoBoToolbox form URL: `https://ee-eu.kobotoolbox.org/x/Jyi1oJ0F`
- Prefilled fields: `full_name`, `birthdate`, `street`, `postal_code`, `city`, `phone`, `email`
- PocketBase still tracks invitations (for duplicate check and future migration)

### Data Flow

```
OneDoc booking → Email to contact@traveldoctor.ch
                        ↓
              IMAP folder: "Notifications RDV OneDoc"
                        ↓
              Cron: process-onedoc-emails.php
                        ↓
              Creates prefilled form in patient_forms (status: draft)
                        ↓
              Sends invitation email to patient
                        ↓
              Patient completes form (submit-public.php)
                        ↓
              Creates patient (or links existing) + case (status: ouvert)
              Form status: submitted
                        ↓
              Practitioner sees in "NOUVEAU RDV" list
                        ↓
              Practitioner clicks → loads patient + case data
                        ↓
              Save consultation → updates patient (medical_encrypted),
              updates case (voyage, medical_encrypted), creates consultation,
              form marked processed, case closed (termine)
```

### Form Sources

| Source | Description |
|--------|-------------|
| `public` | Patient filled form via shared link (or walk-in) |
| `onedoc` | Auto-created from OneDoc booking email |

### Server Environment

- **form.traveldoctor.ch**: Jelastic PHP 8.5.2, has `FORM_ENCRYPTION_KEY` env var
- **db.traveldoctor.ch**: PocketBase database
- **Email**: contact@traveldoctor.ch via Infomaniak (SMTP & IMAP on mail.infomaniak.com)
- **OneDoc emails**: Filtered to `OneDoc` IMAP folder

### Deploy Commands

```bash
# Pull latest code
cd /var/www/webroot/repo && git pull origin main

# Form site API endpoints
cp form-site/api/helpers.php /var/www/webroot/ROOT/api/
cp form-site/api/submit-public.php /var/www/webroot/ROOT/api/
cp form-site/api/decrypt-form.php /var/www/webroot/ROOT/api/
cp form-site/api/get-pending-forms.php /var/www/webroot/ROOT/api/
cp form-site/api/get-patient-history.php /var/www/webroot/ROOT/api/
cp form-site/api/mark-form-processed.php /var/www/webroot/ROOT/api/
cp form-site/api/encrypt-data.php /var/www/webroot/ROOT/api/
cp form-site/api/decrypt-data.php /var/www/webroot/ROOT/api/
cp form-site/api/get-observations.php /var/www/webroot/ROOT/api/
cp form-site/api/get-calendar-events.php /var/www/webroot/ROOT/api/
cp form-site/api/parse-delivery-note.php /var/www/webroot/ROOT/api/

# Cron jobs
cp form-site/cron/process-onedoc-emails.php /var/www/webroot/ROOT/cron/

# Patient form (if updated)
cp form-site/index.html /var/www/webroot/ROOT/index.html
cp form-site/js/form.js /var/www/webroot/ROOT/js/form.js
cp form-site/js/translations.js /var/www/webroot/ROOT/js/translations.js
cp form-site/css/form.css /var/www/webroot/ROOT/css/form.css
```

The practitioner app (`app/`) is served directly from the git repo — no copy needed. Bump `?v=N` in `app/index.html` to bust browser caches.
