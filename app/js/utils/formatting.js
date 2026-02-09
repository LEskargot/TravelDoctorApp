/**
 * Formatting utility functions
 * Extracted from original app (lines 3016-3054, 3128-3284)
 */

export function formatDateSwiss(date) {
    if (!date || isNaN(date.getTime())) return '';
    return `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()}`;
}

export function formatDateDisplay(isoDate) {
    if (!isoDate) return '-';
    const parts = isoDate.split('-');
    if (parts.length === 3) return `${parts[2]}.${parts[1]}.${parts[0]}`;
    return isoDate;
}

export function formatDateLong(isoDate) {
    if (!isoDate) return '-';
    const d = new Date(isoDate);
    const months = ['janvier', 'fevrier', 'mars', 'avril', 'mai', 'juin',
                    'juillet', 'aout', 'septembre', 'octobre', 'novembre', 'decembre'];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatBoolean(value) {
    if (value === true) return 'Oui';
    if (value === false) return 'Non';
    if (value === 'unknown') return 'Ne sait pas';
    return '-';
}

export function formatArray(value, labelMap) {
    if (!value || value.length === 0) return '-';
    if (labelMap) return value.map(v => labelMap[v] || v).join(', ');
    return value.join(', ');
}

export function calculateAge(dob) {
    if (!dob) return null;
    const d = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - d.getFullYear();
    const m = today.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
    return age;
}

export function formatAvsInput(value) {
    // Auto-format AVS: 756.XXXX.XXXX.XX
    const digits = value.replace(/\D/g, '');
    let formatted = '';
    for (let i = 0; i < digits.length && i < 13; i++) {
        if (i === 3 || i === 7 || i === 11) formatted += '.';
        formatted += digits[i];
    }
    return formatted;
}

export function parseExcelDate(value) {
    if (typeof value === 'number') {
        const date = new Date((value - 25569) * 86400 * 1000);
        return date.toISOString().split('T')[0];
    }
    if (typeof value === 'string') {
        const match = value.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
        if (match) return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
        const isoMatch = value.match(/(\d{4})-(\d{2})-(\d{2})/);
        if (isoMatch) return value;
    }
    return null;
}
