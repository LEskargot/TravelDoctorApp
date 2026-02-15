/**
 * Consultation Form Component
 * Main consultation wrapper with accordion sections
 *
 * Composes: PatientEditForm, NotesSection, VaccinePanel, PrescriptionPanel, DossierStatus
 * This replaces the entire #appContent div (lines 442-709)
 */
import { useAuth } from '../composables/useAuth.js';
import { usePatient } from '../composables/usePatient.js';
import { useCase } from '../composables/useCase.js';
import { useChronometer } from '../composables/useChronometer.js';
import { useVaccines } from '../composables/useVaccines.js';
import { usePrescription } from '../composables/usePrescription.js';
import * as secureApi from '../api/secure-api.js';
import * as pbApi from '../api/pocketbase.js';
import { generatePrescriptionPdf } from '../utils/pdf-generator.js';

import Chronometer from './Chronometer.js';
import PatientEditForm from './PatientEditForm.js';
import VoyageEditor from './VoyageEditor.js';
import MedicalEditor from './MedicalEditor.js';
import PatientHistory from './PatientHistory.js';
import NotesSection from './NotesSection.js';
import VaccinePanel from './VaccinePanel.js';
import PrescriptionPanel from './PrescriptionPanel.js';
import DossierStatus from './DossierStatus.js';

