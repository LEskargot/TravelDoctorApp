# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Travel Doctor App v1.0 is a single-page web application for managing travel medicine consultations. It handles patient management, vaccine administration tracking, prescription generation, and document export. The application uses PocketBase as a backend for multi-user data sharing across multiple clinic locations.

## Development

**No build process required.** Open `Travel Doctor App v1.0.html` directly in a browser to run the application. Edit the HTML file with any text editor to make changes.

### External Libraries (loaded from CDN)

- jsPDF 2.5.1 - PDF generation
- PDF.js 3.11.174 - PDF text extraction from KoBoToolbox forms
- jszip 3.10.1 - ZIP archive handling
- docx 8.5.0 - DOCX document generation
- xlsx 0.18.5 - Excel file parsing (vaccine lot imports)
- PocketBase 0.21.1 - Backend SDK for authentication and data storage

## Architecture

### Application Flow

1. **Login Screen**: Email/password authentication via PocketBase
2. **Location Selection**: Choose working location (clinic/site) after login
3. **Home Screen**: Choose between new patient (NOUVEAU VOYAGEUR) or known patient search (PATIENT CONNU)
4. **Known Patient Path**: Search database for patient -> choose new trip or booster-only visit
5. **Main Interface**: Accordion-based UI with four sections:
   - Patient file (Dossier Patient)
   - Consultation notes (Notes de consultation)
   - Vaccines & boosters (Vaccins & Rappels)
   - Prescription (Ordonnance)
6. **Save**: Consultation saved to PocketBase database with optional JSON backup download

### Key Global Variables

- `pb` - PocketBase instance
- `currentUser` - Logged-in user name
- `currentLocation` / `currentLocationName` - Selected work location
- `selectedPatientId` / `selectedPatientData` - Currently selected patient from DB
- `extractedKoboData` - Patient data extracted from PDF
- `selectedMedications` - Medications to prescribe
- `administeredVaccines` - Selected vaccines with lot info
- `plannedBoosters` - Calculated booster schedule
- `vaccineLots` - Available vaccine lots (fetched from DB by location)
- `loadedPatientJSON` - Patient data in legacy JSON format (for compatibility)

### Core Functions

| Function | Purpose |
|----------|---------|
| `handleLogin()` / `handleLogout()` | Authentication |
| `showLocationSelection()` | Location picker after login |
| `searchPatients()` | Search patients by name in database |
| `selectPatientFromSearch()` | Load patient details and history |
| `saveConsultationToDb()` | Save consultation to PocketBase |
| `loadVaccineLotsFromDB()` | Fetch vaccine lots for current location |
| `uploadVaccineLotsToDb()` | Admin: upload lots to database |
| `handleLegacyJsonImport()` | Admin: migrate old JSON files to DB |
| `startNewPatient()` | Initialize new consultation |
| `parseKoboText()` | Extract data from KoBoToolbox PDF |
| `generatePatientJson()` | Create patient JSON export (backup) |
| `generateConsultationPdf()` | Export consultation summary PDF |
| `generatePrescriptionPdf()` | Create prescription PDF (A5/A4) |
| `renderVaccineCheckboxList()` | Update vaccine selection UI |
| `calculateBoosterDate()` | Compute recall dates based on vaccine schedules |

### Data Persistence

- **PocketBase Database**: Primary storage for patients, consultations, vaccines, prescriptions
- **Location-based vaccine lots**: Each clinic location has its own vaccine lot inventory
- **JSON backup**: Optional download for offline backup
- **localStorage**: Fallback for vaccine lots if database unavailable

### PocketBase Collections

| Collection | Purpose |
|------------|---------|
| `users` | Practitioner accounts (email, password, name, role, default_location) |
| `locations` | Clinic/site locations (name, address, phone, google_calendar_id) |
| `patients` | Patient records (nom, dob, contact info, medical_encrypted) |
| `cases` | Per-visit lifecycle: booking → form → consultation → done (patient, patient_form, type, voyage, status) |
| `consultations` | Consultation records linked to patient, case, location |
| `observations` | Clinical observations per patient (type, value_encrypted, unit, date) |
| `vaccines_administered` | Vaccines given during consultation |
| `boosters_scheduled` | Planned booster dates (linked to case) |
| `prescriptions` | Medications prescribed (medications_encrypted) |
| `vaccine_lots` | Vaccine inventory per location |
| `patient_forms` | Patient intake forms (encrypted, status: draft/submitted/processed/cancelled) |
| `vaccination_files` | Uploaded vaccination documents |

