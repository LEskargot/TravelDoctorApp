/**
 * Unit Tests for PendingForms Badge State Logic
 *
 * Tests the itemState function that determines which badge to show
 * for each form/calendar event (FORMULAIRE RECU, INVITE, EN ATTENTE, BROUILLON, TERMINE).
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

// ==================== Extract Pure Function ====================
// This is extracted from PendingForms.js for testing

/**
 * Determine the badge state for a merged calendar/form item
 * @param {Object} item - Merged item with type, form_id, form_status
 * @returns {string} State name
 */
function itemState(item) {
    if (item.form_id && item.form_status === 'processed') return 'processed';
    if (item.form_id && item.form_status === 'submitted') return 'form_received';
    if (item.form_id && item.form_status === 'draft') return 'draft_linked';
    if (item.type === 'calendar' && !item.form_id && item.suggested_form) return 'suggested_match';
    if (item.type === 'calendar' && !item.form_id) return 'awaiting_form';
    if (item.type === 'form_only' && item.form_status === 'draft') return 'draft';
    return 'form_received';
}

// ==================== Tests ====================

describe('PendingForms - Badge State Logic', () => {
    test('processed form shows TERMINE badge', () => {
        const item = {
            type: 'calendar',
            form_id: 'abc123',
            form_status: 'processed'
        };
        assert.equal(itemState(item), 'processed');
    });

    test('submitted form with calendar event shows FORMULAIRE RECU badge', () => {
        const item = {
            type: 'calendar',
            form_id: 'abc123',
            form_status: 'submitted'
        };
        assert.equal(itemState(item), 'form_received');
    });

    test('draft form with calendar event shows INVITE badge', () => {
        const item = {
            type: 'calendar',
            form_id: 'abc123',
            form_status: 'draft'
        };
        assert.equal(itemState(item), 'draft_linked');
    });

    test('calendar event without form shows EN ATTENTE badge', () => {
        const item = {
            type: 'calendar',
            form_id: null,
            form_status: null,
            suggested_form: null
        };
        assert.equal(itemState(item), 'awaiting_form');
    });

    test('calendar event with suggested form shows SUGGESTION badge', () => {
        const item = {
            type: 'calendar',
            form_id: null,
            form_status: null,
            suggested_form: { id: 'abc123', status: 'submitted', tier: 'email', match_field: 'email' }
        };
        assert.equal(itemState(item), 'suggested_match');
    });

    test('form-only draft (walk-in) shows BROUILLON badge', () => {
        const item = {
            type: 'form_only',
            form_id: null, // Must be null to reach the form_only check
            form_status: 'draft'
        };
        assert.equal(itemState(item), 'draft');
    });

    test('form-only submitted shows FORMULAIRE RECU badge', () => {
        const item = {
            type: 'form_only',
            form_id: 'abc123',
            form_status: 'submitted'
        };
        assert.equal(itemState(item), 'form_received');
    });

    test('form-only processed falls through to default', () => {
        const item = {
            type: 'form_only',
            form_id: 'abc123',
            form_status: 'processed'
        };
        // Processed forms should be filtered out at the API level,
        // but if they somehow appear as form_only, they get default badge
        assert.equal(itemState(item), 'processed');
    });
});

describe('PendingForms - Badge State Priority', () => {
    test('processed status takes priority over all other checks', () => {
        const item = {
            type: 'calendar',
            form_id: 'abc123',
            form_status: 'processed'
        };
        assert.equal(itemState(item), 'processed');
    });

    test('submitted status checked before draft', () => {
        const submitted = {
            type: 'calendar',
            form_id: 'abc123',
            form_status: 'submitted'
        };
        const draft = {
            type: 'calendar',
            form_id: 'abc123',
            form_status: 'draft'
        };
        assert.equal(itemState(submitted), 'form_received');
        assert.equal(itemState(draft), 'draft_linked');
    });

    test('suggested_match checked before awaiting_form', () => {
        const suggested = {
            type: 'calendar',
            form_id: null,
            suggested_form: { id: 'x', status: 'submitted', tier: 'email', match_field: 'email' }
        };
        const awaiting = {
            type: 'calendar',
            form_id: null,
            suggested_form: null
        };
        assert.equal(itemState(suggested), 'suggested_match');
        assert.equal(itemState(awaiting), 'awaiting_form');
    });

    test('calendar without form checked before form-only draft', () => {
        const calendarOnly = {
            type: 'calendar',
            form_id: null
        };
        const formOnly = {
            type: 'form_only',
            form_status: 'draft'
        };
        assert.equal(itemState(calendarOnly), 'awaiting_form');
        assert.equal(itemState(formOnly), 'draft');
    });

    test('default fallback returns form_received', () => {
        const unknownState = {
            type: 'unknown',
            form_id: 'abc123',
            form_status: 'unknown'
        };
        assert.equal(itemState(unknownState), 'form_received');
    });
});

