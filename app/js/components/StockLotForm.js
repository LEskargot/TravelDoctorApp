/**
 * Stock Lot Form Component
 *
 * Modal form for adding/editing a vaccine lot.
 * Features:
 * - Vaccine autocomplete from VACCINE_SCHEDULES keys
 * - Optional PDF delivery note parsing to pre-populate fields
 * - Multi-lot review mode when PDF detects multiple vaccines
 */
import { VACCINE_SCHEDULES } from '../data/vaccine-schedules.js';
import { parseDeliveryNote } from '../api/secure-api.js';

const ALL_VACCINES = Object.keys(VACCINE_SCHEDULES).sort();

/**
 * Map delivery note product names to VACCINE_SCHEDULES keys.
 * More specific patterns first to avoid partial matches.
 */
const VACCINE_ALIASES = [
    // Multi-word / qualified patterns first
    { pattern: /BOOSTRIX\s+POLIO/i, key: 'Boostrix polio' },
    { pattern: /ADACEL\s+POLIO/i, key: 'Adacel Polio' },
    { pattern: /FSME[\s\-]*IMMUN\s+JUNIOR/i, key: 'FSME-Immun Junior' },
    { pattern: /FSME[\s\-]*IMMUN/i, key: 'FSME-Immun CC' },
    { pattern: /ENCEPUR\s+(?:ENFANTS?|CHILD(?:REN)?|KINDER|JUNIOR)/i, key: 'Encepur enfants' },
    { pattern: /ENCEPUR/i, key: 'Encepur adultes' },
    { pattern: /TWINRIX\s*(?:AD(?:ULTE)?[\s\/]*)?720/i, key: 'Twinrix 720/20' },
    { pattern: /ENGERIX\s*B[\s\-]*20/i, key: 'Engerix B-20' },
    { pattern: /HAVRIX\s*1440/i, key: 'Havrix 1440' },
    { pattern: /HAVRIX\s*720/i, key: 'Havrix 720' },
    { pattern: /IPV[\s\-]*POLIO/i, key: 'IPV Polio' },
    { pattern: /VAXIGRIP\s*TETRA/i, key: 'VaxigripTetra' },
    { pattern: /VI\s*VOTI\s*F/i, key: 'Vivotif' },
    // Single-word patterns (after multi-word to avoid premature matching)
    { pattern: /VIVOTIF/i, key: 'Vivotif' },
    { pattern: /ADACEL/i, key: 'Adacel' },
    { pattern: /BOOSTRIX/i, key: 'Boostrix' },
    { pattern: /COMIRNATY/i, key: 'Comirnaty' },
    { pattern: /EFLUELDA/i, key: 'Efluelda' },
    { pattern: /IXIARO/i, key: 'Ixiaro' },
    { pattern: /MENVEO/i, key: 'Menveo' },
    { pattern: /PRIORIX/i, key: 'Priorix' },
    { pattern: /QDENGA/i, key: 'Qdenga' },
    { pattern: /RABIPUR/i, key: 'Rabipur' },
    { pattern: /REVAXIS/i, key: 'Revaxis' },
    { pattern: /SHINGRIX/i, key: 'Shingrix' },
    { pattern: /STAMARIL/i, key: 'Stamaril' },
    { pattern: /TYPHIM/i, key: 'Typhim' },
    { pattern: /VARILRIX/i, key: 'Varilrix' },
];

