// Translation system for Travel Doctor Patient Form
// Languages: FR, EN, IT, ES

const TRANSLATIONS = {
  fr: {
    // Header
    lang_selector: "Langue",
    site_title: "TravelDoctor.ch",
    form_subtitle: "Formulaire patient",

    // Steps
    steps: {
      identity: "Identité",
      travel: "Voyage",
      health: "Santé",
      vaccination: "Vaccinations",
      referral: "Recommandation",
      summary: "Récapitulatif"
    },

    // Buttons
    buttons: {
      next: "Suivant",
      previous: "Précédent",
      submit: "Confirmer et envoyer",
      add: "Ajouter",
      remove: "Supprimer",
      edit: "Modifier",
      modify: "Modifier",
      add_country: "Ajouter un pays",
      add_files: "Ajouter des fichiers",
      browse: "Parcourir",
      yes: "Oui",
      no: "Non",
      not_applicable: "Non applicable",
      optional: "Facultatif",
      back_to_site: "Retour au site"
    },

    // Step 1: Identity
    identity: {
      title: "Informations personnelles",
      subtitle: "Une seule personne par formulaire",
      full_name: "Prénom et Nom",
      full_name_placeholder: "Jean Dupont",
      full_name_hint: "Une seule personne par formulaire",
      birthdate: "Date de naissance",
      email: "Email",
      email_placeholder: "votre@email.com",
      email_hint: "Email pour recevoir la confirmation",
      phone: "Téléphone",
      phone_placeholder: "+41 79 123 45 67",
      street: "Rue",
      street_placeholder: "Rue de la Gare 10",
      postal_code: "Code postal",
      city: "Ville",
      country: "Pays de résidence",
      country_placeholder: "Rechercher un pays...",
      gender: "Genre",
      gender_female: "Femme",
      gender_male: "Homme",
      gender_nonbinary: "Non-binaire",
      gender_other: "Autre",
      gender_options: {
        femme: "Femme",
        homme: "Homme",
        non_binaire: "Non-binaire",
        autre: "Autre"
      },
      avs: "Numéro AVS",
      avs_placeholder: "756.1234.5678.90",
      avs_hint: "Recommandé pour éviter les confusions d'identité"
    },

    // Step 2: Travel
    travel: {
      title: "Informations sur votre voyage",
      destinations: "Pays de destination",
      country: "Pays",
      country_placeholder: "Rechercher un pays...",
      add_country: "Ajouter un pays",
      departure: "Départ",
      return: "Retour",
      specify: "Précisez",
      reason: "Nature du voyage",
      reason_organized: "Tourisme en voyage organisé",
      reason_independent: "Tourisme indépendant",
      reason_business: "Voyage d'affaires",
      reason_adventure: "Aventure",
      reason_family: "Visite amis/famille",
      reason_humanitarian: "Mission humanitaire",
      reason_pilgrimage: "Pèlerinage",
      reason_expatriation: "Expatriation",
      reason_other: "Autre",
      travel_reason: "Quelle est la nature de votre voyage?",
      travel_reason_options: {
        tourisme_organise: "Tourisme en voyage organisé",
        tourisme_independant: "Tourisme indépendant",
        affaires: "Voyage d'affaires",
        aventure: "Aventure",
        visite_famille: "Visite à des amis ou de la famille",
        humanitaire: "Mission humanitaire",
        pelerinage: "Pèlerinage",
        expatriation: "Expatriation",
        autre: "Autre",
        aucune: "Aucune des précédentes"
      },
      specify_other: "Précisez",
      accommodation: "Type d'hébergement",
      accommodation_undecided: "Pas encore décidé",
      accommodation_local: "Chez l'habitant",
      accommodation_hotel: "Hôtel",
      accommodation_other: "Autre",
      accommodation_options: {
        pas_decide: "Pas encore décidé",
        habitant: "Chez l'habitant",
        hotel: "Hôtel",
        autre: "Autre"
      },
      activities: "Activités prévues",
      activity_mountaineering: "Alpinisme",
      activity_hiking: "Randonnée",
      activity_diving: "Plongée",
      activity_rafting: "Rafting",
      activity_cycling: "Vélo",
      activity_snorkeling: "Snorkeling",
      activity_other: "Autre",
      activity_none: "Aucune de ces activités",
      activities_options: {
        alpinisme: "Alpinisme",
        randonnee: "Randonnée",
        plongee: "Plongée",
        rafting: "Rafting",
        velo: "Vélo",
        snorkeling: "Snorkeling",
        autre: "Autre",
        aucune: "Aucune de ces activités"
      },
      rural: "Séjour en zone rurale ou isolée ?",
      rural_stay: "Avez-vous prévu de séjourner dans des zones rurales ou isolées?",
      yes: "Oui",
      no: "Non"
    },

    // Step 3: Health
    health: {
      title: "Informations sur votre santé",
      weight: "Poids (kg)",
      weight_unit: "kg",

      // Reproductive
      reproductive_title: "Santé reproductive",
      show_reproductive: "Souhaitez-vous répondre aux questions sur la santé reproductive ?",
      reproductive_ask: "Souhaitez-vous répondre aux questions sur la santé reproductive?",
      pregnancy: "Enceinte ou projet de grossesse ?",
      contraception: "Contraception ?",
      breastfeeding: "Allaitement ?",
      last_menses: "Dernières règles",
      last_menses_hint: "Laissez vide si pas de règles",
      yes: "Oui",
      no: "Non",
      not_applicable: "Non applicable",

      // Allergies
      allergies_title: "Allergies",
      has_allergies: "Avez-vous des allergies ?",
      allergy_types: "Types d'allergies",
      allergy_eggs: "Œufs",
      allergy_medication: "Médicaments",
      allergy_food: "Aliments",
      allergy_environment: "Environnement",
      allergy_other: "Autre",
      allergies_details: "Précisez vos allergies et type de réaction",
      allergies_details_placeholder: "Ex: Pénicilline - urticaire, fruits de mer - choc anaphylactique...",

      // Specific diseases
      diseases_title: "Maladies spécifiques",
      dengue: "Avez-vous eu la dengue ?",
      chickenpox_disease: "Avez-vous eu la varicelle ?",
      chickenpox_vaccine: "Vacciné contre la varicelle ?",

      // Vaccination history
      vaccination_history_title: "Vaccinations antérieures",
      vaccination_history: "Vaccinations antérieures",
      vaccination_problem: "Problème avec une vaccination antérieure ?",
      vaccination_problem_details: "Détails",

      // Comorbidities
      comorbidities_title: "Maladies chroniques",
      comorbidities: "Souffrez-vous de... ?",
      comorbidities_question: "Souffrez-vous ou avez-vous souffert de...?",
      comorbidity_none: "Aucune maladie chronique",
      comorbidities_none: "Aucune maladie chronique",
      comorbidity_group_immune: "Système immunitaire",
      comorbidity_group_cancer: "Cancers et maladies du sang",
      comorbidity_group_cardio: "Cardiovasculaire",
      comorbidity_group_metabolic: "Métabolique",
      comorbidity_group_respiratory: "Respiratoire",
      comorbidity_group_digestive: "Digestif",
      comorbidity_group_rheumatic: "Rhumatologique",
      comorbidity_group_neuro: "Neurologique",
      comorbidity_group_mental: "Santé mentale",
      comorbidity_group_other: "Autres",
      comorbidity_hiv: "VIH",
      comorbidity_thymus: "Problème du thymus",
      comorbidity_spleen: "Absence de rate",
      comorbidity_cancer: "Cancer",
      comorbidity_hematologic: "Maladie hématologique",
      comorbidity_hypertension: "Hypertension",
      comorbidity_heart: "Maladie cardiaque",
      comorbidity_diabetes: "Diabète",
      comorbidity_asthma: "Asthme",
      comorbidity_inflammatory: "Maladie inflammatoire (Crohn, RCH)",
      comorbidity_digestive: "Maladie digestive chronique",
      comorbidity_rheumatic: "Polyarthrite, lupus, etc.",
      comorbidity_epilepsy: "Épilepsie",
      comorbidity_muscular: "Maladie musculaire (myasthénie)",
      comorbidity_psychiatric: "Maladie psychiatrique",
      comorbidity_surgery: "Chirurgie/immobilisation récente (< 6 semaines)",
      comorbidity_other: "Autre",
      comorbidity_other_details: "Détails",
      comorbidities_groups: {
        immune: "Système immunitaire",
        cancer: "Cancers et maladies du sang",
        cardiovascular: "Cardiovasculaire",
        metabolic: "Métabolique",
        respiratory: "Respiratoire",
        digestive: "Digestif",
        rheumatologic: "Rhumatologique",
        neurologic: "Neurologique",
        mental: "Santé mentale",
        other: "Autres"
      },
      comorbidities_options: {
        hiv: "VIH",
        thymus: "Problème du thymus (thymome, ablation, DiGeorge)",
        spleen: "Absence de la rate",
        cancer: "Cancer",
        hematologic: "Maladie hématologique (leucémie, lymphome)",
        hypertension: "Hypertension",
        cardiac: "Maladie cardiaque",
        diabetes: "Diabète",
        asthma: "Asthme",
        ibd: "Maladie inflammatoire digestive (Crohn, RCH)",
        chronic_digestive: "Maladie digestive chronique (gastrite, reflux)",
        rheumatologic: "Maladie rhumatologique (polyarthrite, lupus)",
        epilepsy: "Épilepsie",
        muscular: "Maladie musculaire (myasthénie)",
        psychiatric: "Maladie psychiatrique / psychologique",
        surgery: "Chirurgie ou immobilisation récente (< 6 semaines)",
        autre: "Autre"
      },
      hiv_cd4: "Dernier CD4",
      hiv_cd4_date: "Date",
      comorbidity_other_detail: "Précisez",
      recent_chemotherapy: "Chimio/radio/immunomodulateur dans les 6 derniers mois ?",
      psychiatric_details: "Détails",

      // Medications
      medications_title: "Médicaments",
      takes_medication: "Prenez-vous des médicaments ?",
      medication_list: "Liste des médicaments",
      medication_details: "Quels médicaments prenez-vous?",
      medication_placeholder: "Ex: Metformine 500mg, Lisinopril 10mg..."
    },

    // Step 4: Vaccination
    vaccination: {
      title: "Carnet de vaccination",
      subtitle: "Téléversez votre carnet de vaccination",
      upload_instruction: "Téléversez votre carnet de vaccination",
      dropzone_text: "Glissez vos fichiers ici ou cliquez",
      dropzone_mobile: "Appuyez pour ajouter des fichiers",
      dropzone_formats: "Formats: PDF, JPG, PNG, HEIC",
      dropzone_limit: "Maximum: 10 fichiers, 10 MB chacun",
      formats: "Formats acceptés: PDF, JPG, PNG, HEIC",
      limits: "Maximum 10 fichiers, 10 MB chacun",
      files_added: "Fichiers ajoutés",
      no_card: "Je n'ai pas de carnet de vaccination"
    },

    // Step 5: Referral
    referral: {
      title: "Comment nous avez-vous trouvé?",
      subtitle: "Ces questions sont facultatives",
      source: "Comment avez-vous entendu parler de nous ?",
      source_internet: "Recherche Internet",
      source_social: "Réseaux sociaux",
      source_doctor: "Médecin/professionnel de santé",
      source_friend: "Ami/famille",
      source_pharmacy: "Pharmacie",
      source_employer: "Employeur",
      source_travel_agency: "Agence de voyage",
      source_insurance: "Assurance",
      source_returning: "Déjà patient",
      source_advertising: "Publicité",
      source_other: "Autre",
      source_options: {
        internet: "Recherche Internet (Google, Bing...)",
        social_media: "Réseaux sociaux",
        doctor: "Référence d'un médecin/professionnel de santé",
        friend: "Recommandation d'un ami ou de la famille",
        pharmacy: "Pharmacie",
        employer: "Lieu de travail/Employeur",
        travel_agency: "Agence de voyage",
        insurance: "Compagnie d'assurance",
        returning: "Déjà patient/client revenant",
        advertisement: "Publicité",
        autre: "Autre"
      },
      search_terms: "Quels termes de recherche avez-vous utilisés?",
      social_platform: "Plateforme",
      social_options: {
        facebook: "Facebook",
        instagram: "Instagram",
        linkedin: "LinkedIn",
        twitter: "Twitter/X",
        tiktok: "TikTok",
        youtube: "YouTube",
        autre: "Autre"
      },
      doctor_name: "Nom",
      friend_name: "Nom",
      can_contact: "Pouvons-nous les contacter pour les remercier?",
      ad_location: "Où ?",
      ad_options: {
        online: "En ligne (site web/bannière)",
        print: "Presse écrite (journal/magazine)",
        radio: "Radio",
        tv: "Télévision",
        poster: "Affiche/Dépliant",
        autre: "Autre"
      },
      other_specify: "Précisez",
      choice_factor: "Facteur principal de choix",
      factor_location: "Emplacement",
      factor_price: "Prix",
      factor_reputation: "Réputation",
      factor_recommendation: "Recommandation",
      factor_expertise: "Expertise",
      factor_availability: "Disponibilité",
      factor_languages: "Langues parlées",
      factor_other: "Autre",
      choice_options: {
        location: "Emplacement/Commodité",
        price: "Prix",
        reputation: "Réputation/Avis",
        recommendation: "Recommandation",
        expertise: "Expertise spécialisée",
        availability: "Disponibilité des rendez-vous",
        languages: "Options linguistiques",
        autre: "Autre"
      },
      comment: "Commentaire",
      comment_placeholder: "Avez-vous quelque chose à ajouter?"
    },

    // Step 6: Summary
    summary: {
      title: "Vérifiez vos informations",
      subtitle: "Vérifiez vos informations avant envoi",
      address: "Adresse",
      section_identity: "Identité",
      section_travel: "Voyage",
      section_health: "Santé",
      section_vaccination: "Carnet de vaccination",
      section_referral: "Recommandation",
      destinations_label: "Destinations",
      allergies_label: "Allergies",
      comorbidities_label: "Antécédents",
      medications_label: "Médicaments",
      files_label: "Fichiers",
      consent: "Je déclare avoir répondu à ce questionnaire de manière honnête et sincère. Je reconnais que ces informations seront utilisées pour évaluer mon état de santé.",
      consent_text: "Je déclare avoir répondu à ce questionnaire de manière honnête et sincère. Je reconnais que ces informations seront utilisées pour évaluer mon état de santé dans le cadre de ma consultation pré-voyage. Je comprends que des informations incorrectes ou incomplètes pourraient compromettre ma sécurité et ma santé.",
      consent_required: "Vous devez accepter la déclaration pour continuer"
    },

    // Validation errors
    errors: {
      required: "Ce champ est obligatoire",
      invalid_email: "Adresse email invalide",
      invalid_date: "Date invalide",
      invalid_phone: "Numéro de téléphone invalide",
      invalid_number: "Nombre invalide",
      min_value: "La valeur minimum est {min}",
      max_value: "La valeur maximum est {max}",
      date_future: "La date doit être dans le futur",
      date_past: "La date doit être dans le passé",
      departure_after_return: "La date de départ doit être avant le retour",
      departure_before_return: "La date de départ doit être avant la date de retour",
      min_destination: "Ajoutez au moins une destination",
      min_destinations: "Ajoutez au moins une destination",
      min_selection: "Sélectionnez au moins une option",
      file_too_large: "Fichier {name} trop volumineux (max 10 MB)",
      too_many_files: "Maximum 10 fichiers autorisés",
      invalid_file_type: "Type de fichier {name} non autorisé",
      vaccination_required: "Ajoutez au moins un fichier ou cochez la case",
      consent_required: "Vous devez accepter la déclaration",
      submission_failed: "L'envoi a échoué. Veuillez réessayer."
    },

    // Messages
    messages: {
      draft_saved: "Brouillon sauvegardé",
      draft_restored: "Votre brouillon a été restauré",
      form_submitted: "Formulaire envoyé avec succès",
      confirmation_sent: "Un email de confirmation a été envoyé à {email}",
      upload_progress: "Téléversement en cours...",
      processing: "Traitement en cours...",
      submitting: "Envoi en cours...",
      error_occurred: "Une erreur est survenue. Veuillez réessayer.",
      connection_error: "Erreur de connexion. Vérifiez votre connexion internet.",
      success_title: "Formulaire envoyé",
      success_message: "Votre formulaire a été envoyé avec succès. Un email de confirmation a été envoyé à:",
      no_results: "Aucun résultat trouvé",
      no_files: "Aucun fichier téléversé",
      no_referral: "Aucune information fournie"
    },

    // Misc
    optional: "facultatif",
    loading: "Chargement...",
    of: "sur"
  },

  en: {
    // Header
    lang_selector: "Language",
    site_title: "TravelDoctor.ch",
    form_subtitle: "Patient form",

    // Steps
    steps: {
      identity: "Identity",
      travel: "Travel",
      health: "Health",
      vaccination: "Vaccinations",
      referral: "Referral",
      summary: "Summary"
    },

    // Buttons
    buttons: {
      next: "Next",
      previous: "Previous",
      submit: "Confirm and submit",
      add: "Add",
      remove: "Remove",
      edit: "Edit",
      modify: "Edit",
      add_country: "Add a country",
      add_files: "Add files",
      browse: "Browse",
      yes: "Yes",
      no: "No",
      not_applicable: "Not applicable",
      optional: "Optional",
      back_to_site: "Back to site"
    },

    // Step 1: Identity
    identity: {
      title: "Personal information",
      subtitle: "One person per form only",
      full_name: "First name and Last name",
      full_name_placeholder: "John Smith",
      full_name_hint: "One person per form only",
      birthdate: "Date of birth",
      email: "Email",
      email_placeholder: "your@email.com",
      email_hint: "Email to receive confirmation",
      phone: "Phone",
      phone_placeholder: "+41 79 123 45 67",
      street: "Street",
      street_placeholder: "123 Main Street",
      postal_code: "Postal code",
      city: "City",
      country: "Country of residence",
      country_placeholder: "Search for a country...",
      gender: "Gender",
      gender_female: "Female",
      gender_male: "Male",
      gender_nonbinary: "Non-binary",
      gender_other: "Other",
      gender_options: {
        femme: "Female",
        homme: "Male",
        non_binaire: "Non-binary",
        autre: "Other"
      },
      avs: "AVS Number (Swiss Social Security)",
      avs_placeholder: "756.1234.5678.90",
      avs_hint: "Recommended to avoid identity confusion"
    },

    // Step 2: Travel
    travel: {
      title: "Travel information",
      destinations: "Destination countries",
      country: "Country",
      country_placeholder: "Search for a country...",
      add_country: "Add a country",
      departure: "Departure",
      return: "Return",
      specify: "Please specify",
      reason: "Purpose of travel",
      reason_organized: "Organized tourism",
      reason_independent: "Independent tourism",
      reason_business: "Business trip",
      reason_adventure: "Adventure",
      reason_family: "Visiting friends/family",
      reason_humanitarian: "Humanitarian mission",
      reason_pilgrimage: "Pilgrimage",
      reason_expatriation: "Expatriation",
      reason_other: "Other",
      travel_reason: "What is the purpose of your trip?",
      travel_reason_options: {
        tourisme_organise: "Organized tourism",
        tourisme_independant: "Independent tourism",
        affaires: "Business trip",
        aventure: "Adventure",
        visite_famille: "Visiting friends or family",
        humanitaire: "Humanitarian mission",
        pelerinage: "Pilgrimage",
        expatriation: "Expatriation",
        autre: "Other",
        aucune: "None of the above"
      },
      specify_other: "Please specify",
      accommodation: "Accommodation type",
      accommodation_undecided: "Not yet decided",
      accommodation_local: "Staying with locals",
      accommodation_hotel: "Hotel",
      accommodation_other: "Other",
      accommodation_options: {
        pas_decide: "Not yet decided",
        habitant: "Staying with locals",
        hotel: "Hotel",
        autre: "Other"
      },
      activities: "Planned activities",
      activity_mountaineering: "Mountaineering",
      activity_hiking: "Hiking",
      activity_diving: "Diving",
      activity_rafting: "Rafting",
      activity_cycling: "Cycling",
      activity_snorkeling: "Snorkeling",
      activity_other: "Other",
      activity_none: "None of these activities",
      activities_options: {
        alpinisme: "Mountaineering",
        randonnee: "Hiking",
        plongee: "Diving",
        rafting: "Rafting",
        velo: "Cycling",
        snorkeling: "Snorkeling",
        autre: "Other",
        aucune: "None of these activities"
      },
      rural: "Stay in rural or remote area?",
      rural_stay: "Do you plan to stay in rural or remote areas?",
      yes: "Yes",
      no: "No"
    },

    // Step 3: Health
    health: {
      title: "Health information",
      weight: "What is your weight?",
      weight_unit: "kg",

      reproductive_title: "Reproductive health",
      reproductive_ask: "Would you like to answer questions about reproductive health?",
      pregnancy: "Is it possible that you are pregnant or planning to become pregnant in the coming months?",
      contraception: "Are you using contraception?",
      breastfeeding: "Are you breastfeeding?",
      last_menses: "Date of last menstrual period",
      last_menses_hint: "Leave blank if not applicable",
      yes: "Yes",
      no: "No",
      not_applicable: "Not applicable",

      allergies_title: "Allergies",
      has_allergies: "Do you have any allergies?",
      allergy_types: "Types of allergies",
      allergy_eggs: "Eggs",
      allergy_medication: "Medications",
      allergy_food: "Food",
      allergy_environment: "Environmental",
      allergy_other: "Other",
      allergies_details: "Please specify your allergies and type of reaction",
      allergies_details_placeholder: "E.g., Penicillin - hives, seafood - anaphylaxis...",

      diseases_title: "Specific diseases",
      dengue: "Have you had dengue fever?",
      chickenpox_disease: "Have you had chickenpox (the disease)?",
      chickenpox_vaccine: "Have you been vaccinated against chickenpox?",

      vaccination_history: "Vaccination history",
      vaccination_problem: "Have you had any problems with a previous vaccination?",
      vaccination_problem_details: "Describe the problem",

      comorbidities_title: "Medical history",
      comorbidities_question: "Do you have or have you had any of the following?",
      comorbidities_none: "No chronic diseases",
      comorbidities_groups: {
        immune: "Immune system",
        cancer: "Cancer and blood diseases",
        cardiovascular: "Cardiovascular",
        metabolic: "Metabolic",
        respiratory: "Respiratory",
        digestive: "Digestive",
        rheumatologic: "Rheumatologic",
        neurologic: "Neurologic",
        mental: "Mental health",
        other: "Other"
      },
      comorbidities_options: {
        hiv: "HIV",
        thymus: "Thymus problem (thymoma, removal, DiGeorge)",
        spleen: "Absent spleen",
        cancer: "Cancer",
        hematologic: "Blood disease (leukemia, lymphoma)",
        hypertension: "Hypertension",
        cardiac: "Heart disease",
        diabetes: "Diabetes",
        asthma: "Asthma",
        ibd: "Inflammatory bowel disease (Crohn's, UC)",
        chronic_digestive: "Chronic digestive disease (gastritis, reflux)",
        rheumatologic: "Rheumatic disease (rheumatoid arthritis, lupus)",
        epilepsy: "Epilepsy",
        muscular: "Muscle disease (myasthenia)",
        psychiatric: "Psychiatric / psychological condition",
        surgery: "Recent surgery or immobilization (< 6 weeks)",
        autre: "Other"
      },
      hiv_cd4: "Last CD4 count",
      hiv_cd4_date: "Date",
      comorbidity_other_detail: "Please specify",
      recent_chemotherapy: "Have you had chemotherapy, radiotherapy, or immunomodulatory treatment in the last 6 months?",
      psychiatric_details: "Please describe your situation",

      medications_title: "Medications",
      takes_medication: "Do you take medications regularly? (including contraception)",
      medication_details: "What medications do you take?",
      medication_placeholder: "E.g., Metformin 500mg, Lisinopril 10mg..."
    },

    // Step 4: Vaccination
    vaccination: {
      title: "Vaccination record",
      upload_instruction: "Upload your vaccination record",
      dropzone_text: "Drag files here or click to browse",
      dropzone_mobile: "Tap to add files",
      formats: "Accepted formats: PDF, JPG, PNG, HEIC",
      limits: "Maximum 10 files, 10 MB each",
      files_added: "Files added",
      no_card: "I don't have a vaccination record"
    },

    // Step 5: Referral
    referral: {
      title: "How did you find us?",
      subtitle: "These questions are optional",
      source: "How did you hear about our service?",
      source_options: {
        internet: "Internet search (Google, Bing...)",
        social_media: "Social media",
        doctor: "Doctor/healthcare professional referral",
        friend: "Friend or family recommendation",
        pharmacy: "Pharmacy",
        employer: "Workplace/Employer",
        travel_agency: "Travel agency",
        insurance: "Insurance company",
        returning: "Returning patient/client",
        advertisement: "Advertisement",
        autre: "Other"
      },
      search_terms: "What search terms did you use?",
      social_platform: "Which platform?",
      social_options: {
        facebook: "Facebook",
        instagram: "Instagram",
        linkedin: "LinkedIn",
        twitter: "Twitter/X",
        tiktok: "TikTok",
        youtube: "YouTube",
        autre: "Other"
      },
      doctor_name: "Doctor/clinic name",
      friend_name: "Person's name (optional)",
      can_contact: "May we contact them to say thank you?",
      ad_location: "Where did you see the advertisement?",
      ad_options: {
        online: "Online (website/banner)",
        print: "Print (newspaper/magazine)",
        radio: "Radio",
        tv: "Television",
        poster: "Poster/Flyer",
        autre: "Other"
      },
      other_specify: "Please specify",
      choice_factor: "What was the main factor in choosing our service?",
      choice_options: {
        location: "Location/Convenience",
        price: "Price",
        reputation: "Reputation/Reviews",
        recommendation: "Recommendation",
        expertise: "Specialized expertise",
        availability: "Appointment availability",
        languages: "Language options",
        autre: "Other"
      },
      comment: "Comment",
      comment_placeholder: "Is there anything you'd like to add?"
    },

    // Step 6: Summary
    summary: {
      title: "Review your information",
      subtitle: "Please check your answers before submitting",
      section_identity: "Identity",
      section_travel: "Travel",
      section_health: "Health",
      section_vaccination: "Vaccination record",
      section_referral: "Referral",
      destinations_label: "Destinations",
      allergies_label: "Allergies",
      comorbidities_label: "Medical history",
      medications_label: "Medications",
      files_label: "Files",
      consent_text: "I declare that I have answered this questionnaire honestly and sincerely. I acknowledge that this information will be used to assess my health status for my pre-travel consultation. I understand that incorrect or incomplete information could compromise my safety and health.",
      consent_required: "You must accept the declaration to continue"
    },

    // Validation errors
    errors: {
      required: "This field is required",
      invalid_email: "Invalid email address",
      invalid_date: "Invalid date",
      invalid_phone: "Invalid phone number",
      invalid_number: "Invalid number",
      min_value: "Minimum value is {min}",
      max_value: "Maximum value is {max}",
      date_future: "Date must be in the future",
      date_past: "Date must be in the past",
      departure_before_return: "Departure date must be before return date",
      min_destinations: "Add at least one destination",
      min_selection: "Select at least one option",
      file_too_large: "File too large (max 10 MB)",
      too_many_files: "Maximum 10 files allowed",
      invalid_file_type: "File type not allowed",
      consent_required: "You must accept the declaration"
    },

    // Messages
    messages: {
      draft_saved: "Draft saved",
      draft_restored: "Your draft has been restored",
      form_submitted: "Form submitted successfully",
      confirmation_sent: "A confirmation email has been sent to {email}",
      upload_progress: "Uploading...",
      processing: "Processing...",
      error_occurred: "An error occurred. Please try again.",
      connection_error: "Connection error. Check your internet connection."
    },

    // Misc
    optional: "optional",
    loading: "Loading...",
    of: "of"
  },

  it: {
    // Header
    lang_selector: "Lingua",
    site_title: "TravelDoctor.ch",
    form_subtitle: "Modulo paziente",

    // Steps
    steps: {
      identity: "Identità",
      travel: "Viaggio",
      health: "Salute",
      vaccination: "Vaccinazioni",
      referral: "Referenza",
      summary: "Riepilogo"
    },

    // Buttons
    buttons: {
      next: "Avanti",
      previous: "Indietro",
      submit: "Conferma e invia",
      add: "Aggiungi",
      remove: "Rimuovi",
      edit: "Modifica",
      modify: "Modifica",
      add_country: "Aggiungi un paese",
      add_files: "Aggiungi file",
      browse: "Sfoglia",
      yes: "Sì",
      no: "No",
      not_applicable: "Non applicabile",
      optional: "Facoltativo",
      back_to_site: "Torna al sito"
    },

    // Step 1: Identity
    identity: {
      title: "Informazioni personali",
      subtitle: "Una sola persona per modulo",
      full_name: "Nome Cognome",
      full_name_placeholder: "Mario Rossi",
      full_name_hint: "Una sola persona per modulo",
      birthdate: "Data di nascita",
      email: "Email",
      email_placeholder: "vostro@email.com",
      email_hint: "La conferma verrà inviata a questa email",
      phone: "Telefono",
      phone_placeholder: "+41 79 123 45 67",
      street: "Via",
      street_placeholder: "Via Roma 10",
      postal_code: "CAP",
      city: "Città",
      country: "Paese di residenza",
      country_placeholder: "Cercare un paese...",
      gender: "Genere",
      gender_female: "Donna",
      gender_male: "Uomo",
      gender_nonbinary: "Non binario",
      gender_other: "Altro",
      gender_options: {
        femme: "Donna",
        homme: "Uomo",
        non_binaire: "Non binario",
        autre: "Altro"
      },
      avs: "Numero AVS",
      avs_placeholder: "756.1234.5678.90",
      avs_hint: "Consigliato per evitare confusioni di identità"
    },

    // Step 2: Travel
    travel: {
      title: "Informazioni sul viaggio",
      destinations: "Paesi di destinazione",
      country: "Paese",
      country_placeholder: "Cercare un paese...",
      add_country: "Aggiungi un paese",
      departure: "Partenza",
      return: "Ritorno",
      specify: "Specificare",
      reason: "Scopo del viaggio",
      reason_organized: "Turismo organizzato",
      reason_independent: "Turismo indipendente",
      reason_business: "Viaggio d'affari",
      reason_adventure: "Avventura",
      reason_family: "Visita ad amici/familiari",
      reason_humanitarian: "Missione umanitaria",
      reason_pilgrimage: "Pellegrinaggio",
      reason_expatriation: "Espatrio",
      reason_other: "Altro",
      travel_reason: "Qual è lo scopo del viaggio?",
      travel_reason_options: {
        tourisme_organise: "Turismo organizzato",
        tourisme_independant: "Turismo indipendente",
        affaires: "Viaggio d'affari",
        aventure: "Avventura",
        visite_famille: "Visita ad amici o familiari",
        humanitaire: "Missione umanitaria",
        pelerinage: "Pellegrinaggio",
        expatriation: "Espatrio",
        autre: "Altro",
        aucune: "Nessuna delle precedenti"
      },
      specify_other: "Specificare",
      accommodation: "Che tipo di alloggio avete previsto?",
      accommodation_undecided: "Non ancora deciso",
      accommodation_local: "Presso abitanti locali",
      accommodation_hotel: "Hotel",
      accommodation_other: "Altro",
      accommodation_options: {
        pas_decide: "Non ancora deciso",
        habitant: "Presso abitanti locali",
        hotel: "Hotel",
        autre: "Altro"
      },
      activities: "Avete previsto una di queste attività?",
      activity_mountaineering: "Alpinismo",
      activity_hiking: "Escursionismo",
      activity_diving: "Immersione",
      activity_rafting: "Rafting",
      activity_cycling: "Ciclismo",
      activity_snorkeling: "Snorkeling",
      activity_other: "Altro",
      activity_none: "Nessuna di queste attività",
      activities_options: {
        alpinisme: "Alpinismo",
        randonnee: "Escursionismo",
        plongee: "Immersione",
        rafting: "Rafting",
        velo: "Ciclismo",
        snorkeling: "Snorkeling",
        autre: "Altro",
        aucune: "Nessuna di queste attività"
      },
      rural: "Soggiorno in zona rurale o isolata?",
      rural_stay: "Prevedete di soggiornare in zone rurali o isolate?",
      yes: "Sì",
      no: "No"
    },

    // Step 3: Health
    health: {
      title: "Informazioni sulla salute",
      weight: "Qual è il vostro peso?",
      weight_unit: "kg",

      reproductive_title: "Salute riproduttiva",
      reproductive_ask: "Desidera rispondere alle domande sulla salute riproduttiva?",
      pregnancy: "È possibile che sia incinta o prevede di esserlo nei prossimi mesi?",
      contraception: "Usa contraccettivi?",
      breastfeeding: "Sta allattando?",
      last_menses: "Data dell'ultima mestruazione",
      last_menses_hint: "Lasciare vuoto se non applicabile",
      yes: "Sì",
      no: "No",
      not_applicable: "Non applicabile",

      allergies_title: "Allergie",
      has_allergies: "Ha delle allergie?",
      allergy_types: "Tipi di allergie",
      allergy_eggs: "Uova",
      allergy_medication: "Farmaci",
      allergy_food: "Alimenti",
      allergy_environment: "Ambiente",
      allergy_other: "Altro",
      allergies_details: "Specifichi le sue allergie e tipo di reazione",
      allergies_details_placeholder: "Es: Penicillina - orticaria, frutti di mare - anafilassi...",

      diseases_title: "Malattie specifiche",
      dengue: "Ha avuto la dengue?",
      chickenpox_disease: "Ha avuto la varicella (malattia)?",
      chickenpox_vaccine: "È stato vaccinato contro la varicella?",

      vaccination_history: "Storia vaccinale",
      vaccination_problem: "Ha avuto problemi con vaccinazioni precedenti?",
      vaccination_problem_details: "Descriva il problema",

      comorbidities_title: "Anamnesi medica",
      comorbidities: "Soffre di...?",
      comorbidities_question: "Soffre o ha sofferto di...?",
      comorbidity_none: "Nessuna malattia cronica",
      comorbidities_none: "Nessuna malattia cronica",
      comorbidity_group_immune: "Sistema immunitario",
      comorbidity_group_cancer: "Tumori e malattie del sangue",
      comorbidity_group_cardio: "Cardiovascolare",
      comorbidity_group_metabolic: "Metabolico",
      comorbidity_group_respiratory: "Respiratorio",
      comorbidity_group_digestive: "Digestivo",
      comorbidity_group_rheumatic: "Reumatologico",
      comorbidity_group_neuro: "Neurologico",
      comorbidity_group_mental: "Salute mentale",
      comorbidity_group_other: "Altro",
      comorbidity_hiv: "HIV",
      comorbidity_thymus: "Problema del timo",
      comorbidity_spleen: "Assenza della milza",
      comorbidity_cancer: "Tumore",
      comorbidity_hematologic: "Malattia del sangue",
      comorbidity_hypertension: "Ipertensione",
      comorbidity_heart: "Malattia cardiaca",
      comorbidity_diabetes: "Diabete",
      comorbidity_asthma: "Asma",
      comorbidity_inflammatory: "Malattia infiammatoria (Crohn, RCU)",
      comorbidity_digestive: "Malattia digestiva cronica",
      comorbidity_rheumatic: "Poliartrite, lupus, ecc.",
      comorbidity_epilepsy: "Epilessia",
      comorbidity_muscular: "Malattia muscolare (miastenia)",
      comorbidity_psychiatric: "Malattia psichiatrica",
      comorbidity_surgery: "Chirurgia/immobilizzazione recente (< 6 settimane)",
      comorbidity_other: "Altro",
      comorbidity_other_details: "Dettagli",
      comorbidities_groups: {
        immune: "Sistema immunitario",
        cancer: "Tumori e malattie del sangue",
        cardiovascular: "Cardiovascolare",
        metabolic: "Metabolico",
        respiratory: "Respiratorio",
        digestive: "Digestivo",
        rheumatologic: "Reumatologico",
        neurologic: "Neurologico",
        mental: "Salute mentale",
        other: "Altro"
      },
      comorbidities_options: {
        hiv: "HIV",
        thymus: "Problema del timo (timoma, rimozione, DiGeorge)",
        spleen: "Assenza della milza",
        cancer: "Tumore",
        hematologic: "Malattia del sangue (leucemia, linfoma)",
        hypertension: "Ipertensione",
        cardiac: "Malattia cardiaca",
        diabetes: "Diabete",
        asthma: "Asma",
        ibd: "Malattia infiammatoria intestinale (Crohn, RCU)",
        chronic_digestive: "Malattia digestiva cronica (gastrite, reflusso)",
        rheumatologic: "Malattia reumatica (artrite reumatoide, lupus)",
        epilepsy: "Epilessia",
        muscular: "Malattia muscolare (miastenia)",
        psychiatric: "Condizione psichiatrica / psicologica",
        surgery: "Chirurgia o immobilizzazione recente (< 6 settimane)",
        autre: "Altro"
      },
      hiv_cd4: "Ultimo valore CD4",
      hiv_cd4_date: "Data",
      comorbidity_other_detail: "Specificare",
      recent_chemotherapy: "Ha fatto chemioterapia, radioterapia o trattamento immunomodulatore negli ultimi 6 mesi?",
      psychiatric_details: "Descriva la sua situazione",

      medications_title: "Farmaci",
      takes_medication: "Assume farmaci regolarmente? (inclusa contraccezione)",
      medication_details: "Quali farmaci assume?",
      medication_placeholder: "Es: Metformina 500mg, Lisinopril 10mg..."
    },

    // Step 4: Vaccination
    vaccination: {
      title: "Libretto delle vaccinazioni",
      upload_instruction: "Carichi il suo libretto delle vaccinazioni",
      dropzone_text: "Trascini i file qui o clicchi per sfogliare",
      dropzone_mobile: "Tocchi per aggiungere file",
      formats: "Formati accettati: PDF, JPG, PNG, HEIC",
      limits: "Massimo 10 file, 10 MB ciascuno",
      files_added: "File aggiunti",
      no_card: "Non ho un libretto delle vaccinazioni"
    },

    // Step 5: Referral
    referral: {
      title: "Come ci ha trovato?",
      subtitle: "Queste domande sono facoltative",
      source: "Come ha sentito parlare del nostro servizio?",
      source_internet: "Ricerca Internet",
      source_social: "Social media",
      source_doctor: "Medico/professionista sanitario",
      source_friend: "Amici/familiari",
      source_pharmacy: "Farmacia",
      source_employer: "Datore di lavoro",
      source_travel_agency: "Agenzia di viaggi",
      source_insurance: "Compagnia assicurativa",
      source_returning: "Già paziente",
      source_advertising: "Pubblicità",
      source_other: "Altro",
      source_options: {
        internet: "Ricerca Internet (Google, Bing...)",
        social_media: "Social media",
        doctor: "Riferimento medico/professionista sanitario",
        friend: "Raccomandazione di amici o familiari",
        pharmacy: "Farmacia",
        employer: "Datore di lavoro",
        travel_agency: "Agenzia di viaggi",
        insurance: "Compagnia assicurativa",
        returning: "Paziente/cliente di ritorno",
        advertisement: "Pubblicità",
        autre: "Altro"
      },
      search_terms: "Quali termini di ricerca ha usato?",
      social_platform: "Quale piattaforma?",
      social_options: {
        facebook: "Facebook",
        instagram: "Instagram",
        linkedin: "LinkedIn",
        twitter: "Twitter/X",
        tiktok: "TikTok",
        youtube: "YouTube",
        autre: "Altro"
      },
      doctor_name: "Nome del medico/clinica",
      friend_name: "Nome della persona (facoltativo)",
      can_contact: "Possiamo contattarli per ringraziarli?",
      ad_location: "Dove ha visto la pubblicità?",
      ad_options: {
        online: "Online (sito web/banner)",
        print: "Stampa (giornale/rivista)",
        radio: "Radio",
        tv: "Televisione",
        poster: "Poster/Volantino",
        autre: "Altro"
      },
      other_specify: "Specificare",
      choice_factor: "Qual è stato il fattore principale nella scelta del nostro servizio?",
      factor_location: "Posizione",
      factor_price: "Prezzo",
      factor_reputation: "Reputazione",
      factor_recommendation: "Raccomandazione",
      factor_expertise: "Competenza",
      factor_availability: "Disponibilità",
      factor_languages: "Lingue parlate",
      factor_other: "Altro",
      choice_options: {
        location: "Posizione/Comodità",
        price: "Prezzo",
        reputation: "Reputazione/Recensioni",
        recommendation: "Raccomandazione",
        expertise: "Competenza specializzata",
        availability: "Disponibilità appuntamenti",
        languages: "Opzioni linguistiche",
        autre: "Altro"
      },
      comment: "Commento",
      comment_placeholder: "C'è qualcosa che vorrebbe aggiungere?"
    },

    // Step 6: Summary
    summary: {
      title: "Verifichi le sue informazioni",
      subtitle: "Controlli le risposte prima di inviare",
      address: "Indirizzo",
      section_identity: "Identità",
      section_travel: "Viaggio",
      section_health: "Salute",
      section_vaccination: "Libretto vaccinazioni",
      section_referral: "Referenza",
      destinations_label: "Destinazioni",
      allergies_label: "Allergie",
      comorbidities_label: "Anamnesi",
      medications_label: "Farmaci",
      files_label: "File",
      consent: "Dichiaro di aver risposto a questo questionario in modo onesto e sincero.",
      consent_text: "Dichiaro di aver risposto a questo questionario in modo onesto e sincero. Riconosco che queste informazioni saranno utilizzate per valutare il mio stato di salute per la consultazione pre-viaggio. Capisco che informazioni errate o incomplete potrebbero compromettere la mia sicurezza e salute.",
      consent_required: "Deve accettare la dichiarazione per continuare"
    },

    // Validation errors
    errors: {
      required: "Questo campo è obbligatorio",
      invalid_email: "Indirizzo email non valido",
      invalid_date: "Data non valida",
      invalid_phone: "Numero di telefono non valido",
      invalid_number: "Numero non valido",
      min_value: "Il valore minimo è {min}",
      max_value: "Il valore massimo è {max}",
      date_future: "La data deve essere nel futuro",
      date_past: "La data deve essere nel passato",
      departure_after_return: "La data di partenza deve essere prima del ritorno",
      departure_before_return: "La data di partenza deve essere prima del ritorno",
      min_destination: "Aggiunga almeno una destinazione",
      min_destinations: "Aggiunga almeno una destinazione",
      min_selection: "Selezioni almeno un'opzione",
      file_too_large: "File {name} troppo grande (max 10 MB)",
      too_many_files: "Massimo 10 file consentiti",
      invalid_file_type: "Tipo di file {name} non consentito",
      vaccination_required: "Aggiunga almeno un file o selezioni la casella",
      consent_required: "Deve accettare la dichiarazione",
      submission_failed: "L'invio non è riuscito. Riprovi.",
      captcha_required: "Si prega di completare il CAPTCHA"
    },

    // Messages
    messages: {
      draft_saved: "Bozza salvata",
      draft_restored: "La bozza è stata ripristinata",
      form_submitted: "Modulo inviato con successo",
      confirmation_sent: "Un'email di conferma è stata inviata a {email}",
      upload_progress: "Caricamento in corso...",
      processing: "Elaborazione in corso...",
      submitting: "Invio in corso...",
      error_occurred: "Si è verificato un errore. Riprovi.",
      connection_error: "Errore di connessione. Verifichi la connessione internet.",
      success_title: "Modulo inviato",
      success_message: "Il modulo è stato inviato con successo. Un'email di conferma è stata inviata a:",
      no_results: "Nessun risultato trovato",
      no_files: "Nessun file caricato",
      no_referral: "Nessuna informazione fornita"
    },

    // Misc
    optional: "facoltativo",
    loading: "Caricamento...",
    of: "di"
  },

  es: {
    // Header
    lang_selector: "Idioma",
    site_title: "TravelDoctor.ch",
    form_subtitle: "Formulario del paciente",

    // Steps
    steps: {
      identity: "Identidad",
      travel: "Viaje",
      health: "Salud",
      vaccination: "Vacunaciones",
      referral: "Referencia",
      summary: "Resumen"
    },

    // Buttons
    buttons: {
      next: "Siguiente",
      previous: "Anterior",
      submit: "Confirmar y enviar",
      add: "Añadir",
      remove: "Eliminar",
      edit: "Editar",
      modify: "Modificar",
      add_country: "Añadir un país",
      add_files: "Añadir archivos",
      browse: "Explorar",
      yes: "Sí",
      no: "No",
      not_applicable: "No aplica",
      optional: "Opcional",
      back_to_site: "Volver al sitio"
    },

    // Step 1: Identity
    identity: {
      title: "Información personal",
      subtitle: "Una sola persona por formulario",
      full_name: "Nombre Apellido",
      full_name_placeholder: "Juan García",
      full_name_hint: "Una sola persona por formulario",
      birthdate: "Fecha de nacimiento",
      email: "Email",
      email_placeholder: "su@email.com",
      email_hint: "La confirmación se enviará a este email",
      phone: "Teléfono",
      phone_placeholder: "+41 79 123 45 67",
      street: "Calle",
      street_placeholder: "Calle Mayor 10",
      postal_code: "Código postal",
      city: "Ciudad",
      country: "País de residencia",
      country_placeholder: "Buscar un país...",
      gender: "Género",
      gender_female: "Mujer",
      gender_male: "Hombre",
      gender_nonbinary: "No binario",
      gender_other: "Otro",
      gender_options: {
        femme: "Mujer",
        homme: "Hombre",
        non_binaire: "No binario",
        autre: "Otro"
      },
      avs: "Número AVS (Seguro Social Suizo)",
      avs_placeholder: "756.1234.5678.90",
      avs_hint: "Recomendado para evitar confusiones de identidad"
    },

    // Step 2: Travel
    travel: {
      title: "Información del viaje",
      destinations: "Países de destino",
      country: "País",
      country_placeholder: "Buscar un país...",
      add_country: "Añadir un país",
      departure: "Salida",
      return: "Regreso",
      specify: "Especifique",
      reason: "Motivo del viaje",
      reason_organized: "Turismo organizado",
      reason_independent: "Turismo independiente",
      reason_business: "Viaje de negocios",
      reason_adventure: "Aventura",
      reason_family: "Visita a amigos/familiares",
      reason_humanitarian: "Misión humanitaria",
      reason_pilgrimage: "Peregrinación",
      reason_expatriation: "Expatriación",
      reason_other: "Otro",
      travel_reason: "¿Cuál es el propósito de su viaje?",
      travel_reason_options: {
        tourisme_organise: "Turismo organizado",
        tourisme_independant: "Turismo independiente",
        affaires: "Viaje de negocios",
        aventure: "Aventura",
        visite_famille: "Visita a amigos o familiares",
        humanitaire: "Misión humanitaria",
        pelerinage: "Peregrinación",
        expatriation: "Expatriación",
        autre: "Otro",
        aucune: "Ninguna de las anteriores"
      },
      specify_other: "Especifique",
      accommodation: "¿Qué tipo de alojamiento tiene previsto?",
      accommodation_undecided: "Aún no decidido",
      accommodation_local: "Con habitantes locales",
      accommodation_hotel: "Hotel",
      accommodation_other: "Otro",
      accommodation_options: {
        pas_decide: "Aún no decidido",
        habitant: "Con habitantes locales",
        hotel: "Hotel",
        autre: "Otro"
      },
      activities: "¿Tiene prevista alguna de estas actividades?",
      activity_mountaineering: "Alpinismo",
      activity_hiking: "Senderismo",
      activity_diving: "Buceo",
      activity_rafting: "Rafting",
      activity_cycling: "Ciclismo",
      activity_snorkeling: "Snorkel",
      activity_other: "Otro",
      activity_none: "Ninguna de estas actividades",
      activities_options: {
        alpinisme: "Alpinismo",
        randonnee: "Senderismo",
        plongee: "Buceo",
        rafting: "Rafting",
        velo: "Ciclismo",
        snorkeling: "Snorkel",
        autre: "Otro",
        aucune: "Ninguna de estas actividades"
      },
      rural: "¿Estancia en zona rural o aislada?",
      rural_stay: "¿Tiene previsto alojarse en zonas rurales o aisladas?",
      yes: "Sí",
      no: "No"
    },

    // Step 3: Health
    health: {
      title: "Información de salud",
      weight: "¿Cuál es su peso?",
      weight_unit: "kg",

      reproductive_title: "Salud reproductiva",
      reproductive_ask: "¿Desea responder a las preguntas sobre salud reproductiva?",
      pregnancy: "¿Es posible que esté embarazada o planea estarlo en los próximos meses?",
      contraception: "¿Usa anticonceptivos?",
      breastfeeding: "¿Está amamantando?",
      last_menses: "Fecha de la última menstruación",
      last_menses_hint: "Dejar vacío si no aplica",
      yes: "Sí",
      no: "No",
      not_applicable: "No aplica",

      allergies_title: "Alergias",
      has_allergies: "¿Tiene alergias?",
      allergy_types: "Tipos de alergias",
      allergy_eggs: "Huevos",
      allergy_medication: "Medicamentos",
      allergy_food: "Alimentos",
      allergy_environment: "Ambiente",
      allergy_other: "Otro",
      allergies_details: "Especifique sus alergias y tipo de reacción",
      allergies_details_placeholder: "Ej: Penicilina - urticaria, mariscos - anafilaxia...",

      diseases_title: "Enfermedades específicas",
      dengue: "¿Ha tenido dengue?",
      chickenpox_disease: "¿Ha tenido varicela (la enfermedad)?",
      chickenpox_vaccine: "¿Ha sido vacunado contra la varicela?",

      vaccination_history: "Historial de vacunación",
      vaccination_problem: "¿Ha tenido problemas con alguna vacuna anterior?",
      vaccination_problem_details: "Describa el problema",

      comorbidities_title: "Historial médico",
      comorbidities: "¿Padece de...?",
      comorbidities_question: "¿Padece o ha padecido de...?",
      comorbidity_none: "Ninguna enfermedad crónica",
      comorbidities_none: "Ninguna enfermedad crónica",
      comorbidity_group_immune: "Sistema inmunitario",
      comorbidity_group_cancer: "Cáncer y enfermedades de la sangre",
      comorbidity_group_cardio: "Cardiovascular",
      comorbidity_group_metabolic: "Metabólico",
      comorbidity_group_respiratory: "Respiratorio",
      comorbidity_group_digestive: "Digestivo",
      comorbidity_group_rheumatic: "Reumatológico",
      comorbidity_group_neuro: "Neurológico",
      comorbidity_group_mental: "Salud mental",
      comorbidity_group_other: "Otro",
      comorbidity_hiv: "VIH",
      comorbidity_thymus: "Problema del timo",
      comorbidity_spleen: "Ausencia del bazo",
      comorbidity_cancer: "Cáncer",
      comorbidity_hematologic: "Enfermedad de la sangre",
      comorbidity_hypertension: "Hipertensión",
      comorbidity_heart: "Enfermedad cardíaca",
      comorbidity_diabetes: "Diabetes",
      comorbidity_asthma: "Asma",
      comorbidity_inflammatory: "Enfermedad inflamatoria (Crohn, CU)",
      comorbidity_digestive: "Enfermedad digestiva crónica",
      comorbidity_rheumatic: "Poliartritis, lupus, etc.",
      comorbidity_epilepsy: "Epilepsia",
      comorbidity_muscular: "Enfermedad muscular (miastenia)",
      comorbidity_psychiatric: "Enfermedad psiquiátrica",
      comorbidity_surgery: "Cirugía/inmovilización reciente (< 6 semanas)",
      comorbidity_other: "Otro",
      comorbidity_other_details: "Detalles",
      comorbidities_groups: {
        immune: "Sistema inmunitario",
        cancer: "Cáncer y enfermedades de la sangre",
        cardiovascular: "Cardiovascular",
        metabolic: "Metabólico",
        respiratory: "Respiratorio",
        digestive: "Digestivo",
        rheumatologic: "Reumatológico",
        neurologic: "Neurológico",
        mental: "Salud mental",
        other: "Otro"
      },
      comorbidities_options: {
        hiv: "VIH",
        thymus: "Problema del timo (timoma, extirpación, DiGeorge)",
        spleen: "Ausencia del bazo",
        cancer: "Cáncer",
        hematologic: "Enfermedad de la sangre (leucemia, linfoma)",
        hypertension: "Hipertensión",
        cardiac: "Enfermedad cardíaca",
        diabetes: "Diabetes",
        asthma: "Asma",
        ibd: "Enfermedad inflamatoria intestinal (Crohn, CU)",
        chronic_digestive: "Enfermedad digestiva crónica (gastritis, reflujo)",
        rheumatologic: "Enfermedad reumática (artritis reumatoide, lupus)",
        epilepsy: "Epilepsia",
        muscular: "Enfermedad muscular (miastenia)",
        psychiatric: "Condición psiquiátrica / psicológica",
        surgery: "Cirugía o inmovilización reciente (< 6 semanas)",
        autre: "Otro"
      },
      hiv_cd4: "Último recuento de CD4",
      hiv_cd4_date: "Fecha",
      comorbidity_other_detail: "Especifique",
      recent_chemotherapy: "¿Ha recibido quimioterapia, radioterapia o tratamiento inmunomodulador en los últimos 6 meses?",
      psychiatric_details: "Describa su situación",

      medications_title: "Medicamentos",
      takes_medication: "¿Toma medicamentos regularmente? (incluyendo anticonceptivos)",
      medication_details: "¿Qué medicamentos toma?",
      medication_placeholder: "Ej: Metformina 500mg, Lisinopril 10mg..."
    },

    // Step 4: Vaccination
    vaccination: {
      title: "Cartilla de vacunación",
      upload_instruction: "Suba su cartilla de vacunación",
      dropzone_text: "Arrastre archivos aquí o haga clic para explorar",
      dropzone_mobile: "Toque para añadir archivos",
      formats: "Formatos aceptados: PDF, JPG, PNG, HEIC",
      limits: "Máximo 10 archivos, 10 MB cada uno",
      files_added: "Archivos añadidos",
      no_card: "No tengo cartilla de vacunación"
    },

    // Step 5: Referral
    referral: {
      title: "¿Cómo nos encontró?",
      subtitle: "Estas preguntas son opcionales",
      source: "¿Cómo oyó hablar de nuestro servicio?",
      source_internet: "Búsqueda en Internet",
      source_social: "Redes sociales",
      source_doctor: "Médico/profesional de salud",
      source_friend: "Amigos/familiares",
      source_pharmacy: "Farmacia",
      source_employer: "Empleador",
      source_travel_agency: "Agencia de viajes",
      source_insurance: "Compañía de seguros",
      source_returning: "Ya paciente",
      source_advertising: "Publicidad",
      source_other: "Otro",
      source_options: {
        internet: "Búsqueda en Internet (Google, Bing...)",
        social_media: "Redes sociales",
        doctor: "Referencia médica/profesional de salud",
        friend: "Recomendación de amigos o familiares",
        pharmacy: "Farmacia",
        employer: "Lugar de trabajo/Empleador",
        travel_agency: "Agencia de viajes",
        insurance: "Compañía de seguros",
        returning: "Paciente/cliente que regresa",
        advertisement: "Publicidad",
        autre: "Otro"
      },
      search_terms: "¿Qué términos de búsqueda usó?",
      social_platform: "¿Qué plataforma?",
      social_options: {
        facebook: "Facebook",
        instagram: "Instagram",
        linkedin: "LinkedIn",
        twitter: "Twitter/X",
        tiktok: "TikTok",
        youtube: "YouTube",
        autre: "Otro"
      },
      doctor_name: "Nombre del médico/clínica",
      friend_name: "Nombre de la persona (opcional)",
      can_contact: "¿Podemos contactarlos para agradecerles?",
      ad_location: "¿Dónde vio la publicidad?",
      ad_options: {
        online: "En línea (sitio web/banner)",
        print: "Prensa (periódico/revista)",
        radio: "Radio",
        tv: "Televisión",
        poster: "Cartel/Folleto",
        autre: "Otro"
      },
      other_specify: "Por favor especifique",
      choice_factor: "¿Cuál fue el factor principal en la elección de nuestro servicio?",
      factor_location: "Ubicación",
      factor_price: "Precio",
      factor_reputation: "Reputación",
      factor_recommendation: "Recomendación",
      factor_expertise: "Experiencia",
      factor_availability: "Disponibilidad",
      factor_languages: "Idiomas hablados",
      factor_other: "Otro",
      choice_options: {
        location: "Ubicación/Comodidad",
        price: "Precio",
        reputation: "Reputación/Opiniones",
        recommendation: "Recomendación",
        expertise: "Experiencia especializada",
        availability: "Disponibilidad de citas",
        languages: "Opciones de idioma",
        autre: "Otro"
      },
      comment: "Comentario",
      comment_placeholder: "¿Hay algo que le gustaría añadir?"
    },

    // Step 6: Summary
    summary: {
      title: "Revise su información",
      subtitle: "Por favor verifique sus respuestas antes de enviar",
      address: "Dirección",
      section_identity: "Identidad",
      section_travel: "Viaje",
      section_health: "Salud",
      section_vaccination: "Cartilla de vacunación",
      section_referral: "Referencia",
      destinations_label: "Destinos",
      allergies_label: "Alergias",
      comorbidities_label: "Historial médico",
      medications_label: "Medicamentos",
      files_label: "Archivos",
      consent: "Declaro que he respondido a este cuestionario de manera honesta y sincera.",
      consent_text: "Declaro que he respondido a este cuestionario de manera honesta y sincera. Reconozco que esta información se utilizará para evaluar mi estado de salud para mi consulta previa al viaje. Entiendo que la información incorrecta o incompleta podría comprometer mi seguridad y salud.",
      consent_required: "Debe aceptar la declaración para continuar"
    },

    // Validation errors
    errors: {
      required: "Este campo es obligatorio",
      invalid_email: "Dirección de email no válida",
      invalid_date: "Fecha no válida",
      invalid_phone: "Número de teléfono no válido",
      invalid_number: "Número no válido",
      min_value: "El valor mínimo es {min}",
      max_value: "El valor máximo es {max}",
      date_future: "La fecha debe ser en el futuro",
      date_past: "La fecha debe ser en el pasado",
      departure_after_return: "La fecha de salida debe ser anterior al regreso",
      departure_before_return: "La fecha de salida debe ser anterior al regreso",
      min_destination: "Añada al menos un destino",
      min_destinations: "Añada al menos un destino",
      min_selection: "Seleccione al menos una opción",
      file_too_large: "Archivo {name} demasiado grande (máx 10 MB)",
      too_many_files: "Máximo 10 archivos permitidos",
      invalid_file_type: "Tipo de archivo {name} no permitido",
      vaccination_required: "Añada al menos un archivo o marque la casilla",
      consent_required: "Debe aceptar la declaración",
      submission_failed: "El envío ha fallado. Inténtelo de nuevo.",
      captcha_required: "Por favor complete el CAPTCHA"
    },

    // Messages
    messages: {
      draft_saved: "Borrador guardado",
      draft_restored: "Su borrador ha sido restaurado",
      form_submitted: "Formulario enviado con éxito",
      confirmation_sent: "Se ha enviado un email de confirmación a {email}",
      upload_progress: "Subiendo...",
      processing: "Procesando...",
      submitting: "Enviando...",
      error_occurred: "Ha ocurrido un error. Por favor, inténtelo de nuevo.",
      connection_error: "Error de conexión. Verifique su conexión a internet.",
      success_title: "Formulario enviado",
      success_message: "Su formulario ha sido enviado con éxito. Se ha enviado un email de confirmación a:",
      no_results: "No se encontraron resultados",
      no_files: "No se han subido archivos",
      no_referral: "No se proporcionó información"
    },

    // Misc
    optional: "opcional",
    loading: "Cargando...",
    of: "de"
  }
};