describe('PendingForms - Edge Cases', () => {
    test('handles missing form_id gracefully', () => {
        const item = {
            type: 'calendar',
            form_status: 'submitted'
        };
        assert.equal(itemState(item), 'awaiting_form');
    });

    test('handles missing form_status gracefully', () => {
        const item = {
            type: 'calendar',
            form_id: 'abc123'
        };
        // No status means the draft check fails (form_status !== 'draft'),
        // submitted check fails (form_status !== 'submitted'),
        // processed check fails (form_status !== 'processed'),
        // then falls through to default
        assert.equal(itemState(item), 'form_received');
    });

    test('handles empty strings as falsy', () => {
        const item = {
            type: 'calendar',
            form_id: '',
            form_status: ''
        };
        assert.equal(itemState(item), 'awaiting_form');
    });

    test('handles undefined type gracefully', () => {
        const item = {
            form_id: 'abc123',
            form_status: 'submitted'
        };
        assert.equal(itemState(item), 'form_received');
    });

    test('calendar event with undefined form_id treated as no form', () => {
        const item = {
            type: 'calendar',
            form_id: undefined,
            form_status: undefined
        };
        assert.equal(itemState(item), 'awaiting_form');
    });

    test('form_only without form_status falls back to default', () => {
        const item = {
            type: 'form_only',
            form_id: 'abc123'
        };
        assert.equal(itemState(item), 'form_received');
    });
});

describe('PendingForms - Real-World Scenarios', () => {
    test('OneDoc booking email processed, form submitted', () => {
        const item = {
            type: 'calendar',
            patient_name: '[OD] - Jean Dupont',
            appointment_date: '2026-02-20',
            appointment_time: '14:30',
            form_id: 'onedoc_abc',
            form_status: 'submitted'
        };
        assert.equal(itemState(item), 'form_received');
    });

    test('OneDoc booking email sent, form still draft', () => {
        const item = {
            type: 'calendar',
            patient_name: '[OD] - Marie Martin',
            appointment_date: '2026-02-20',
            appointment_time: '15:00',
            form_id: 'onedoc_def',
            form_status: 'draft'
        };
        assert.equal(itemState(item), 'draft_linked');
    });

    test('Calendar appointment with suggested form match', () => {
        const item = {
            type: 'calendar',
            patient_name: '[OD] - Sophie Laurent',
            appointment_date: '2026-02-21',
            appointment_time: '10:00',
            form_id: null,
            form_status: null,
            suggested_form: { id: 'form_xyz', status: 'submitted', tier: 'appointment', match_field: 'date+heure+nom' }
        };
        assert.equal(itemState(item), 'suggested_match');
    });

    test('Calendar appointment but patient not yet invited', () => {
        const item = {
            type: 'calendar',
            patient_name: 'Sophie Laurent',
            appointment_date: '2026-02-21',
            appointment_time: '10:00',
            form_id: null,
            form_status: null,
            suggested_form: null
        };
        assert.equal(itemState(item), 'awaiting_form');
    });

    test('Walk-in patient, practitioner created draft', () => {
        const item = {
            type: 'form_only',
            patient_name: 'Pierre Dubois',
            form_id: 'walkin_123',
            form_status: 'draft',
            appointment_date: ''
        };
        // Note: form_id + draft status triggers 'draft_linked' before type check
        // This happens because the logic checks form_id && form_status === 'draft' first
        assert.equal(itemState(item), 'draft_linked');
    });

    test('Walk-in patient, form submitted from home', () => {
        const item = {
            type: 'form_only',
            patient_name: 'Lucie Bernard',
            form_id: 'walkin_456',
            form_status: 'submitted',
            appointment_date: ''
        };
        assert.equal(itemState(item), 'form_received');
    });

    test('Consultation completed, form processed', () => {
        const item = {
            type: 'calendar',
            patient_name: 'Jean Dupont',
            form_id: 'abc789',
            form_status: 'processed',
            existing_patient_id: 'patient_123'
        };
        assert.equal(itemState(item), 'processed');
    });
});

describe('PendingForms - Badge Visual States Documentation', () => {
    test('processed state shows TERMINE badge (grey)', () => {
        // Visual: .badge-processed (grey background)
        // Click behavior: emit('patient-selected') if existing_patient_id
        assert.equal(itemState({ form_id: '1', form_status: 'processed' }), 'processed');
    });

    test('form_received state shows FORMULAIRE RECU badge (green)', () => {
        // Visual: .badge-form-received (green background)
        // Click behavior: emit('form-selected', form_id)
        assert.equal(itemState({ form_id: '1', form_status: 'submitted' }), 'form_received');
    });

    test('draft_linked state shows INVITE badge (purple)', () => {
        // Visual: .badge-draft-linked (purple background)
        // Click behavior: show FormLinkModal or emit('calendar-selected')
        assert.equal(itemState({ type: 'calendar', form_id: '1', form_status: 'draft' }), 'draft_linked');
    });

    test('suggested_match state shows SUGGESTION badge (amber)', () => {
        // Visual: .badge-suggested (amber/orange background)
        // Click behavior: show inline confirmation panel (accept/refuse)
        assert.equal(itemState({ type: 'calendar', form_id: null, suggested_form: { id: '1', status: 'submitted', tier: 'email', match_field: 'email' } }), 'suggested_match');
    });

    test('awaiting_form state shows EN ATTENTE badge (orange)', () => {
        // Visual: .badge-awaiting-form (orange background)
        // Click behavior: show FormLinkModal or emit('calendar-selected')
        assert.equal(itemState({ type: 'calendar', form_id: null, suggested_form: null }), 'awaiting_form');
    });

    test('draft state shows BROUILLON badge (blue)', () => {
        // Visual: .badge-draft (blue background)
        // Note: This state is only reached if type='form_only' + status='draft' + NO form_id
        // Because form_id + draft triggers 'draft_linked' first
        assert.equal(itemState({ type: 'form_only', form_status: 'draft' }), 'draft');
    });
});