export default {
    name: 'ConsultationForm',

    components: { Chronometer, PatientEditForm, VoyageEditor, MedicalEditor, PatientHistory, NotesSection, VaccinePanel, PrescriptionPanel, DossierStatus },

    props: {
        consultationType: { type: String, default: 'consultation' }
    },

    emits: ['saved', 'back', 'view-patient'],

    setup(props, { emit }) {
        const { userName, user, location, locationName } = useAuth();
        const { currentPatient, patientName, medicalData, savePatient } = usePatient();
        const { currentCase, addConsultation, updateCaseData, updateVoyage, createNewCase, formData: caseFormData } = useCase();
        const chrono = useChronometer();
        const vaccines = useVaccines();
        const prescription = usePrescription();

        const notes = Vue.ref('');
        const saving = Vue.ref(false);
        const activeAccordion = Vue.ref('patient');

        const patientEditRef = Vue.ref(null);
        const voyageEditorRef = Vue.ref(null);
        const medicalEditorRef = Vue.ref(null);
        const notesSectionRef = Vue.ref(null);

        // Start chronometer on mount
        Vue.onMounted(() => {
            chrono.start();
        });

        function toggleAccordion(section) {
            activeAccordion.value = activeAccordion.value === section ? null : section;
        }

        // ==================== Save ====================

        async function saveConsultation() {
            const editForm = patientEditRef.value;
            if (!editForm) return;

            const formData = editForm.getFormData();
            if (!formData.nom) {
                alert('Veuillez saisir le nom du patient.');
                return;
            }
            if (!formData.dob) {
                alert('La date de naissance est obligatoire.');
                return;
            }

            // Check consultation is not empty
            {
                const selectedConseils = notesSectionRef.value?.getSelectedConseils() || [];
                const hasNotes = !!(notes.value || selectedConseils.length);
                const hasVaccines = vaccines.vaccines.value.some(v => v.administered);
                const hasMedications = prescription.selectedMedications.value.length > 0;
                if (!hasNotes && !hasVaccines && !hasMedications) {
                    alert('Consultation vide. Ajoutez des notes, vaccins ou prescriptions avant de sauvegarder.');
                    return;
                }
            }

            saving.value = true;
            chrono.stop();

            try {
                // Get medical data from editor
                const medData = medicalEditorRef.value?.getMedicalData() || null;
                const poids = medData?.poids ? parseFloat(medData.poids) : null;

                // Save patient (non-sensitive + sensitive via PHP)
                const patientId = await savePatient({
                    nom: formData.nom,
                    prenom: formData.prenom,
                    dob: formData.dob,
                    poids: poids,
                    // Sensitive fields (routed through PHP)
                    email: formData.email,
                    telephone: formData.telephone,
                    adresse: formData.adresse,
                    avs: formData.avs,
                    // Medical data (encrypted via PHP)
                    medical: medData
                });

                // Ensure case exists - create if needed (walk-in patient scenario)
                if (!currentCase.value) {
                    // Get voyage data to determine case type
                    const voyage = voyageEditorRef.value?.getVoyageData() || { destinations: [] };
                    const hasVoyageData = voyage.destinations && voyage.destinations.length > 0;
                    const caseType = hasVoyageData ? 'conseil_voyage' : 'conseil_sans_voyage';

                    // Encrypt medical data for case
                    const medicalEncryptedForCase = await secureApi.encryptItems([
                        { key: 'medical', plaintext: medData }
                    ]);

                    try {
                        await createNewCase(patientId, {
                            type: caseType,
                            voyage: JSON.stringify(voyage),
                            medical_encrypted: medicalEncryptedForCase.encrypted?.medical || '',
                            status: 'termine', // Immediately closed after consultation
                            closed_at: new Date().toISOString()
                        });
                    } catch (error) {
                        console.error('Failed to auto-create case:', error);
                        alert('Erreur lors de la création du dossier: ' + error.message);
                        return;
                    }
                }

                // Save voyage to case
                if (currentCase.value && voyageEditorRef.value) {
                    await updateVoyage(currentCase.value.id, voyageEditorRef.value.getVoyageData());
                }

                // Update case with medical snapshot
                if (currentCase.value && medData) {
                    await updateCaseData(currentCase.value.id, {
                        medical: medData
                    });
                }

                // Build notes with conseils prefix
                const conseils = notesSectionRef.value?.getSelectedConseils() || [];
                const freeNotes = notes.value || '';
                let fullNotes = '';
                if (conseils.length) {
                    fullNotes = `[CONSEILS] ${conseils.join(' | ')}`;
                    if (freeNotes) fullNotes += '\n\n' + freeNotes;
                } else {
                    fullNotes = freeNotes;
                }

                // Create consultation with practitioner
                const consultation = await addConsultation({
                    location: location.value,
                    practitioner: user.value?.id,
                    date: new Date().toISOString().split('T')[0],
                    consultation_type: props.consultationType,
                    duration_minutes: chrono.elapsedMinutes.value,
                    notes: fullNotes || null,
                    status: 'termine'
                });

                // Save vaccines + boosters (unified)
                await vaccines.saveVaccines(patientId, consultation.id, currentCase.value?.id);

                // Save prescription (via PHP, encrypted)
                await prescription.savePrescription(patientId, consultation.id);

                // Mark form as processed if from pending forms
                if (caseFormData.value?.formId) {
                    await secureApi.markFormProcessed(caseFormData.value.formId, patientId);
                }

                emit('saved');

            } catch (error) {
                alert('Erreur lors de la sauvegarde: ' + error.message);
            } finally {
                saving.value = false;
            }
        }

        // ==================== PDF export ====================

        function exportPrescriptionPdf() {
            const editForm = patientEditRef.value;
            if (!editForm) return;
            const formData = editForm.getFormData();

            const doc = generatePrescriptionPdf({
                patientName: `${formData.nom} ${formData.prenom}`.trim(),
                patientDob: formData.dob,
                patientAddress: formData.adresse,
                medications: prescription.selectedMedications.value,
                date: prescription.prescriptionDate.value,
                pageFormat: prescription.pageFormat.value,
                practitionerName: userName.value
            });

            if (doc) {
                const name = `${formData.nom}${formData.prenom}`;
                const date = prescription.prescriptionDate.value.replace(/-/g, '');
                doc.save(`RX_${name}_${date}.pdf`);
            }
        }

        return {
            userName, locationName, currentPatient, patientName,
            notes, saving, activeAccordion,
            patientEditRef, voyageEditorRef, medicalEditorRef, notesSectionRef,
            toggleAccordion, saveConsultation, exportPrescriptionPdf,
            emit
        };
    },

    template: `
    <div class="consultation-form">
        <Chronometer />

        <div class="consultation-header">
            <div>
                <h1>Travel Doctor App</h1>
                <div class="practitioner-info">
                    {{ userName }} <span class="location-badge">{{ locationName }}</span>
                </div>
            </div>
            <button class="btn-secondary btn-small" @click="emit('back')">Retour</button>
        </div>

        <!-- ACCORDION: Patient -->
        <div class="accordion-section" :class="{ active: activeAccordion === 'patient' }">
            <div class="accordion-header" @click="toggleAccordion('patient')">
                <span class="accordion-icon">{{ activeAccordion === 'patient' ? '▼' : '▶' }}</span>
                <span>Dossier Patient</span>
            </div>
            <div class="accordion-content" v-show="activeAccordion === 'patient'">
                <PatientEditForm ref="patientEditRef" @view-patient="emit('view-patient')" />
                <VoyageEditor ref="voyageEditorRef" />
                <MedicalEditor ref="medicalEditorRef" />
                <PatientHistory />
            </div>
        </div>

        <!-- ACCORDION: Notes -->
        <div class="accordion-section" :class="{ active: activeAccordion === 'notes' }">
            <div class="accordion-header" @click="toggleAccordion('notes')">
                <span class="accordion-icon">{{ activeAccordion === 'notes' ? '▼' : '▶' }}</span>
                <span>Notes de consultation</span>
            </div>
            <div class="accordion-content" v-show="activeAccordion === 'notes'">
                <NotesSection ref="notesSectionRef" v-model="notes" />
            </div>
        </div>

        <!-- ACCORDION: Vaccines -->
        <div class="accordion-section" :class="{ active: activeAccordion === 'vaccines' }">
            <div class="accordion-header" @click="toggleAccordion('vaccines')">
                <span class="accordion-icon">{{ activeAccordion === 'vaccines' ? '▼' : '▶' }}</span>
                <span>Vaccins & Rappels</span>
            </div>
            <div class="accordion-content" v-show="activeAccordion === 'vaccines'">
                <VaccinePanel />
            </div>
        </div>

        <!-- ACCORDION: Prescription -->
        <div class="accordion-section" :class="{ active: activeAccordion === 'prescription' }">
            <div class="accordion-header" @click="toggleAccordion('prescription')">
                <span class="accordion-icon">{{ activeAccordion === 'prescription' ? '▼' : '▶' }}</span>
                <span>Ordonnance</span>
            </div>
            <div class="accordion-content" v-show="activeAccordion === 'prescription'">
                <PrescriptionPanel />
            </div>
        </div>

        <!-- Dossier status -->
        <DossierStatus
            :patient-name="patientName"
            :patient-dob="currentPatient?.dob || ''"
            :notes="notes" />

        <!-- Action buttons -->
        <div class="button-group">
            <button class="btn-success" @click="saveConsultation" :disabled="saving">
                {{ saving ? 'Sauvegarde...' : 'Sauvegarder consultation' }}
            </button>
            <button class="btn-teal" @click="exportPrescriptionPdf">Generer ordonnance PDF</button>
        </div>
    </div>
    `
};
