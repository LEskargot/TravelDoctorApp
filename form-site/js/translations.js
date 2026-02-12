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
      dont_know: "Je ne sais pas",
      back_to_site: "Retour au site",
      copy_link: "Copier le lien"
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
      gender: "Sexe biologique",
      gender_hint: "Information nécessaire pour adapter les recommandations médicales",
      gender_female: "Femme",
      gender_male: "Homme",
      gender_options: {
        femme: "Femme",
        homme: "Homme"
      },
      avs: "Numéro AVS",
      avs_placeholder: "756.1234.5678.90",
      avs_hint: "Permet de retrouver votre dossier facilement"
    },

    // Step 2: Travel
    travel: {
      title: "Informations sur votre voyage",
      trip_dates: "Dates du voyage",
      trip_departure: "Départ du voyage",
      trip_return: "Retour du voyage",
      flexible_dates: "Je ne connais pas encore les dates exactes par pays",
      estimated_duration: "Durée estimée",
      duration_options: {
        few_days: "Quelques jours",
        less_1_week: "< 1 semaine",
        "1_2_weeks": "1 à 2 semaines",
        "2_3_weeks": "2 à 3 semaines",
        "1_month": "~1 mois",
        "1_2_months": "1 à 2 mois",
        "2_3_months": "2 à 3 mois",
        "3_6_months": "3 à 6 mois",
        over_6_months: "> 6 mois"
      },
      destinations: "Pays de destination",
      country: "Pays",
      country_placeholder: "Rechercher un pays...",
      add_country: "Ajouter un pays",
      departure: "Départ",
      return: "Retour",
      specify: "Précisez",
      reason: "Quel est le but de votre voyage ?",
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
      activities: "Prévoyez-vous des activités particulières ?",
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
      rural: "Prévoyez-vous un séjour en zone rurale ou isolée ?",
      rural_hint: "Éloigné d'un hôpital ou d'une pharmacie",
      rural_stay: "Prévoyez-vous un séjour en zone rurale ou isolée ?",
      yes: "Oui",
      no: "Non"
    },

    // Step 3: Health
    health: {
      title: "Informations sur votre santé",
      weight: "Poids (kg)",
      weight_unit: "kg",
      weight_hint: "Pour les enfants, indiquez le poids actuel",

      // Reproductive
      reproductive_title: "Santé reproductive",
      show_reproductive: "Souhaitez-vous répondre aux questions sur la santé reproductive ?",
      reproductive_ask: "Souhaitez-vous répondre aux questions sur la santé reproductive ?",
      pregnancy: "Êtes-vous enceinte ou envisagez-vous une grossesse dans les prochains mois ?",
      contraception: "Utilisez-vous une contraception ?",
      breastfeeding: "Allaitez-vous actuellement ?",
      last_menses: "Dernières règles",
      last_menses_hint: "Laissez vide si pas de règles",
      yes: "Oui",
      no: "Non",
      not_applicable: "Non applicable",

      // Allergies
      allergies_title: "Allergies",
      allergy_question: "Avez-vous des allergies ?",
      allergy_eggs: "Œufs",
      allergy_medication: "Médicaments",
      allergy_food: "Aliments",
      allergy_environment: "Environnement",
      allergy_other: "Autre",
      allergy_none: "Aucune allergie",
      allergy_eggs_details: "Précisez votre allergie aux œufs",
      allergy_eggs_placeholder: "Ex: réaction cutanée, choc anaphylactique...",
      allergy_medication_details: "Précisez votre allergie aux médicaments",
      allergy_medication_placeholder: "Ex: Pénicilline - urticaire...",
      allergy_food_details: "Précisez votre allergie alimentaire",
      allergy_food_placeholder: "Ex: fruits de mer, arachides...",
      allergy_environment_details: "Précisez votre allergie environnementale",
      allergy_environment_placeholder: "Ex: pollen, acariens, animaux...",
      allergy_other_details: "Précisez votre autre allergie",
      allergy_other_placeholder: "Décrivez votre allergie et la réaction...",

      // Specific diseases
      diseases_title: "Maladies spécifiques",
      dengue: "Avez-vous eu la dengue ?",
      chickenpox_disease: "Avez-vous eu la varicelle ?",
      chickenpox_vaccine: "Avez-vous été vacciné(e) contre la varicelle ?",

      // Vaccination history
      vaccination_history_title: "Vaccinations antérieures",
      vaccination_history: "Vaccinations antérieures",
      vaccination_problem: "Avez-vous déjà eu un effet indésirable grave après un vaccin ?",
      vaccination_problem_hint: "Ex: fièvre élevée, gonflement important, réaction allergique sévère...",
      vaccination_problem_details: "Détails",

      // Comorbidities
      comorbidities_title: "Maladies chroniques",
      comorbidities: "Avez-vous ou avez-vous eu l'une des maladies suivantes ?",
      comorbidities_question: "Avez-vous ou avez-vous eu l'une des maladies suivantes ?",
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
      comorbidity_thymus_placeholder: "Thymome, ablation, syndrome de DiGeorge...",
      comorbidity_spleen_placeholder: "Splénectomie, congénitale...",
      comorbidity_cancer_placeholder: "Type de cancer, date du diagnostic...",
      comorbidity_hematologic_placeholder: "Leucémie, lymphome, anémie falciforme...",
      comorbidity_heart_placeholder: "Insuffisance cardiaque, arythmie, valvulopathie...",
      comorbidity_diabetes_placeholder: "Type 1, type 2, gestationnel...",
      comorbidity_inflammatory: "Maladie inflammatoire intestinale",
      comorbidity_inflammatory_placeholder: "Crohn, RCH...",
      comorbidity_digestive: "Maladie digestive chronique",
      comorbidity_digestive_placeholder: "Gastrite, reflux, hépatite...",
      comorbidity_rheumatic: "Maladie rhumatologique",
      comorbidity_rheumatic_placeholder: "Polyarthrite, lupus, spondylarthrite...",
      comorbidity_epilepsy: "Épilepsie",
      comorbidity_muscular: "Maladie musculaire",
      comorbidity_muscular_placeholder: "Myasthénie, dystrophie...",
      comorbidity_psychiatric: "Maladie psychiatrique",
      comorbidity_surgery: "Chirurgie/immobilisation récente (< 6 semaines)",
      comorbidity_surgery_placeholder: "Type d'intervention, date...",
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
      recent_chemotherapy: "Avez-vous reçu un traitement contre le cancer ou un traitement immunosuppresseur dans les 6 derniers mois ?",
      recent_chemotherapy_hint: "Chimiothérapie, radiothérapie, immunomodulateurs...",
      psychiatric_details: "Détails",

      // Medications
      medications_title: "Médicaments",
      takes_medication: "Prenez-vous des médicaments ?",
      takes_medication_hint: "Y compris pilule contraceptive, compléments alimentaires et traitements réguliers",
      medication_list: "Liste des médicaments",
      medication_details: "Quels médicaments prenez-vous?",
      medication_placeholder: "Ex: Metformine 500mg, Lisinopril 10mg..."
    },

    // Step 4: Vaccination
    vaccination: {
      title: "Carnet de vaccination",
      subtitle: "Importez votre carnet de vaccination (PDF ou photos)",
      upload_instruction: "Importez votre carnet de vaccination (PDF ou photos)",
      dropzone_text: "Glissez vos fichiers ici ou cliquez pour importer",
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
      title: "Comment nous avez-vous trouvé ?",
      subtitle: "Vos réponses nous aident à améliorer nos services",
      returning_question: "Avez-vous déjà consulté chez Travel Doctor ?",
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
      doctor_name_placeholder: "Nom du médecin ou du cabinet...",
      friend_name: "Nom",
      friend_name_placeholder: "Nom de la personne (facultatif)",
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
      choice_factor: "Qu'est-ce qui a motivé votre choix ?",
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
      trip_dates_required: "Les dates du voyage sont obligatoires",
      trip_departure_before_return: "Le départ du voyage doit être avant le retour",
      min_destination: "Ajoutez au moins un pays de destination",
      min_destinations: "Ajoutez au moins un pays de destination",
      min_selection: "Sélectionnez au moins une option",
      file_too_large: "Fichier {name} trop volumineux (max 10 MB)",
      too_many_files: "Maximum 10 fichiers autorisés",
      invalid_file_type: "Type de fichier {name} non autorisé",
      vaccination_required: "Ajoutez au moins un fichier ou cochez la case",
      consent_required: "Vous devez accepter la déclaration",
      submission_failed: "L'envoi a échoué. Veuillez réessayer.",
      weight_range: "Le poids doit être entre 2 et 400 kg",
      date_not_future: "Cette date ne peut pas être dans le futur",
      other_required: "Veuillez préciser votre choix",
      cd4_range: "La valeur CD4 doit être entre 0 et 5000"
    },

    // Warnings (soft, non-blocking)
    warnings: {
      date_in_past: "Cette date est dans le passé",
      long_duration: "Ce voyage dure plus de 2 ans"
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
      share_with_travelers: "Vous voyagez avec d'autres personnes ? Chacun doit remplir son propre formulaire.",
      share_message: "On a rendez-vous chez Travel Doctor. Remplis ce formulaire avant la consultation :",
      share_email_subject: "Formulaire Travel Doctor à remplir",
      link_copied: "Lien copié !",
      no_results: "Aucun résultat trouvé",
      no_files: "Aucun fichier téléversé",
      no_referral: "Aucune information fournie"
    },

    // Hints
    hints: {
      birthdate_max: "Date dans le passé",
      date_past_only: "Date dans le passé uniquement",
      weight_range: "Entre 2 et 400 kg"
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
      dont_know: "I don't know",
      back_to_site: "Back to site",
      copy_link: "Copy link"
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
      gender: "Biological sex",
      gender_hint: "Required to tailor medical recommendations",
      gender_female: "Female",
      gender_male: "Male",
      gender_options: {
        femme: "Female",
        homme: "Male"
      },
      avs: "AVS Number (Swiss Social Security)",
      avs_placeholder: "756.1234.5678.90",
      avs_hint: "Helps us find your records easily"
    },

    // Step 2: Travel
    travel: {
      title: "Travel information",
      trip_dates: "Trip dates",
      trip_departure: "Trip departure",
      trip_return: "Trip return",
      flexible_dates: "I don't know the exact dates per country yet",
      estimated_duration: "Estimated duration",
      duration_options: {
        few_days: "A few days",
        less_1_week: "< 1 week",
        "1_2_weeks": "1 to 2 weeks",
        "2_3_weeks": "2 to 3 weeks",
        "1_month": "~1 month",
        "1_2_months": "1 to 2 months",
        "2_3_months": "2 to 3 months",
        "3_6_months": "3 to 6 months",
        over_6_months: "> 6 months"
      },
      destinations: "Destination countries",
      country: "Country",
      country_placeholder: "Search for a country...",
      add_country: "Add a country",
      departure: "Departure",
      return: "Return",
      specify: "Please specify",
      reason: "What is the purpose of your trip?",
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
      activities: "Are you planning any particular activities?",
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
      rural: "Are you planning a stay in a rural or remote area?",
      rural_hint: "Far from a hospital or pharmacy",
      rural_stay: "Are you planning a stay in a rural or remote area?",
      yes: "Yes",
      no: "No"
    },

    // Step 3: Health
    health: {
      title: "Health information",
      weight: "What is your weight?",
      weight_unit: "kg",
      weight_hint: "For children, enter current weight",

      reproductive_title: "Reproductive health",
      reproductive_ask: "Would you like to answer questions about reproductive health?",
      pregnancy: "Is it possible that you are pregnant or planning to become pregnant in the coming months?",
      contraception: "Are you using contraception?",
      breastfeeding: "Are you currently breastfeeding?",
      last_menses: "Date of last menstrual period",
      last_menses_hint: "Leave blank if not applicable",
      yes: "Yes",
      no: "No",
      not_applicable: "Not applicable",

      allergies_title: "Allergies",
      allergy_question: "Do you have any allergies?",
      allergy_eggs: "Eggs",
      allergy_medication: "Medications",
      allergy_food: "Food",
      allergy_environment: "Environmental",
      allergy_other: "Other",
      allergy_none: "No allergies",
      allergy_eggs_details: "Specify your egg allergy",
      allergy_eggs_placeholder: "E.g., skin reaction, anaphylaxis...",
      allergy_medication_details: "Specify your medication allergy",
      allergy_medication_placeholder: "E.g., Penicillin - hives...",
      allergy_food_details: "Specify your food allergy",
      allergy_food_placeholder: "E.g., seafood, peanuts...",
      allergy_environment_details: "Specify your environmental allergy",
      allergy_environment_placeholder: "E.g., pollen, dust mites, animals...",
      allergy_other_details: "Specify your other allergy",
      allergy_other_placeholder: "Describe your allergy and reaction...",

      diseases_title: "Specific diseases",
      dengue: "Have you had dengue fever?",
      chickenpox_disease: "Have you had chickenpox (the disease)?",
      chickenpox_vaccine: "Have you been vaccinated against chickenpox?",

      vaccination_history: "Vaccination history",
      vaccination_history_title: "Vaccination history",
      vaccination_problem: "Have you ever had a severe adverse reaction after a vaccine?",
      vaccination_problem_hint: "E.g., high fever, significant swelling, severe allergic reaction...",
      vaccination_problem_details: "Describe the reaction",

      comorbidities_title: "Medical history",
      comorbidities: "Do you have or have you ever had any of the following conditions?",
      comorbidities_question: "Do you have or have you ever had any of the following conditions?",
      comorbidity_none: "No chronic diseases",
      comorbidities_none: "No chronic diseases",
      comorbidity_group_immune: "Immune system",
      comorbidity_group_cancer: "Cancer and blood diseases",
      comorbidity_group_cardio: "Cardiovascular",
      comorbidity_group_metabolic: "Metabolic",
      comorbidity_group_respiratory: "Respiratory",
      comorbidity_group_digestive: "Digestive",
      comorbidity_group_rheumatic: "Rheumatologic",
      comorbidity_group_neuro: "Neurologic",
      comorbidity_group_mental: "Mental health",
      comorbidity_group_other: "Other",
      comorbidity_hiv: "HIV",
      comorbidity_thymus: "Thymus problem",
      comorbidity_thymus_placeholder: "Thymoma, removal, DiGeorge syndrome...",
      comorbidity_spleen: "Absent spleen",
      comorbidity_spleen_placeholder: "Splenectomy, congenital...",
      comorbidity_cancer: "Cancer",
      comorbidity_cancer_placeholder: "Type of cancer, date of diagnosis...",
      comorbidity_hematologic: "Blood disease",
      comorbidity_hematologic_placeholder: "Leukemia, lymphoma, sickle cell...",
      comorbidity_hypertension: "Hypertension",
      comorbidity_heart: "Heart disease",
      comorbidity_heart_placeholder: "Heart failure, arrhythmia, valve disease...",
      comorbidity_diabetes: "Diabetes",
      comorbidity_diabetes_placeholder: "Type 1, type 2, gestational...",
      comorbidity_asthma: "Asthma",
      comorbidity_inflammatory: "Inflammatory bowel disease",
      comorbidity_inflammatory_placeholder: "Crohn's, ulcerative colitis...",
      comorbidity_digestive: "Chronic digestive disease",
      comorbidity_digestive_placeholder: "Gastritis, reflux, hepatitis...",
      comorbidity_rheumatic: "Rheumatic disease",
      comorbidity_rheumatic_placeholder: "Rheumatoid arthritis, lupus, spondylitis...",
      comorbidity_epilepsy: "Epilepsy",
      comorbidity_muscular: "Muscle disease",
      comorbidity_muscular_placeholder: "Myasthenia, dystrophy...",
      comorbidity_psychiatric: "Psychiatric condition",
      comorbidity_surgery: "Recent surgery/immobilization (< 6 weeks)",
      comorbidity_surgery_placeholder: "Type of procedure, date...",
      comorbidity_other: "Other",
      comorbidity_other_details: "Details",
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
      recent_chemotherapy: "Have you received cancer treatment or immunosuppressive therapy in the last 6 months?",
      recent_chemotherapy_hint: "Chemotherapy, radiotherapy, immunomodulators...",
      psychiatric_details: "Please describe your situation",

      medications_title: "Medications",
      takes_medication: "Are you taking any medications?",
      takes_medication_hint: "Including contraceptive pills, dietary supplements and regular treatments",
      medication_details: "What medications do you take?",
      medication_placeholder: "E.g., Metformin 500mg, Lisinopril 10mg..."
    },

    // Step 4: Vaccination
    vaccination: {
      title: "Vaccination record",
      subtitle: "Upload your vaccination record (PDF or photos)",
      upload_instruction: "Upload your vaccination record (PDF or photos)",
      dropzone_text: "Drag files here or click to upload",
      dropzone_mobile: "Tap to add files",
      formats: "Accepted formats: PDF, JPG, PNG, HEIC",
      limits: "Maximum 10 files, 10 MB each",
      files_added: "Files added",
      no_card: "I don't have a vaccination record"
    },

    // Step 5: Referral
    referral: {
      title: "How did you find us?",
      subtitle: "Your answers help us improve our services",
      returning_question: "Have you visited Travel Doctor before?",
      source: "How did you hear about us?",
      source_internet: "Internet search",
      source_social: "Social media",
      source_doctor: "Doctor/healthcare professional",
      source_friend: "Friend/family",
      source_pharmacy: "Pharmacy",
      source_employer: "Employer",
      source_travel_agency: "Travel agency",
      source_insurance: "Insurance company",
      source_returning: "Returning patient",
      source_advertising: "Advertisement",
      source_other: "Other",
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
      doctor_name_placeholder: "Doctor or clinic name...",
      friend_name: "Person's name (optional)",
      friend_name_placeholder: "Person's name (optional)",
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
      choice_factor: "What motivated your choice?",
      factor_location: "Location",
      factor_price: "Price",
      factor_reputation: "Reputation",
      factor_recommendation: "Recommendation",
      factor_expertise: "Expertise",
      factor_availability: "Availability",
      factor_languages: "Languages spoken",
      factor_other: "Other",
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
      trip_dates_required: "Trip dates are required",
      trip_departure_before_return: "Trip departure must be before return",
      min_destination: "Add at least one destination country",
      min_destinations: "Add at least one destination country",
      min_selection: "Select at least one option",
      file_too_large: "File too large (max 10 MB)",
      too_many_files: "Maximum 10 files allowed",
      invalid_file_type: "File type not allowed",
      consent_required: "You must accept the declaration",
      weight_range: "Weight must be between 2 and 400 kg",
      date_not_future: "This date cannot be in the future",
      other_required: "Please specify your choice",
      cd4_range: "CD4 value must be between 0 and 5000"
    },

    // Warnings (soft, non-blocking)
    warnings: {
      date_in_past: "This date is in the past",
      long_duration: "This trip is longer than 2 years"
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
      connection_error: "Connection error. Check your internet connection.",
      success_title: "Form submitted",
      success_message: "Your form has been successfully submitted. A confirmation email has been sent to:",
      share_with_travelers: "Traveling with others? Everyone needs to fill out their own form.",
      share_message: "We have an appointment at Travel Doctor. Fill out this form before we go:",
      share_email_subject: "Travel Doctor form to fill out",
      link_copied: "Link copied!"
    },

    // Hints
    hints: {
      birthdate_max: "Date in the past",
      date_past_only: "Past date only",
      weight_range: "Between 2 and 400 kg"
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
      dont_know: "Non so",
      back_to_site: "Torna al sito",
      copy_link: "Copia link"
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
      gender: "Sesso biologico",
      gender_hint: "Necessario per adattare le raccomandazioni mediche",
      gender_female: "Donna",
      gender_male: "Uomo",
      gender_options: {
        femme: "Donna",
        homme: "Uomo"
      },
      avs: "Numero AVS",
      avs_placeholder: "756.1234.5678.90",
      avs_hint: "Permette di ritrovare facilmente il vostro fascicolo"
    },

    // Step 2: Travel
    travel: {
      title: "Informazioni sul viaggio",
      trip_dates: "Date del viaggio",
      trip_departure: "Partenza del viaggio",
      trip_return: "Ritorno del viaggio",
      flexible_dates: "Non conosco ancora le date esatte per paese",
      estimated_duration: "Durata stimata",
      duration_options: {
        few_days: "Qualche giorno",
        less_1_week: "< 1 settimana",
        "1_2_weeks": "1 a 2 settimane",
        "2_3_weeks": "2 a 3 settimane",
        "1_month": "~1 mese",
        "1_2_months": "1 a 2 mesi",
        "2_3_months": "2 a 3 mesi",
        "3_6_months": "3 a 6 mesi",
        over_6_months: "> 6 mesi"
      },
      destinations: "Paesi di destinazione",
      country: "Paese",
      country_placeholder: "Cercare un paese...",
      add_country: "Aggiungi un paese",
      departure: "Partenza",
      return: "Ritorno",
      specify: "Specificare",
      reason: "Qual è lo scopo del viaggio?",
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
      activities: "Prevedete attività particolari?",
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
      rural: "Prevedete un soggiorno in zona rurale o isolata?",
      rural_hint: "Lontano da un ospedale o una farmacia",
      rural_stay: "Prevedete un soggiorno in zona rurale o isolata?",
      yes: "Sì",
      no: "No"
    },

    // Step 3: Health
    health: {
      title: "Informazioni sulla salute",
      weight: "Qual è il vostro peso?",
      weight_unit: "kg",
      weight_hint: "Per i bambini, indicare il peso attuale",

      reproductive_title: "Salute riproduttiva",
      reproductive_ask: "Desidera rispondere alle domande sulla salute riproduttiva?",
      pregnancy: "È possibile che sia incinta o prevede di esserlo nei prossimi mesi?",
      contraception: "Usa contraccettivi?",
      breastfeeding: "Sta attualmente allattando?",
      last_menses: "Data dell'ultima mestruazione",
      last_menses_hint: "Lasciare vuoto se non applicabile",
      yes: "Sì",
      no: "No",
      not_applicable: "Non applicabile",

      allergies_title: "Allergie",
      allergy_question: "Ha delle allergie?",
      allergy_eggs: "Uova",
      allergy_medication: "Farmaci",
      allergy_food: "Alimenti",
      allergy_environment: "Ambiente",
      allergy_other: "Altro",
      allergy_none: "Nessuna allergia",
      allergy_eggs_details: "Specifichi la sua allergia alle uova",
      allergy_eggs_placeholder: "Es: reazione cutanea, anafilassi...",
      allergy_medication_details: "Specifichi la sua allergia ai farmaci",
      allergy_medication_placeholder: "Es: Penicillina - orticaria...",
      allergy_food_details: "Specifichi la sua allergia alimentare",
      allergy_food_placeholder: "Es: frutti di mare, arachidi...",
      allergy_environment_details: "Specifichi la sua allergia ambientale",
      allergy_environment_placeholder: "Es: polline, acari, animali...",
      allergy_other_details: "Specifichi la sua altra allergia",
      allergy_other_placeholder: "Descriva la sua allergia e la reazione...",

      diseases_title: "Malattie specifiche",
      dengue: "Ha avuto la dengue?",
      chickenpox_disease: "Ha avuto la varicella (malattia)?",
      chickenpox_vaccine: "È stato/a vaccinato/a contro la varicella?",

      vaccination_history: "Storia vaccinale",
      vaccination_history_title: "Storia vaccinale",
      vaccination_problem: "Ha mai avuto un effetto indesiderato grave dopo un vaccino?",
      vaccination_problem_hint: "Es: febbre alta, gonfiore importante, reazione allergica grave...",
      vaccination_problem_details: "Descriva la reazione",

      comorbidities_title: "Anamnesi medica",
      comorbidities: "Ha o ha avuto una delle seguenti malattie?",
      comorbidities_question: "Ha o ha avuto una delle seguenti malattie?",
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
      comorbidity_thymus_placeholder: "Timoma, asportazione, sindrome di DiGeorge...",
      comorbidity_spleen_placeholder: "Splenectomia, congenita...",
      comorbidity_cancer_placeholder: "Tipo di tumore, data della diagnosi...",
      comorbidity_hematologic_placeholder: "Leucemia, linfoma, anemia falciforme...",
      comorbidity_heart_placeholder: "Insufficienza cardiaca, aritmia, valvulopatia...",
      comorbidity_diabetes_placeholder: "Tipo 1, tipo 2, gestazionale...",
      comorbidity_inflammatory: "Malattia infiammatoria intestinale",
      comorbidity_inflammatory_placeholder: "Crohn, RCU...",
      comorbidity_digestive: "Malattia digestiva cronica",
      comorbidity_digestive_placeholder: "Gastrite, reflusso, epatite...",
      comorbidity_rheumatic: "Malattia reumatologica",
      comorbidity_rheumatic_placeholder: "Poliartrite, lupus, spondilite...",
      comorbidity_epilepsy: "Epilessia",
      comorbidity_muscular: "Malattia muscolare",
      comorbidity_muscular_placeholder: "Miastenia, distrofia...",
      comorbidity_psychiatric: "Malattia psichiatrica",
      comorbidity_surgery: "Chirurgia/immobilizzazione recente (< 6 settimane)",
      comorbidity_surgery_placeholder: "Tipo di intervento, data...",
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
      recent_chemotherapy: "Ha ricevuto un trattamento contro il cancro o immunosoppressivo negli ultimi 6 mesi?",
      recent_chemotherapy_hint: "Chemioterapia, radioterapia, immunomodulatori...",
      psychiatric_details: "Descriva la sua situazione",

      medications_title: "Farmaci",
      takes_medication: "Assume farmaci?",
      takes_medication_hint: "Inclusa pillola anticoncezionale, integratori alimentari e trattamenti regolari",
      medication_details: "Quali farmaci assume?",
      medication_placeholder: "Es: Metformina 500mg, Lisinopril 10mg..."
    },

    // Step 4: Vaccination
    vaccination: {
      title: "Libretto delle vaccinazioni",
      subtitle: "Importi il suo libretto delle vaccinazioni (PDF o foto)",
      upload_instruction: "Importi il suo libretto delle vaccinazioni (PDF o foto)",
      dropzone_text: "Trascini i file qui o clicchi per importare",
      dropzone_mobile: "Tocchi per aggiungere file",
      formats: "Formati accettati: PDF, JPG, PNG, HEIC",
      limits: "Massimo 10 file, 10 MB ciascuno",
      files_added: "File aggiunti",
      no_card: "Non ho un libretto delle vaccinazioni"
    },

    // Step 5: Referral
    referral: {
      title: "Come ci ha trovato?",
      subtitle: "Le sue risposte ci aiutano a migliorare i nostri servizi",
      returning_question: "Ha già consultato Travel Doctor in precedenza?",
      source: "Come ha sentito parlare di noi?",
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
      doctor_name_placeholder: "Nome del medico o della clinica...",
      friend_name: "Nome della persona (facoltativo)",
      friend_name_placeholder: "Nome della persona (facoltativo)",
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
      choice_factor: "Cosa ha motivato la sua scelta?",
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
      trip_dates_required: "Le date del viaggio sono obbligatorie",
      trip_departure_before_return: "La partenza del viaggio deve essere prima del ritorno",
      min_destination: "Aggiunga almeno un paese di destinazione",
      min_destinations: "Aggiunga almeno un paese di destinazione",
      min_selection: "Selezioni almeno un'opzione",
      file_too_large: "File {name} troppo grande (max 10 MB)",
      too_many_files: "Massimo 10 file consentiti",
      invalid_file_type: "Tipo di file {name} non consentito",
      vaccination_required: "Aggiunga almeno un file o selezioni la casella",
      consent_required: "Deve accettare la dichiarazione",
      submission_failed: "L'invio non è riuscito. Riprovi.",
      captcha_required: "Si prega di completare il CAPTCHA",
      weight_range: "Il peso deve essere tra 2 e 400 kg",
      date_not_future: "Questa data non può essere nel futuro",
      other_required: "Si prega di specificare la scelta",
      cd4_range: "Il valore CD4 deve essere tra 0 e 5000"
    },

    // Warnings (soft, non-blocking)
    warnings: {
      date_in_past: "Questa data è nel passato",
      long_duration: "Questo viaggio dura più di 2 anni"
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
      share_with_travelers: "Viaggia con altre persone? Ognuno deve compilare il proprio modulo.",
      share_message: "Abbiamo un appuntamento da Travel Doctor. Compila questo modulo prima della consultazione:",
      share_email_subject: "Modulo Travel Doctor da compilare",
      link_copied: "Link copiato!",
      no_results: "Nessun risultato trovato",
      no_files: "Nessun file caricato",
      no_referral: "Nessuna informazione fornita"
    },

    // Hints
    hints: {
      birthdate_max: "Data nel passato",
      date_past_only: "Solo data nel passato",
      weight_range: "Tra 2 e 400 kg"
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
      dont_know: "No sé",
      back_to_site: "Volver al sitio",
      copy_link: "Copiar enlace"
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
      gender: "Sexo biológico",
      gender_hint: "Necesario para adaptar las recomendaciones médicas",
      gender_female: "Mujer",
      gender_male: "Hombre",
      gender_options: {
        femme: "Mujer",
        homme: "Hombre"
      },
      avs: "Número AVS (Seguro Social Suizo)",
      avs_placeholder: "756.1234.5678.90",
      avs_hint: "Permite encontrar su expediente fácilmente"
    },

    // Step 2: Travel
    travel: {
      title: "Información del viaje",
      trip_dates: "Fechas del viaje",
      trip_departure: "Salida del viaje",
      trip_return: "Regreso del viaje",
      flexible_dates: "Aún no conozco las fechas exactas por país",
      estimated_duration: "Duración estimada",
      duration_options: {
        few_days: "Unos días",
        less_1_week: "< 1 semana",
        "1_2_weeks": "1 a 2 semanas",
        "2_3_weeks": "2 a 3 semanas",
        "1_month": "~1 mes",
        "1_2_months": "1 a 2 meses",
        "2_3_months": "2 a 3 meses",
        "3_6_months": "3 a 6 meses",
        over_6_months: "> 6 meses"
      },
      destinations: "Países de destino",
      country: "País",
      country_placeholder: "Buscar un país...",
      add_country: "Añadir un país",
      departure: "Salida",
      return: "Regreso",
      specify: "Especifique",
      reason: "¿Cuál es el motivo de su viaje?",
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
      activities: "¿Tiene previstas actividades particulares?",
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
      rural: "¿Tiene prevista una estancia en zona rural o aislada?",
      rural_hint: "Lejos de un hospital o una farmacia",
      rural_stay: "¿Tiene prevista una estancia en zona rural o aislada?",
      yes: "Sí",
      no: "No"
    },

    // Step 3: Health
    health: {
      title: "Información de salud",
      weight: "¿Cuál es su peso?",
      weight_unit: "kg",
      weight_hint: "Para niños, indique el peso actual",

      reproductive_title: "Salud reproductiva",
      reproductive_ask: "¿Desea responder a las preguntas sobre salud reproductiva?",
      pregnancy: "¿Es posible que esté embarazada o planea estarlo en los próximos meses?",
      contraception: "¿Usa anticonceptivos?",
      breastfeeding: "¿Está amamantando actualmente?",
      last_menses: "Fecha de la última menstruación",
      last_menses_hint: "Dejar vacío si no aplica",
      yes: "Sí",
      no: "No",
      not_applicable: "No aplica",

      allergies_title: "Alergias",
      allergy_question: "¿Tiene alergias?",
      allergy_eggs: "Huevos",
      allergy_medication: "Medicamentos",
      allergy_food: "Alimentos",
      allergy_environment: "Ambiente",
      allergy_other: "Otro",
      allergy_none: "Ninguna alergia",
      allergy_eggs_details: "Especifique su alergia a los huevos",
      allergy_eggs_placeholder: "Ej: reacción cutánea, anafilaxia...",
      allergy_medication_details: "Especifique su alergia a medicamentos",
      allergy_medication_placeholder: "Ej: Penicilina - urticaria...",
      allergy_food_details: "Especifique su alergia alimentaria",
      allergy_food_placeholder: "Ej: mariscos, cacahuetes...",
      allergy_environment_details: "Especifique su alergia ambiental",
      allergy_environment_placeholder: "Ej: polen, ácaros, animales...",
      allergy_other_details: "Especifique su otra alergia",
      allergy_other_placeholder: "Describa su alergia y la reacción...",

      diseases_title: "Enfermedades específicas",
      dengue: "¿Ha tenido dengue?",
      chickenpox_disease: "¿Ha tenido varicela (la enfermedad)?",
      chickenpox_vaccine: "¿Ha sido vacunado/a contra la varicela?",

      vaccination_history: "Historial de vacunación",
      vaccination_history_title: "Historial de vacunación",
      vaccination_problem: "¿Ha tenido alguna vez una reacción adversa grave después de una vacuna?",
      vaccination_problem_hint: "Ej: fiebre alta, hinchazón importante, reacción alérgica grave...",
      vaccination_problem_details: "Describa la reacción",

      comorbidities_title: "Historial médico",
      comorbidities: "¿Tiene o ha tenido alguna de las siguientes enfermedades?",
      comorbidities_question: "¿Tiene o ha tenido alguna de las siguientes enfermedades?",
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
      comorbidity_thymus_placeholder: "Timoma, extirpación, síndrome de DiGeorge...",
      comorbidity_spleen_placeholder: "Esplenectomía, congénita...",
      comorbidity_cancer_placeholder: "Tipo de cáncer, fecha del diagnóstico...",
      comorbidity_hematologic_placeholder: "Leucemia, linfoma, anemia falciforme...",
      comorbidity_heart_placeholder: "Insuficiencia cardíaca, arritmia, valvulopatía...",
      comorbidity_diabetes_placeholder: "Tipo 1, tipo 2, gestacional...",
      comorbidity_inflammatory: "Enfermedad inflamatoria intestinal",
      comorbidity_inflammatory_placeholder: "Crohn, colitis ulcerosa...",
      comorbidity_digestive: "Enfermedad digestiva crónica",
      comorbidity_digestive_placeholder: "Gastritis, reflujo, hepatitis...",
      comorbidity_rheumatic: "Enfermedad reumatológica",
      comorbidity_rheumatic_placeholder: "Artritis reumatoide, lupus, espondilitis...",
      comorbidity_epilepsy: "Epilepsia",
      comorbidity_muscular: "Enfermedad muscular",
      comorbidity_muscular_placeholder: "Miastenia, distrofia...",
      comorbidity_psychiatric: "Enfermedad psiquiátrica",
      comorbidity_surgery: "Cirugía/inmovilización reciente (< 6 semanas)",
      comorbidity_surgery_placeholder: "Tipo de intervención, fecha...",
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
      recent_chemotherapy: "¿Ha recibido un tratamiento contra el cáncer o inmunosupresor en los últimos 6 meses?",
      recent_chemotherapy_hint: "Quimioterapia, radioterapia, inmunomoduladores...",
      psychiatric_details: "Describa su situación",

      medications_title: "Medicamentos",
      takes_medication: "¿Toma medicamentos?",
      takes_medication_hint: "Incluyendo anticonceptivos, suplementos alimenticios y tratamientos regulares",
      medication_details: "¿Qué medicamentos toma?",
      medication_placeholder: "Ej: Metformina 500mg, Lisinopril 10mg..."
    },

    // Step 4: Vaccination
    vaccination: {
      title: "Cartilla de vacunación",
      subtitle: "Importe su cartilla de vacunación (PDF o fotos)",
      upload_instruction: "Importe su cartilla de vacunación (PDF o fotos)",
      dropzone_text: "Arrastre archivos aquí o haga clic para importar",
      dropzone_mobile: "Toque para añadir archivos",
      formats: "Formatos aceptados: PDF, JPG, PNG, HEIC",
      limits: "Máximo 10 archivos, 10 MB cada uno",
      files_added: "Archivos añadidos",
      no_card: "No tengo cartilla de vacunación"
    },

    // Step 5: Referral
    referral: {
      title: "¿Cómo nos encontró?",
      subtitle: "Sus respuestas nos ayudan a mejorar nuestros servicios",
      returning_question: "¿Ha consultado en Travel Doctor anteriormente?",
      source: "¿Cómo oyó hablar de nosotros?",
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
      doctor_name_placeholder: "Nombre del médico o clínica...",
      friend_name: "Nombre de la persona (opcional)",
      friend_name_placeholder: "Nombre de la persona (opcional)",
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
      choice_factor: "¿Qué motivó su elección?",
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
      trip_dates_required: "Las fechas del viaje son obligatorias",
      trip_departure_before_return: "La salida del viaje debe ser anterior al regreso",
      min_destination: "Añada al menos un país de destino",
      min_destinations: "Añada al menos un país de destino",
      min_selection: "Seleccione al menos una opción",
      file_too_large: "Archivo {name} demasiado grande (máx 10 MB)",
      too_many_files: "Máximo 10 archivos permitidos",
      invalid_file_type: "Tipo de archivo {name} no permitido",
      vaccination_required: "Añada al menos un archivo o marque la casilla",
      consent_required: "Debe aceptar la declaración",
      submission_failed: "El envío ha fallado. Inténtelo de nuevo.",
      captcha_required: "Por favor complete el CAPTCHA",
      weight_range: "El peso debe ser entre 2 y 400 kg",
      date_not_future: "Esta fecha no puede ser en el futuro",
      other_required: "Por favor especifique su elección",
      cd4_range: "El valor CD4 debe estar entre 0 y 5000"
    },

    // Warnings (soft, non-blocking)
    warnings: {
      date_in_past: "Esta fecha es en el pasado",
      long_duration: "Este viaje dura más de 2 años"
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
      share_with_travelers: "¿Viaja con otras personas? Cada uno debe completar su propio formulario.",
      share_message: "Tenemos cita en Travel Doctor. Completa este formulario antes de la consulta:",
      share_email_subject: "Formulario Travel Doctor para completar",
      link_copied: "¡Enlace copiado!",
      no_results: "No se encontraron resultados",
      no_files: "No se han subido archivos",
      no_referral: "No se proporcionó información"
    },

    // Hints
    hints: {
      birthdate_max: "Fecha en el pasado",
      date_past_only: "Solo fecha en el pasado",
      weight_range: "Entre 2 y 400 kg"
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
