/**
 * Unit Tests for FormLinkModal Scoring Logic
 *
 * Tests the similarity scoring algorithm that ranks unlinked forms
 * against calendar events for manual linking.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

// ==================== Extract Pure Functions ====================
// These are extracted from FormLinkModal.js for testing

/**
 * Normalize name: lowercase, remove accents, remove [OD] prefix, trim whitespace
 */
function normalizeName(str) {
    if (!str) return '';
    return str.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/\[od\]\s*-?\s*/i, '')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Normalize phone: strip non-digits, remove +41/0041/leading 0, last 9 digits
 */
function normalizePhone(phone) {
    if (!phone) return '';
    let digits = phone.replace(/\D/g, '');
    if (digits.startsWith('0041')) digits = digits.slice(4);
    else if (digits.startsWith('41') && digits.length > 10) digits = digits.slice(2);
    else if (digits.startsWith('0')) digits = digits.slice(1);
    return digits.slice(-9);
}

/**
 * Score a form against a calendar event
 * Returns score (0-120) based on matching fields
 */
function scoreForm(calendarEvent, form) {
    const evtEmail = (calendarEvent.email || '').toLowerCase().trim();
    const evtPhone = normalizePhone(calendarEvent.phone || '');
    const evtName = normalizeName(calendarEvent.patient_name || '');
    const evtDob = calendarEvent.dob || '';
    const evtDate = calendarEvent.appointment_date || '';

    let score = 0;

    // Email exact match: +40
    const formEmail = (form.email || '').toLowerCase().trim();
    if (evtEmail && formEmail && evtEmail === formEmail) score += 40;

    // Phone match (normalized): +30
    const formPhone = normalizePhone(form.phone || '');
    if (evtPhone && formPhone && evtPhone === formPhone) score += 30;

    // Name similarity: +20 (exact), +15 (partial)
    const formName = normalizeName(form.patient_name || '');
    if (evtName && formName) {
        if (evtName === formName) {
            score += 20;
        } else if (evtName.includes(formName) || formName.includes(evtName)) {
            score += 15;
        }
    }

    // DOB exact match: +20
    if (evtDob && form.dob && evtDob === form.dob) score += 20;

    // Appointment date match: +10
    if (evtDate && form.appointment_date && evtDate === form.appointment_date) score += 10;

    return score;
}

// ==================== Tests ====================

describe('FormLinkModal - Phone Normalization', () => {
    test('removes +41 prefix', () => {
        assert.equal(normalizePhone('+41 79 123 45 67'), '791234567');
    });

    test('removes 0041 prefix', () => {
        assert.equal(normalizePhone('0041 79 123 45 67'), '791234567');
    });

    test('removes leading 0', () => {
        assert.equal(normalizePhone('079 123 45 67'), '791234567');
    });

    test('strips all non-digit characters', () => {
        assert.equal(normalizePhone('+41 (79) 123-45-67'), '791234567');
    });

    test('returns last 9 digits', () => {
        assert.equal(normalizePhone('41791234567'), '791234567');
    });

    test('handles empty/null input', () => {
        assert.equal(normalizePhone(''), '');
        assert.equal(normalizePhone(null), '');
        assert.equal(normalizePhone(undefined), '');
    });

    test('handles short numbers', () => {
        assert.equal(normalizePhone('1234'), '1234');
    });
});

describe('FormLinkModal - Name Normalization', () => {
    test('converts to lowercase', () => {
        assert.equal(normalizeName('Jean DUPONT'), 'jean dupont');
    });

    test('removes accents', () => {
        assert.equal(normalizeName('François Müller'), 'francois muller');
    });

    test('removes [OD] prefix (case insensitive)', () => {
        assert.equal(normalizeName('[OD] - Marie Martin'), 'marie martin');
        assert.equal(normalizeName('[od] Sophie Laurent'), 'sophie laurent');
        assert.equal(normalizeName('[Od]-Pierre Dubois'), 'pierre dubois');
    });

    test('normalizes whitespace', () => {
        assert.equal(normalizeName('  Jean   Dupont  '), 'jean dupont');
    });

    test('handles empty/null input', () => {
        assert.equal(normalizeName(''), '');
        assert.equal(normalizeName(null), '');
        assert.equal(normalizeName(undefined), '');
    });

    test('handles combined transformations', () => {
        assert.equal(
            normalizeName('[OD] - François  Müller  '),
            'francois muller'
        );
    });
});