// Current language
let currentLang = 'fr';

// Get translation by path (e.g., 'identity.full_name')
function t(path) {
  const keys = path.split('.');
  let value = TRANSLATIONS[currentLang];

  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = value[key];
    } else {
      // Fallback to French
      value = TRANSLATIONS['fr'];
      for (const k of keys) {
        if (value && typeof value === 'object' && k in value) {
          value = value[k];
        } else {
          return path; // Return path if translation not found
        }
      }
      break;
    }
  }

  return value;
}

// Set current language
function setLanguage(lang) {
  if (TRANSLATIONS[lang]) {
    currentLang = lang;
    localStorage.setItem('formLanguage', lang);
    updatePageTranslations();
    return true;
  }
  return false;
}

// Get current language
function getLanguage() {
  return currentLang;
}

// Initialize language from localStorage or browser
function initLanguage() {
  const saved = localStorage.getItem('formLanguage');
  if (saved && TRANSLATIONS[saved]) {
    currentLang = saved;
  } else {
    // Detect browser language
    const browserLang = navigator.language.substring(0, 2).toLowerCase();
    if (TRANSLATIONS[browserLang]) {
      currentLang = browserLang;
    }
  }
  return currentLang;
}

// Update all translations on the page
function updatePageTranslations() {
  // Update elements with data-translate attribute
  document.querySelectorAll('[data-translate]').forEach(el => {
    const key = el.getAttribute('data-translate');
    const translation = t(key);
    if (translation && translation !== key) {
      el.textContent = translation;
    }
  });

  // Update elements with data-i18n attribute (legacy)
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const translation = t(key);
    if (translation && translation !== key) {
      el.textContent = translation;
    }
  });

  // Update placeholders with data-placeholder
  document.querySelectorAll('[data-placeholder]').forEach(el => {
    const key = el.getAttribute('data-placeholder');
    const translation = t(key);
    if (translation && translation !== key) {
      el.placeholder = translation;
    }
  });

  // Update placeholders with data-i18n-placeholder (legacy)
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    const translation = t(key);
    if (translation && translation !== key) {
      el.placeholder = translation;
    }
  });

  // Update titles
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    const key = el.getAttribute('data-i18n-title');
    const translation = t(key);
    if (translation && translation !== key) {
      el.title = translation;
    }
  });

  // Update language selector
  const langSelect = document.getElementById('language-select');
  if (langSelect) {
    langSelect.value = currentLang;
  }

  // Dispatch event for custom handlers
  document.dispatchEvent(new CustomEvent('languageChanged', { detail: { language: currentLang } }));
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TRANSLATIONS, t, setLanguage, getLanguage, initLanguage, updatePageTranslations };
}