### Configuration

**IMPORTANT**: Update the `POCKETBASE_URL` constant at the top of the `<script>` section to point to your PocketBase server:
```javascript
const POCKETBASE_URL = 'https://your-pocketbase-server.com';
```

## Vaccine Database

27 vaccines integrated with predefined booster schedules: Adacel, Adacel Polio, Boostrix, Boostrix polio, Comirnaty, Efluelda, Encepur (adults/children), Engerix B-20, FSME-Immun (CC/Junior), Havrix (1440/720), IPV Polio, Ixiaro, Menveo, Priorix, Qdenga, Rabipur, Revaxis, Shingrix, Stamaril, Twinrix 720/20, Typhim, Varilrix, VaxigripTetra, Vivotif.

## Prescription Medications

Predefined medications with automatic pediatric dosing calculations for patients under 40kg: MALARONE, MEPHAQUIN, RIAMET. Other medications: Doxycycline, Vivotif, Acetazolamide, plus custom medication support.

## User Roles

- **admin**: Can upload vaccine lots, import legacy JSON files, delete data
- **practitioner**: Can create/update patients, save consultations, view all data

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
- File naming convention for JSON backups: `lastname_firstname_dd-mm-yyyy.json`
- User manual available in `Manuel_Instruction_Travel_Doctor_App v1.0.html`

---

## Current Work Status (2026-02-04)

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

### Pending Tasks

1. ~~**Set up cron job**~~ ✓ Done (2026-02-06) - runs every 15 min

2. ~~**Re-enable duplicate check**~~ ✓ Done (2026-02-06)

3. ~~**Production testing**~~ ✓ Done (2026-02-06) - Email template validated

4. **Optional improvements**
   - Add Italian/Spanish translations for share link messages
   - Add email notification to practitioner when form is submitted

5. **Add 2FA for practitioner login** (Travel Doctor App)
   - Two-factor authentication required for users logging into the practitioner app
   - PocketBase supports OTP (one-time password) MFA - investigate built-in support

6. **Switch from KoBoToolbox to internal form** (when app is ready)
   - In `process-onedoc-emails.php`, function `sendFormInvitation()`:
   - Change `$formLink = buildKoboUrl($patientData);`
   - Back to `$formLink = FORM_URL . '/?edit=' . $editToken;`
   - The `buildKoboUrl()` function can then be deleted

7. **Google Calendar integration for appointment schedule** ✓ (code ready, 2026-02-08)
   - OneDoc pushes bookings to Google Calendar (one per location: Lausanne, Bulle)
   - Read calendar events via Google Calendar API (service account + JWT, no google/apiclient)
   - Display today's appointments in "Formulaires en attente" view, grouped by time
   - Match calendar events with PocketBase forms (by email or name)
   - 3 visual states: Formulaire reçu (green), En attente du formulaire (orange), Sans RDV
   - Calendar = real-time schedule, email processing = kept for form invitations (richer data)
   - **New files**: `form-site/api/google-calendar.php` (JWT auth helper), `form-site/api/get-calendar-events.php` (endpoint)
   - **Modified files**: `config.php`, `.htaccess`, `Travel_Doctor_App_v1.0.html`
   - **Setup required before going live**:
     - Google Cloud project + Calendar API enabled + service account
     - Share each calendar with service account email (read-only)
     - `google_calendar_id` field already in PocketBase `locations` collection (in schema)
     - Service account JSON key file on server (outside web root)
     - Add `GOOGLE_SERVICE_ACCOUNT_KEY_PATH` to `config-secrets.php`

12. **AI-powered delivery note parsing** ✓ (2026-02-11)
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
cd /var/www/webroot/repo && git pull origin main
cp form-site/cron/process-onedoc-emails.php /var/www/webroot/ROOT/cron/
cp form-site/api/helpers.php /var/www/webroot/ROOT/api/
```
