/**
 * Export helper utilities
 * JSON backup download, XLSX lot parsing
 */
import { parseExcelDate } from './formatting.js';

/**
 * Download data as a JSON backup file
 */
export function downloadJson(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
}

/**
 * Generate a backup filename from patient name and DOB
 */
export function makeBackupFilename(patientName, dob) {
    const parts = patientName.split(' ');
    const lastName = (parts[0] || 'Patient').toLowerCase();
    const firstName = (parts.slice(1).join('') || '').toLowerCase();
    const dobStr = dob ? dob.split('-').reverse().join('-') : 'XX-XX-XXXX';
    return `${lastName}_${firstName}_${dobStr}.json`;
}

/**
 * Parse an XLSX vaccine lots file
 * Returns array of { vaccine, lot, expiration }
 */
export function parseVaccineLotsXlsx(arrayBuffer) {
    const data = new Uint8Array(arrayBuffer);
    const workbook = XLSX.read(data, { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    const header = jsonData[0].map(h => h ? h.toString().toLowerCase().trim() : '');
    const vaccineCol = header.findIndex(h => h.includes('vaccin'));
    const lotCol = header.findIndex(h => h.includes('lot'));
    const expCol = header.findIndex(h => h.includes('expir') || h.includes('exp'));

    if (vaccineCol === -1 || lotCol === -1) {
        throw new Error('Colonnes "vaccin" et "lot" requises');
    }

    const lots = [];
    for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (row[vaccineCol] && row[lotCol]) {
            lots.push({
                vaccine: row[vaccineCol].toString().trim(),
                lot: row[lotCol].toString().trim(),
                expiration: expCol !== -1 && row[expCol] ? parseExcelDate(row[expCol]) : null
            });
        }
    }
    return lots;
}
