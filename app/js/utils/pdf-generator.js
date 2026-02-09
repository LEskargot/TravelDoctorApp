/**
 * PDF generation utilities
 * Generates prescription PDFs using jsPDF
 * Extracted from original app (lines 3684-3775)
 */
import { formatDateDisplay } from './formatting.js';

export function generatePrescriptionPdf({ patientName, patientDob, patientAddress, medications, date, pageFormat, practitionerName }) {
    if (!patientName || medications.length === 0) return null;

    let displayDob = patientDob;
    if (patientDob && patientDob.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const d = new Date(patientDob);
        const months = ['janvier', 'fevrier', 'mars', 'avril', 'mai', 'juin',
                        'juillet', 'aout', 'septembre', 'octobre', 'novembre', 'decembre'];
        displayDob = `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
    }

    const formattedDate = formatDateDisplay(date);
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: pageFormat });

    const isA5 = pageFormat === 'a5';
    const leftMargin = isA5 ? 10 : 20;
    const maxWidth = isA5 ? 128 : 170;
    const maxHeight = isA5 ? 190 : 270;
    const headerFontSize = isA5 ? 10 : 12;
    const normalFontSize = isA5 ? 8 : 10;
    const smallFontSize = isA5 ? 7 : 9;
    const lineSpacing = isA5 ? 3.5 : 4;
    const sectionSpacing = isA5 ? 4 : 5;

    let y = isA5 ? 12 : 20;

    // Practitioner header
    doc.setFontSize(headerFontSize);
    doc.setFont('helvetica', 'bold');
    doc.text(practitionerName, leftMargin, y);
    y += sectionSpacing;

    doc.setFontSize(smallFontSize);
    doc.setFont('helvetica', 'normal');
    doc.text('Specialiste en Medecine Interne et Infectiologie, FMH', leftMargin, y); y += lineSpacing;
    doc.text('Diplome en Medecine Tropicale et Hygiene', leftMargin, y); y += lineSpacing;
    doc.text('Certificat en Medecine des Voyages', leftMargin, y); y += lineSpacing;
    doc.text("Route de l'Intyamon 113, 1635 La Tour-de-Treme", leftMargin, y); y += lineSpacing;
    doc.text('Rue du Valentin 32, 1004 Lausanne', leftMargin, y); y += lineSpacing;
    doc.text('ludovico.cobuccio@hin.ch', leftMargin, y); y += lineSpacing;
    doc.text('www.traveldoctor.ch', leftMargin, y); y += lineSpacing;
    doc.text('RCC: Q256210 | A208033 – GLN: 7601003432244', leftMargin, y);
    y += sectionSpacing * 2;

    // Patient info
    doc.setFontSize(normalFontSize);
    doc.setFont('helvetica', 'bold');
    doc.text(displayDob ? `${patientName}, ${displayDob}` : patientName, leftMargin, y);
    y += sectionSpacing;

    doc.setFont('helvetica', 'normal');
    if (patientAddress) {
        patientAddress.split('\n').forEach(line => { doc.text(line, leftMargin, y); y += lineSpacing; });
    }
    y += sectionSpacing;

    // Date
    doc.text(formattedDate, leftMargin, y);
    y += sectionSpacing * 2;

    // Rp.
    doc.setFont('helvetica', 'bolditalic');
    doc.text('Rp.', leftMargin, y);
    y += sectionSpacing + 2;

    // Medications
    doc.setFont('helvetica', 'normal');
    medications.forEach(med => {
        if (y > maxHeight - 20) { doc.addPage(); y = isA5 ? 12 : 20; }
        doc.setFontSize(normalFontSize);
        doc.setFont('helvetica', 'bold');
        doc.text(med.name, leftMargin, y);
        y += sectionSpacing;
        doc.setFontSize(smallFontSize);
        doc.setFont('helvetica', 'normal');
        doc.splitTextToSize(med.dosing, maxWidth).forEach(line => {
            if (y > maxHeight) { doc.addPage(); y = isA5 ? 12 : 20; }
            doc.text(line, leftMargin, y);
            y += lineSpacing;
        });
        y += sectionSpacing;
    });

    return doc;
}
