# Travel Doctor App - Unit Tests

This directory contains unit tests for the Travel Doctor App frontend logic.

## Setup

No dependencies to install. The tests use Node.js built-in test runner (available in Node 18+).

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode (re-runs on file changes)
npm test:watch
```

## Test Files

### `form-link-scoring.test.js`
Tests the FormLinkModal component's scoring algorithm that ranks unlinked forms against calendar events.

**What's tested:**
- Phone normalization (removes +41/0041 prefix, strips formatting, returns last 9 digits)
- Name normalization (lowercase, removes accents, removes [OD] prefix, trims whitespace)
- Score calculation (email +40, phone +30, name +20/+15, DOB +20, appointment date +10)
- Edge cases (long names, various phone formats, empty/null values)

**Coverage:** 46 tests

### `pending-forms-badge-state.test.js`
Tests the PendingForms component's badge state logic that determines which visual badge to show.

**What's tested:**
- Badge states: TERMINE (processed), FORM: CONFIRMÉ (submitted), FORM: ENVOYÉ (draft linked to calendar), FORM: NON ENVOYÉ (calendar without form), FORM: À CONFIRMER (suggested match), BROUILLON (walk-in draft)
- State priority (processed > submitted > draft > calendar-only > form-only)
- Edge cases (missing fields, empty strings, undefined values)
- Real-world scenarios (OneDoc bookings, walk-ins, completed consultations)

**Coverage:** 18 tests

## Test Output

Tests use the TAP (Test Anything Protocol) format. Output shows:
- ✓ Pass count
- ✗ Fail count with detailed error messages
- Duration in milliseconds

Example:
```
# tests 64
# suites 9
# pass 64
# fail 0
# duration_ms 189.79
```

## Why These Tests?

These tests were created after fixing a bug in the form-to-calendar linking logic (Tier 0 matching). The bug was subtle and would have been caught by unit tests. These tests focus on:

1. **Pure logic functions** - Easy to test, high value
2. **Real bugs** - Tests verify the actual scoring and badge logic that had issues
3. **No dependencies** - Uses Node.js built-in test runner (simplicity first)

## Architecture Notes

The tests extract pure functions from Vue components for testing. The actual component files use Vue 3 global build (loaded from CDN), which makes them harder to test directly. This approach:

- Tests the business logic (scoring, state determination)
- Avoids complex Vue component testing setup
- Keeps tests fast and simple
- Matches the project's "no build process" philosophy

## Future Test Coverage

Potential areas for future tests:
- Date calculations for vaccine boosters (27 vaccines with different schedules)
- Prescription dosing calculations (pediatric dosing for <40kg patients)
- Patient form data mapping (form field names → app field names)
- Phone/name normalization used in PHP API (helpers.php)
- Calendar event matching tiers (6-tier priority system)

## Notes

- Tests are written for Node.js, not browser environment
- No Vue Test Utils or jsdom required
- No test framework installation needed (uses Node.js built-in `node:test`)
- Tests run in parallel by default (fast)
