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
| `locations` | Clinic/site locations |
| `patients` | Patient records (nom, dob, contact info) |
| `consultations` | Consultation records linked to patient, practitioner, location |
| `vaccines_administered` | Vaccines given during consultation |
| `boosters_scheduled` | Planned booster dates |
| `prescriptions` | Medications prescribed |
| `vaccine_lots` | Vaccine inventory per location |

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

## Current Work Status (2026-02-03)

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

4. **Created OneDoc email processor** (`form-site/cron/process-onedoc-emails.php`)
   - Uses `webklex/php-imap` library (no native extension needed)
   - Monitors `OneDoc` IMAP folder for booking notifications
   - Parses patient data from emails
   - Extracts insurance card number (20-digit) and AVS (756.XXXX.XXXX.XX)
   - Creates prefilled forms with encrypted data
   - Sends form invitation emails to patients
   - Duplicate prevention (24-hour check)
   - Lock file for cron safety

5. **Security hardening**
   - `form-site/.htaccess` - security headers
   - `form-site/api/.htaccess` - blocks config.php, helpers.php, encryption.php
   - `form-site/cron/.htaccess` - blocks all web access
   - Root `.gitignore` for logs, .claude/, sample files

6. **New API endpoints for practitioners**
   - `decrypt-form.php` - Decrypt form for display
   - `get-pending-forms.php` - List forms awaiting processing
   - `get-patient-history.php` - Patient history by AVS/email
   - `mark-form-processed.php` - Mark form as processed
   - `match-patient.php` - Match form to existing patient

7. **Deployed to server**
   - Git pull on form.traveldoctor.ch
   - Installed `webklex/php-imap` via composer
   - Added IMAP settings to config.php

### Pending Tasks

1. **Deploy latest changes**
   ```bash
   cd /var/www/webroot/repo && git pull origin main
   cp -r /var/www/webroot/repo/form-site/* /var/www/webroot/ROOT/
   ```

2. **Test IMAP connection**
   - Run test-imap.php to verify connection to OneDoc folder
   - Check that emails are visible

3. **Set up cron job** in Jelastic dashboard:
   ```
   */3 * * * * php /var/www/webroot/ROOT/cron/process-onedoc-emails.php >> /var/www/webroot/ROOT/cron/logs/cron.log 2>&1
   ```

4. **Test complete OneDoc flow**
   - Mark all old OneDoc emails as read (to prevent processing)
   - Create a test OneDoc booking
   - Verify form is created with prefilled data
   - Verify patient receives invitation email
   - Verify patient can complete and submit form

5. **Fix 24-hour duplicate check**
   - Current check blocks multiple bookings for same email within 24h
   - Should use (email + appointment date) as duplicate key instead

6. **Integrate with Travel Doctor App**
   - Add UI to view pending forms
   - Add button to import form data into consultation

### Form Sources

| Source | Description |
|--------|-------------|
| `public` | Patient filled form via shared link |
| `onedoc` | Auto-created from OneDoc booking email |

### Server Environment

- **form.traveldoctor.ch**: Jelastic PHP 8.5.2, has `FORM_ENCRYPTION_KEY` env var
- **db.traveldoctor.ch**: PocketBase database
- **Email**: contact@traveldoctor.ch via Infomaniak (SMTP & IMAP on mail.infomaniak.com)
- **OneDoc emails**: Filtered to `OneDoc` IMAP folder