describe('FormLinkModal - Score Calculation', () => {
    test('perfect match scores 120 (all fields)', () => {
        const event = {
            email: 'jean.dupont@example.com',
            phone: '+41 79 123 45 67',
            patient_name: 'Jean Dupont',
            dob: '1985-03-15',
            appointment_date: '2026-02-20'
        };
        const form = {
            email: 'jean.dupont@example.com',
            phone: '079 123 45 67',
            patient_name: 'Jean Dupont',
            dob: '1985-03-15',
            appointment_date: '2026-02-20'
        };
        assert.equal(scoreForm(event, form), 120);
    });

    test('email match only scores 40', () => {
        const event = { email: 'test@example.com' };
        const form = { email: 'test@example.com' };
        assert.equal(scoreForm(event, form), 40);
    });

    test('email is case-insensitive', () => {
        const event = { email: 'Test@Example.COM' };
        const form = { email: 'test@example.com' };
        assert.equal(scoreForm(event, form), 40);
    });

    test('phone match only scores 30', () => {
        const event = { phone: '+41 79 123 45 67' };
        const form = { phone: '079 123 45 67' };
        assert.equal(scoreForm(event, form), 30);
    });

    test('exact name match scores 20', () => {
        const event = { patient_name: 'Marie Martin' };
        const form = { patient_name: 'Marie Martin' };
        assert.equal(scoreForm(event, form), 20);
    });

    test('name match is case-insensitive', () => {
        const event = { patient_name: 'MARIE MARTIN' };
        const form = { patient_name: 'marie martin' };
        assert.equal(scoreForm(event, form), 20);
    });

    test('name match ignores accents', () => {
        const event = { patient_name: 'François Müller' };
        const form = { patient_name: 'Francois Muller' };
        assert.equal(scoreForm(event, form), 20);
    });

    test('name match ignores [OD] prefix', () => {
        const event = { patient_name: '[OD] - Marie Martin' };
        const form = { patient_name: 'Marie Martin' };
        assert.equal(scoreForm(event, form), 20);
    });

    test('partial name match scores 15', () => {
        const event = { patient_name: 'Jean-Pierre Dupont' };
        const form = { patient_name: 'Jean-Pierre' };
        assert.equal(scoreForm(event, form), 15);
    });

    test('partial name match (reverse) scores 15', () => {
        const event = { patient_name: 'Marie' };
        const form = { patient_name: 'Marie Martin' };
        assert.equal(scoreForm(event, form), 15);
    });

    test('DOB match only scores 20', () => {
        const event = { dob: '1990-05-20' };
        const form = { dob: '1990-05-20' };
        assert.equal(scoreForm(event, form), 20);
    });

    test('appointment date match only scores 10', () => {
        const event = { appointment_date: '2026-02-20' };
        const form = { appointment_date: '2026-02-20' };
        assert.equal(scoreForm(event, form), 10);
    });

    test('no match scores 0', () => {
        const event = {
            email: 'jean@example.com',
            phone: '+41 79 111 11 11',
            patient_name: 'Jean Dupont',
            dob: '1985-03-15'
        };
        const form = {
            email: 'marie@example.com',
            phone: '+41 79 222 22 22',
            patient_name: 'Marie Martin',
            dob: '1990-05-20'
        };
        assert.equal(scoreForm(event, form), 0);
    });

    test('combines multiple matches correctly', () => {
        const event = {
            email: 'test@example.com',
            patient_name: 'Jean Dupont',
            dob: '1985-03-15'
        };
        const form = {
            email: 'test@example.com',
            patient_name: 'Jean Dupont',
            dob: '1985-03-15'
        };
        assert.equal(scoreForm(event, form), 80); // 40 + 20 + 20
    });

    test('empty fields are ignored', () => {
        const event = { email: '', phone: '', patient_name: '' };
        const form = { email: 'test@example.com', phone: '079 123 45 67' };
        assert.equal(scoreForm(event, form), 0);
    });

    test('handles missing fields gracefully', () => {
        const event = {};
        const form = { email: 'test@example.com' };
        assert.equal(scoreForm(event, form), 0);
    });

    test('whitespace-only strings treated as empty', () => {
        const event = { email: '   ', patient_name: '  ' };
        const form = { email: 'test@example.com', patient_name: 'Jean' };
        assert.equal(scoreForm(event, form), 0);
    });
});

describe('FormLinkModal - Edge Cases', () => {
    test('handles very long names', () => {
        const longName = 'A'.repeat(200);
        const event = { patient_name: longName };
        const form = { patient_name: longName };
        assert.equal(scoreForm(event, form), 20);
    });

    test('handles phone numbers with many leading zeros', () => {
        assert.equal(normalizePhone('00041791234567'), '791234567');
    });

    test('handles international phone formats', () => {
        assert.equal(normalizePhone('+41 79 123 45 67'), '791234567');
        assert.equal(normalizePhone('0041791234567'), '791234567');
    });

    test('partial name match requires substring', () => {
        const event = { patient_name: 'Jean-Pierre Dupont' };
        const form = { patient_name: 'Dupont' }; // Substring match
        assert.equal(scoreForm(event, form), 15);
    });

    test('date format must be exact (YYYY-MM-DD)', () => {
        const event = { dob: '1985-03-15' };
        const form = { dob: '15.03.1985' }; // Different format
        assert.equal(scoreForm(event, form), 0);
    });

    test('phone normalization handles edge cases', () => {
        // All these should normalize to the same value
        const variants = [
            '+41791234567',
            '0041791234567',
            '079 123 45 67',
            '079-123-45-67',
            '+41 (79) 123 45 67'
        ];
        const normalized = variants.map(normalizePhone);
        assert.ok(normalized.every(n => n === '791234567'));
    });
});