export default {
    name: 'StockLotForm',

    props: {
        visible: { type: Boolean, default: false },
        editLot: { type: Object, default: null } // null = add mode, object = edit mode
    },

    emits: ['close', 'save', 'save-batch'],

    setup(props, { emit }) {
        const vaccine = Vue.ref('');
        const lot = Vue.ref('');
        const expiration = Vue.ref('');
        const quantity = Vue.ref(0);
        const vaccineSearch = Vue.ref('');
        const showVaccineDropdown = Vue.ref(false);
        const vaccineInput = Vue.ref(null);

        // PDF parsing state
        const pdfParsing = Vue.ref(false);
        const pdfProgress = Vue.ref(''); // progress message during OCR
        const pdfError = Vue.ref('');
        const detectedLots = Vue.ref([]); // multi-lot from PDF
        const showMultiLot = Vue.ref(false);
        const pdfPreviewUrl = Vue.ref(''); // blob URL for document preview
        const previewIsImage = Vue.ref(false);

        const isEditMode = Vue.computed(() => !!props.editLot);

        // Filter vaccines for autocomplete
        const filteredVaccines = Vue.computed(() => {
            const q = vaccineSearch.value.toLowerCase().trim();
            if (!q) return ALL_VACCINES;
            return ALL_VACCINES.filter(v => v.toLowerCase().includes(q));
        });

        // Reset form when modal opens
        Vue.watch(() => props.visible, (v) => {
            if (v) {
                pdfError.value = '';
                detectedLots.value = [];
                showMultiLot.value = false;
                if (pdfPreviewUrl.value) {
                    URL.revokeObjectURL(pdfPreviewUrl.value);
                    pdfPreviewUrl.value = '';
                }

                if (props.editLot) {
                    vaccine.value = props.editLot.vaccine;
                    lot.value = props.editLot.lot;
                    expiration.value = props.editLot.expiration
                        ? new Date(props.editLot.expiration).toISOString().split('T')[0]
                        : '';
                    quantity.value = props.editLot.quantity || 0;
                    vaccineSearch.value = props.editLot.vaccine;
                } else {
                    vaccine.value = '';
                    lot.value = '';
                    expiration.value = '';
                    quantity.value = 0;
                    vaccineSearch.value = '';
                }
                showVaccineDropdown.value = false;
            }
        });

        // ==================== Vaccine autocomplete ====================

        function onVaccineInput() {
            showVaccineDropdown.value = true;
            vaccine.value = ''; // clear until user selects
        }

        function selectVaccine(name) {
            vaccine.value = name;
            vaccineSearch.value = name;
            showVaccineDropdown.value = false;
        }

        function onVaccineBlur() {
            // Small delay to allow click on dropdown items
            setTimeout(() => {
                showVaccineDropdown.value = false;
                // Auto-match if typed text matches exactly
                const match = ALL_VACCINES.find(v => v.toLowerCase() === vaccineSearch.value.toLowerCase());
                if (match) {
                    vaccine.value = match;
                    vaccineSearch.value = match;
                }
            }, 200);
        }

        // ==================== Form submit ====================

        function onSave() {
            if (!vaccine.value || !lot.value || quantity.value < 0) return;

            emit('save', {
                id: props.editLot?.id || null,
                vaccine: vaccine.value,
                lot: lot.value,
                expiration: expiration.value || null,
                quantity: Number(quantity.value)
            });
        }

        // ==================== Document Parsing (PDF or image) ====================

        /**
         * Shared handler: parse a file (PDF or image) for vaccine lots.
         * For PDFs: tries AI first, falls back to local PDF.js/Tesseract/regex.
         * For images: AI only (no local fallback).
         */
        async function parseFile(file, fieldName = 'pdf') {
            pdfError.value = '';
            pdfProgress.value = '';
            pdfParsing.value = true;
            detectedLots.value = [];

            // Create preview URL
            if (pdfPreviewUrl.value) URL.revokeObjectURL(pdfPreviewUrl.value);
            const isImage = file.type.startsWith('image/');
            previewIsImage.value = isImage;
            pdfPreviewUrl.value = URL.createObjectURL(file);
            let lots = [];

            // Step 1: Try AI parsing (Claude API via PHP)
            try {
                pdfProgress.value = 'Analyse intelligente du document...';
                const result = await parseDeliveryNote(file, fieldName);
                lots = result.lots || [];
                console.log(`[Stock] AI parsed lots (mode: ${result.mode || 'unknown'}):`, lots);

                // If AI returned 0 lots and it's a PDF, try local parsing
                if (lots.length === 0 && !isImage) {
                    console.log('[Stock] AI returned 0 lots, trying local parsing');
                    lots = await localParsePdf(file);
                }
            } catch (aiError) {
                console.warn('[Stock] AI parsing failed:', aiError.message);
                if (!isImage) {
                    // Fallback to local parsing for PDFs only
                    try {
                        lots = await localParsePdf(file);
                    } catch (localError) {
                        console.error('[Stock] Local parsing also failed:', localError);
                    }
                }
            }

            // Handle results
            if (lots.length === 0) {
                pdfError.value = 'Aucun vaccin reconnu dans ce document.';
            } else if (lots.length === 1) {
                vaccine.value = lots[0].vaccine;
                vaccineSearch.value = lots[0].vaccine;
                lot.value = lots[0].lot || '';
                expiration.value = lots[0].expiration || '';
                quantity.value = lots[0].quantity || 0;
            } else {
                detectedLots.value = lots.map(l => ({ ...l, selected: true }));
                showMultiLot.value = true;
            }

            pdfParsing.value = false;
            pdfProgress.value = '';
        }

        function onPdfUpload(event) {
            const file = event.target.files?.[0];
            if (!file) return;
            parseFile(file, 'pdf');
            event.target.value = '';
        }

        function onCameraCapture(event) {
            const file = event.target.files?.[0];
            if (!file) return;
            parseFile(file, 'image');
            event.target.value = '';
        }

        /**
         * Local PDF parsing fallback: PDF.js text extraction + Tesseract OCR + regex matching.
         */
        async function localParsePdf(file) {
            pdfProgress.value = 'Analyse locale du document...';
            const arrayBuffer = await file.arrayBuffer();
            const text = await extractPdfText(arrayBuffer);
            console.log('[Stock PDF] Extracted text (' + text.length + ' chars):\n', text);
            const lots = matchVaccinesInText(text);
            console.log('[Stock PDF] Local matched lots:', lots);
            return lots;
        }

        /**
         * Build proper line-separated text from PDF.js text items.
         * Groups items by y-coordinate to avoid column interleaving.
         */
        function buildLinesFromTextItems(items) {
            if (!items || items.length === 0) return '';

            // Group text items by approximate y-coordinate (tolerance 3 units)
            const rows = [];
            for (const item of items) {
                if (!item.str) continue;
                const x = item.transform[4];
                const y = item.transform[5];

                let placed = false;
                for (const row of rows) {
                    if (Math.abs(row.y - y) <= 3) {
                        row.items.push({ x, text: item.str });
                        placed = true;
                        break;
                    }
                }
                if (!placed) {
                    rows.push({ y, items: [{ x, text: item.str }] });
                }
            }

            // Sort rows top-to-bottom (descending y in PDF coordinate system)
            rows.sort((a, b) => b.y - a.y);

            // Sort items left-to-right within each row, join with spaces
            return rows.map(row => {
                row.items.sort((a, b) => a.x - b.x);
                return row.items.map(i => i.text).join(' ');
            }).join('\n');
        }

        /**
         * Extract text from PDF: try embedded text first (PDF.js),
         * fall back to OCR (Tesseract.js) if text is too sparse.
         */
        async function extractPdfText(arrayBuffer) {
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

            // Step 1: Try embedded text extraction
            pdfProgress.value = 'Extraction du texte...';
            let fullText = '';
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const content = await page.getTextContent();
                fullText += buildLinesFromTextItems(content.items) + '\n';
            }

            // If we got enough text, use it directly
            const strippedText = fullText.replace(/\s+/g, '');
            console.log('[Stock PDF] Embedded text length:', strippedText.length, '(threshold: 50)');
            if (strippedText.length > 50) {
                console.log('[Stock PDF] Using embedded text');
                return fullText;
            }

            // Step 2: Fall back to OCR — render pages to canvas, then Tesseract
            console.log('[Stock PDF] Too little embedded text, falling back to OCR');
            pdfProgress.value = 'Document scanne detecte, lancement OCR...';

            const worker = await Tesseract.createWorker('fra+deu', 1, {
                logger: (m) => {
                    if (m.status === 'recognizing text') {
                        const pct = Math.round((m.progress || 0) * 100);
                        pdfProgress.value = `OCR en cours... ${pct}%`;
                    }
                }
            });

            let ocrText = '';
            try {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                for (let i = 1; i <= pdf.numPages; i++) {
                    pdfProgress.value = `OCR page ${i}/${pdf.numPages}...`;
                    const page = await pdf.getPage(i);

                    // Render at 2x scale for better OCR accuracy
                    const viewport = page.getViewport({ scale: 2 });
                    canvas.width = viewport.width;
                    canvas.height = viewport.height;
                    await page.render({ canvasContext: ctx, viewport }).promise;

                    const { data } = await worker.recognize(canvas);
                    ocrText += data.text + '\n';
                }
            } finally {
                await worker.terminate();
            }

            return ocrText;
        }

        // ==================== Supplier format detection ====================

        /**
         * Detect delivery note supplier format from text content.
         * Returns 'sanofi' | 'alloga' | 'unknown'.
         */
        function detectSupplierFormat(text) {
            if (/Charge\s*:/i.test(text) && /Exp\.?\s*Date\s*:/i.test(text)) return 'sanofi';
            if (/\b\d{9,}\b/.test(text) && /\bPce\b/i.test(text)) return 'alloga';
            return 'unknown';
        }

        // ==================== Product block splitting ====================

        /**
         * Split delivery note text into one block per product line item.
         * Uses structural markers (article/position numbers) to find boundaries.
         */
        function splitIntoProductBlocks(text, format) {
            const lines = text.split('\n');
            const blocks = [];
            let currentBlock = [];

            const productLinePattern = format === 'sanofi'
                ? /^\s*\d{6}\s/        // 000010, 000020, etc.
                : format === 'alloga'
                ? /^\s*\d{9,}\s/       // 100194725, etc.
                : /^\s*\d{6,}\s/;      // either pattern

            for (const line of lines) {
                if (productLinePattern.test(line)) {
                    if (currentBlock.length > 0) {
                        blocks.push(currentBlock.join('\n'));
                    }
                    currentBlock = [line];
                } else if (currentBlock.length > 0) {
                    currentBlock.push(line);
                }
            }
            if (currentBlock.length > 0) {
                blocks.push(currentBlock.join('\n'));
            }

            // Fallback: if no structural markers found, split by blank lines
            if (blocks.length === 0) {
                let current = [];
                for (const line of lines) {
                    if (line.trim() === '') {
                        if (current.length > 0) {
                            blocks.push(current.join('\n'));
                            current = [];
                        }
                    } else {
                        current.push(line);
                    }
                }
                if (current.length > 0) {
                    blocks.push(current.join('\n'));
                }
            }

            return blocks;
        }

        // ==================== Vaccine matching ====================

        /**
         * Match a text block against VACCINE_ALIASES.
         * Returns the VACCINE_SCHEDULES key or null.
         */
        function matchVaccineAlias(block) {
            for (const alias of VACCINE_ALIASES) {
                if (alias.pattern.test(block)) return alias.key;
            }
            return null;
        }

        /**
         * Main entry: find all vaccine lots in extracted PDF text.
         * Uses block-based splitting for structured PDFs (alloga/sanofi),
         * falls back to position-based scanning for OCR/unknown text.
         */
        function matchVaccinesInText(text) {
            // Normalize: collapse runs of spaces/tabs, keep newlines
            const normalized = text.replace(/[ \t]+/g, ' ');
            console.log('[Stock PDF] Normalized text:\n', normalized);

            const format = detectSupplierFormat(normalized);
            console.log('[Stock PDF] Detected format:', format);

            // Try block-based approach for structured formats
            if (format !== 'unknown') {
                const results = matchByBlocks(normalized, format);
                if (results.length > 0) return results;
            }

            // Fallback: position-based scanning (works for OCR and unstructured text)
            console.log('[Stock PDF] Using position-based scanning');
            return matchByPositions(normalized, format);
        }

        /**
         * Block-based matching: split text by structural markers, one match per block.
         */
        function matchByBlocks(text, format) {
            const blocks = splitIntoProductBlocks(text, format);
            console.log('[Stock PDF] Product blocks:', blocks.length);

            const results = [];
            const seen = new Set();

            for (const block of blocks) {
                const vaccineKey = matchVaccineAlias(block);
                if (!vaccineKey) continue;

                console.log(`[Stock PDF] Block matched -> ${vaccineKey}:`, block.substring(0, 150));

                const fields = extractFieldsFromContext(block, format);
                const dedupKey = `${vaccineKey}|${fields.lot}`;
                if (seen.has(dedupKey)) continue;
                seen.add(dedupKey);

                results.push({
                    vaccine: vaccineKey,
                    lot: fields.lot,
                    expiration: fields.expiration,
                    quantity: fields.quantity
                });
            }

            return results;
        }

        /**
         * Position-based matching: scan full text for vaccine names,
         * extract bounded context (up to next vaccine match) for each.
         * Works well for OCR text where structural markers are absent.
         */
        function matchByPositions(text, format) {
            const positions = [];

            for (const alias of VACCINE_ALIASES) {
                // Use global regex to find all occurrences
                const regex = new RegExp(alias.pattern.source, 'gi');
                let match;
                while ((match = regex.exec(text)) !== null) {
                    // Skip if this position overlaps with an already-found (more specific) match
                    const overlaps = positions.some(p =>
                        match.index >= p.index && match.index < p.endIndex
                    );
                    if (!overlaps) {
                        positions.push({
                            key: alias.key,
                            index: match.index,
                            endIndex: match.index + match[0].length
                        });
                    }
                }
            }

            // Sort by position in text
            positions.sort((a, b) => a.index - b.index);
            console.log('[Stock PDF] Vaccine positions found:', positions.map(p => `${p.key}@${p.index}`));

            const results = [];
            const seen = new Set();

            for (let i = 0; i < positions.length; i++) {
                const pos = positions[i];
                // Context ends at next vaccine position or +500 chars, whichever is smaller
                const nextStart = (i + 1 < positions.length) ? positions[i + 1].index : text.length;
                const contextEnd = Math.min(nextStart, pos.endIndex + 500);
                const context = text.substring(pos.endIndex, contextEnd);

                console.log(`[Stock PDF] Context for ${pos.key}:`, context.substring(0, 120));

                const fields = extractFieldsFromContext(context, format);
                const dedupKey = `${pos.key}|${fields.lot}`;
                if (seen.has(dedupKey)) continue;
                seen.add(dedupKey);

                results.push({
                    vaccine: pos.key,
                    lot: fields.lot,
                    expiration: fields.expiration,
                    quantity: fields.quantity
                });
            }

            return results;
        }

        // ==================== Field extraction ====================

        /**
         * Extract lot, expiration, and quantity from a product block.
         * Uses format-specific patterns with fallbacks.
         */
        function extractFieldsFromContext(block, format) {
            let lotResult = '';
            let expirationResult = '';
            let quantityResult = 0;

            // --- Lot number ---
            // 1. Sanofi labeled: "Charge: Y3E772V"
            if (format === 'sanofi') {
                const m = block.match(/Charge\s*:\s*([A-Z0-9][A-Z0-9\-]{3,})/i);
                if (m) lotResult = m[1];
            }
            // 2. Alloga: code before slash+date "AHAVC169AA / 31.05.2027"
            if (!lotResult) {
                const m = block.match(/\b([A-Z][A-Z0-9]{4,})\s*\/\s*\d{2}\.\d{2}\.\d{4}/i);
                if (m && /\d/.test(m[1]) && /[A-Z]/i.test(m[1])) lotResult = m[1];
            }
            // 3. Labeled: Lot:, Ch.-B.:, Numero de Lot:
            if (!lotResult) {
                const m = block.match(/(?:lot|ch[\.\-]?\s*b\.?|n[°o]\s*(?:de\s+)?lot|charge)\s*[:.\s]\s*([A-Z][A-Z0-9\-]{3,})/i);
                if (m) lotResult = m[1];
            }
            // 4. Unlabeled: first alphanumeric code (5+ chars, both letters AND digits)
            if (!lotResult) {
                const skip = new Set(['SUSP', 'GTIN', 'EMBALLAGE', 'INJECTION', 'VACCIN', 'ADULTE', 'ENFANT']);
                const candidates = block.matchAll(/\b([A-Z][A-Z0-9]{4,})\b/gi);
                for (const m of candidates) {
                    const c = m[1].toUpperCase();
                    if (/\d/.test(c) && /[A-Z]/.test(c) && !skip.has(c)) {
                        lotResult = c;
                        break;
                    }
                }
            }

            // --- Expiration date ---
            // 1. Sanofi labeled: "Exp.Date: 31.05.2027"
            if (format === 'sanofi') {
                const m = block.match(/Exp\.?\s*Date\s*:\s*(\d{2}\.\d{2}\.\d{4})/i);
                if (m) expirationResult = normalizeDate(m[1]);
            }
            // 2. Date after slash: "LOT / DD.MM.YYYY"
            if (!expirationResult) {
                const m = block.match(/\/\s*(\d{2}\.\d{2}\.\d{4})/);
                if (m) expirationResult = normalizeDate(m[1]);
            }
            // 3. Any DD.MM.YYYY in block
            if (!expirationResult) {
                const m = block.match(/\b(\d{2}\.\d{2}\.\d{4})\b/);
                if (m) expirationResult = normalizeDate(m[1]);
            }
            // 4. MM.YYYY fallback
            if (!expirationResult) {
                const m = block.match(/\b(\d{2}\.\d{4})\b/);
                if (m) expirationResult = normalizeDate(m[1]);
            }

            // --- Quantity ---
            // 1. Sanofi: "20 UN"
            if (format === 'sanofi') {
                const m = block.match(/(\d+)\s*UN\b/);
                if (m) quantityResult = parseInt(m[1]);
            }
            // 2. Alloga: "30 Pce" / "10 Stk"
            if (!quantityResult) {
                const m = block.match(/(\d+)\s*(?:Pce|Stk|pcs|pi[èe]ces?)\b/i);
                if (m) quantityResult = parseInt(m[1]);
            }
            // 3. Labeled: Quantite: / Menge:
            if (!quantityResult) {
                const m = block.match(/(?:qty|quantit[ée]|menge|anzahl)\s*[:.\s]\s*(\d+)/i);
                if (m) quantityResult = parseInt(m[1]);
            }

            return { lot: lotResult, expiration: expirationResult, quantity: quantityResult };
        }

        function normalizeDate(dateStr) {
            // DD.MM.YYYY or DD/MM/YYYY -> YYYY-MM-DD
            const dotMatch = dateStr.match(/^(\d{2})[./-](\d{2})[./-](\d{4})$/);
            if (dotMatch) {
                return `${dotMatch[3]}-${dotMatch[2]}-${dotMatch[1]}`;
            }
            // MM.YYYY (common on pharma labels) -> YYYY-MM-01
            const monthYear = dateStr.match(/^(\d{2})\.(\d{4})$/);
            if (monthYear) {
                return `${monthYear[2]}-${monthYear[1]}-01`;
            }
            // Already YYYY-MM-DD
            if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
            return '';
        }

        // ==================== Multi-lot actions ====================

        function cleanupPdfPreview() {
            if (pdfPreviewUrl.value) {
                URL.revokeObjectURL(pdfPreviewUrl.value);
                pdfPreviewUrl.value = '';
            }
        }

        function saveMultiLots() {
            const selected = detectedLots.value.filter(l => l.selected && l.lot);
            const batch = selected.map(l => ({
                vaccine: l.vaccine,
                lot: l.lot,
                expiration: l.expiration || null,
                quantity: Number(l.quantity) || 0
            }));
            if (batch.length === 0) return;
            emit('save-batch', batch);
            showMultiLot.value = false;
            detectedLots.value = [];
            cleanupPdfPreview();
        }

        function cancelMultiLots() {
            showMultiLot.value = false;
            detectedLots.value = [];
            cleanupPdfPreview();
        }

        function onClose() {
            emit('close');
        }

        return {
            vaccine, lot, expiration, quantity,
            vaccineSearch, showVaccineDropdown, vaccineInput,
            filteredVaccines, isEditMode,
            pdfParsing, pdfProgress, pdfError, detectedLots, showMultiLot, pdfPreviewUrl, previewIsImage,
            onVaccineInput, selectVaccine, onVaccineBlur,
            onSave, onClose,
            onPdfUpload, onCameraCapture, saveMultiLots, cancelMultiLots
        };
    },

    template: `
    <div v-if="visible" class="modal-overlay" @click.self="onClose">
        <div class="modal-content stock-lot-modal" :class="{ 'stock-lot-modal-wide': showMultiLot && pdfPreviewUrl }">
            <div class="modal-header">
                <h2>{{ isEditMode ? 'Modifier le lot' : 'Ajouter un lot' }}</h2>
                <button class="modal-close" @click="onClose">&times;</button>
            </div>
            <div class="modal-body">

                <!-- Document import (add mode only) -->
                <div v-if="!isEditMode && !showMultiLot" class="pdf-upload-section">
                    <div class="import-buttons">
                        <label class="pdf-upload-label">
                            <span class="pdf-upload-btn">&#128196; Importer un PDF</span>
                            <input type="file" accept=".pdf" @change="onPdfUpload" style="display:none">
                        </label>
                        <label class="pdf-upload-label">
                            <span class="pdf-upload-btn">&#128247; Photographier</span>
                            <input type="file" accept="image/*" capture="environment" @change="onCameraCapture" style="display:none">
                        </label>
                    </div>
                    <span v-if="pdfParsing" class="pdf-parsing">{{ pdfProgress || 'Analyse du document...' }}</span>
                    <span v-if="pdfError" class="pdf-error">{{ pdfError }}</span>
                </div>

                <!-- Multi-lot review (from PDF) with side-by-side preview -->
                <div v-if="showMultiLot" class="multi-lot-review">
                    <div class="multi-lot-layout">
                        <!-- Document preview -->
                        <div v-if="pdfPreviewUrl" class="pdf-preview-pane">
                            <img v-if="previewIsImage" :src="pdfPreviewUrl" class="pdf-preview-image">
                            <iframe v-else :src="pdfPreviewUrl" class="pdf-preview-frame"></iframe>
                        </div>

                        <!-- Detected lots -->
                        <div class="multi-lot-pane">
                            <h3>Vaccins detectes</h3>
                            <p class="multi-lot-hint">Verifiez avec le PDF et corrigez si necessaire.</p>

                            <div v-for="(dl, idx) in detectedLots" :key="idx" class="multi-lot-item">
                                <div class="multi-lot-check">
                                    <input type="checkbox" v-model="dl.selected" :id="'ml-' + idx">
                                    <label :for="'ml-' + idx" class="multi-lot-name">{{ dl.vaccine }}</label>
                                </div>
                                <div v-if="dl.selected" class="multi-lot-fields">
                                    <div class="stock-form-row">
                                        <label>Lot *</label>
                                        <input type="text" v-model="dl.lot" placeholder="Numero de lot"
                                               :class="{ 'input-missing': !dl.lot }">
                                    </div>
                                    <div class="stock-form-row">
                                        <label>Expiration</label>
                                        <input type="date" v-model="dl.expiration">
                                    </div>
                                    <div class="stock-form-row">
                                        <label>Quantite</label>
                                        <input type="number" v-model.number="dl.quantity" min="0">
                                    </div>
                                </div>
                            </div>

                            <div class="stock-form-actions">
                                <button class="btn-secondary btn-small" @click="cancelMultiLots">Annuler</button>
                                <button class="btn-success btn-small" @click="saveMultiLots"
                                        :disabled="!detectedLots.some(l => l.selected && l.lot)">
                                    Ajouter les lots selectionnes
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Single lot form -->
                <div v-if="!showMultiLot">
                    <div class="stock-form-row">
                        <label>Vaccin *</label>
                        <div class="stock-vaccine-autocomplete">
                            <input type="text" ref="vaccineInput"
                                   v-model="vaccineSearch"
                                   @input="onVaccineInput"
                                   @focus="showVaccineDropdown = true"
                                   @blur="onVaccineBlur"
                                   placeholder="Rechercher un vaccin..."
                                   autocomplete="off">
                            <div v-if="showVaccineDropdown && filteredVaccines.length > 0" class="stock-vaccine-dropdown">
                                <div v-for="v in filteredVaccines" :key="v"
                                     class="stock-vaccine-option"
                                     @mousedown.prevent="selectVaccine(v)">
                                    {{ v }}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="stock-form-row">
                        <label>Numero de lot *</label>
                        <input type="text" v-model="lot" placeholder="Ex: AB1234">
                    </div>

                    <div class="stock-form-row-inline">
                        <div class="stock-form-row">
                            <label>Date d'expiration</label>
                            <input type="date" v-model="expiration">
                        </div>
                        <div class="stock-form-row">
                            <label>Quantite *</label>
                            <input type="number" v-model.number="quantity" min="0">
                        </div>
                    </div>

                    <div class="stock-form-actions">
                        <button class="btn-secondary btn-small" @click="onClose">Annuler</button>
                        <button class="btn-success btn-small" @click="onSave"
                                :disabled="!vaccine || !lot || quantity < 0">
                            {{ isEditMode ? 'Enregistrer' : 'Ajouter' }}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
    `
};
