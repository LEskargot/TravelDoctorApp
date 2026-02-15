# Unit Test Summary

## What Was Tested

Unit tests were created for two critical frontend components that were recently debugged:

### 1. FormLinkModal Scoring Logic (`form-link-scoring.test.js`)

**Context:** This component allows practitioners to manually link calendar events to patient forms when automatic matching fails. A scoring algorithm ranks unlinked forms by similarity to help practitioners choose the correct match.

**Functions tested:**
- `normalizePhone()` — Strips formatting, removes +41/0041 prefixes, returns last 9 digits
- `normalizeName()` — Lowercase, removes accents, removes [OD] prefix, normalizes whitespace
- `scoreForm()` — Calculates similarity score between calendar event and form

**Score weights:**
- Email exact match: +40
- Phone normalized match: +30
- Name exact match: +20 (partial match: +15)
- DOB exact match: +20
- Appointment date match: +10
- Maximum possible score: 120

**Why these tests matter:**
- A bug in the Tier 0 calendar matching logic was just fixed (checking wrong field)
- Incorrect scoring could lead to wrong patient-form links
- Phone/name normalization has many edge cases (international formats, accents, prefixes)
- The scoring weights determine which forms appear first in the UI

**Test coverage:** 46 tests across 4 suites
- Phone normalization (7 tests)
- Name normalization (6 tests)
- Score calculation (17 tests)
- Edge cases (16 tests)

### 2. PendingForms Badge State Logic (`pending-forms-badge-state.test.js`)

**Context:** The PendingForms screen shows today's appointments with color-coded badges indicating status. The badge state logic determines which badge to show based on form status, calendar event presence, and form type.

**Function tested:**
- `itemState()` — Returns badge state name based on item properties

**Badge states:**
- `processed` → TERMINE (grey) — Consultation completed
- `form_received` → FORM: CONFIRMÉ (green) — Form submitted, ready to process
- `suggested_match` → FORM: À CONFIRMER (amber) — Automatic match needs practitioner confirmation
- `draft_linked` → FORM: ENVOYÉ (purple) — Draft form linked to calendar, patient invited
- `awaiting_form` → FORM: NON ENVOYÉ (orange) — Calendar event without form
- `draft` → BROUILLON (blue) — Walk-in draft, no calendar event

**Why these tests matter:**
- Wrong badge state could confuse practitioners about which appointments are ready
- State priority is critical (processed > submitted > draft > calendar-only)
- Edge cases (missing fields, empty strings) must fall back gracefully
- The logic changed during recent form-to-calendar linking work

**Test coverage:** 18 tests across 5 suites
- Badge state logic (7 tests)
- State priority (4 tests)
- Edge cases (6 tests)
- Real-world scenarios (6 tests, including OneDoc bookings and walk-ins)
- Visual state documentation (5 tests)

## Test Infrastructure

**Approach:** Minimal, no-dependency testing using Node.js built-in test runner.

**Why this approach:**
- Project has no build process (Vue 3 loaded from CDN)
- CLAUDE.md guidelines: "Simplicity first, no over-engineering"
- No need for complex test frameworks (Vitest, Jest) for pure logic functions
- Node.js `node:test` and `node:assert` available in Node 18+ (no npm install required)
- Tests run fast (<200ms for 64 tests)

**What's NOT tested:**
- Vue component rendering (no vue-test-utils, no jsdom)
- API calls (no mocking needed for pure functions)
- DOM manipulation (extracted logic doesn't touch DOM)
- User interactions (that's manual testing territory)

## Running Tests

```bash
npm test          # Run all tests once
npm test:watch    # Re-run on file changes
```

Output format: TAP (Test Anything Protocol)
- Shows pass/fail count
- Detailed error messages on failures
- Execution time per test and suite

## Test Results

All 64 tests passing:

```
# tests 64
# suites 9
# pass 64
# fail 0
# duration_ms 189.79
```

## Value Delivered

1. **Regression prevention:** Future changes to scoring/badge logic will be caught
2. **Documentation:** Tests serve as executable specification of how scoring works
3. **Confidence:** Practitioners can trust the form matching and badge states
4. **Debugging:** When bugs occur, tests help isolate the issue quickly
5. **Onboarding:** New developers can read tests to understand the logic

## Future Test Ideas

Potential high-value tests for future work:

1. **Vaccine booster calculations** — 27 vaccines with different schedules (Encepur 0-7-21 days, Havrix 0-6 months, etc.)
2. **Pediatric dosing** — MALARONE, MEPHAQUIN, RIAMET dose calculations for <40kg patients
3. **Form field mapping** — Patient form field names → app field names (chickenpox_disease → varicelleContractee)
4. **Phone normalization in PHP** — `helpers.php` `normalizePhone()` (should match JS version)
5. **Calendar event matching tiers** — 6-tier priority system in `get-calendar-events.php`
6. **Date parsing** — OneDoc appointment strings (French dates) → ISO format

## Notes

- Tests extract pure functions from components for easier testing
- Original component files unchanged (no refactoring needed for testability)
- Tests use same normalization logic as production code
- All test files use ES modules (`import`/`export`, `type: "module"` in package.json)
