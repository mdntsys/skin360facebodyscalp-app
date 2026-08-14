// Carolina's six GoFormz templates, replicated as five app forms. The two
// facial templates resolved to the SHORT one ("Facial Intake and Consent
// Forms" v.2) — Carolina confirmed 2026-08-14 the long v.3 is old and only
// survived because GoFormz wouldn't let her delete it.
// Source transcriptions: docs/forms/*.md (captured 2026-08-13).
// This file is the single source of truth: the DB seed migration is generated
// from it, and the vitest suite validates its structure.

import type { FormTemplate } from "./types";

const YESNO_ALCOHOL_BODY = [
  "Once a month or less",
  "2-4 times a month",
  "2-3 times a week",
  "4 times a week",
];

export const FORM_SEEDS: FormTemplate[] = [
  {
    id: "form-facial",
    name: "Facial Intake & Consent",
    category: "intake",
    description:
      "Full facial questionnaire — medical history, lifestyle, skin concerns, skin history — plus the facial treatment consent.",
    sort: 1,
    active: true,
    schema: {
      sections: [
        {
          title: "Client Information",
          fields: [
            { key: "date_of_birth", type: "date", label: "Date of birth", half: true },
            { key: "age", type: "text", label: "Age", half: true },
            { key: "gender", type: "radio", label: "Gender", options: ["Female", "Male", "NB"] },
            { key: "address", type: "text", label: "Address" },
            { key: "city", type: "text", label: "City", half: true },
            { key: "state", type: "text", label: "State", half: true },
            { key: "zip", type: "text", label: "Zip", half: true },
            { key: "emergency_contact", type: "text", label: "Emergency contact", half: true },
            { key: "hear_about_us", type: "radio", label: "How did you hear about us?", options: ["Social media", "Google", "Yelp", "A friend"] },
            { key: "email_list", type: "yesno", label: "Would you like to be added to our email list?" },
          ],
        },
        {
          title: "Medical History",
          fields: [
            {
              key: "conditions",
              type: "checkboxes",
              label: "Do you have any of the following conditions? If yes, please select them:",
              options: [
                "Acne", "Asthma", "Cancer", "Cold sores, fever blisters", "COPD",
                "Dermatitis", "Diabetes", "Eczema", "Epilepsy", "HIV/AIDS",
                "Hives", "Psoriasis", "Rosacea", "Skin infections",
              ],
            },
            { key: "other_condition", type: "text", label: "Any other condition" },
            { key: "medications", type: "textarea", label: "List any medications you take regularly, including vitamins, herbal supplements, aspirin, topicals" },
            { key: "allergies", type: "yesno_detail", label: "Any known allergies?" },
            { key: "recent_surgery", type: "yesno_detail", label: "Any recent surgery, including plastic surgery?" },
          ],
        },
        {
          title: "Female Clients",
          fields: [
            { key: "pregnant", type: "yesno", label: "Are you pregnant or trying to become pregnant?" },
            { key: "birth_control", type: "yesno", label: "Are you taking birth control pills?" },
            { key: "hormone_replacement", type: "yesno", label: "Are you undergoing any hormone replacement therapy?" },
          ],
        },
        {
          title: "Your Lifestyle",
          fields: [
            { key: "occupation", type: "text", label: "What is your occupation?" },
            { key: "sun_exposure", type: "radio", label: "What is your sun exposure?", options: ["Never", "Light", "Moderate", "Excessive"] },
            { key: "sun_protection", type: "yesno", label: "Do you use sun protection (sunscreen, hats, protective clothing)?" },
            { key: "tanning_beds", type: "yesno", label: "Do you use tanning beds?" },
            { key: "smoke", type: "yesno", label: "Do you smoke?" },
            { key: "caffeine", type: "yesno", label: "Do you drink more than 4 caffeinated beverages a day?" },
            { key: "alcohol", type: "radio", label: "What is your alcohol consumption?", options: ["None", "Occasionally", "Once a week", "Few times a week", "Daily"] },
          ],
        },
        {
          title: "Your Skin Concerns",
          fields: [
            {
              key: "skin_concerns",
              type: "checkboxes",
              label: "Check all that apply:",
              options: [
                "Acne", "Age spots", "Blackheads", "Dehydrated skin", "Dry skin",
                "Dull skin", "Facial hair", "Fine lines and wrinkles",
                "Hyperpigmentation", "Ingrown hairs", "Enlarged pores", "Oily skin",
                "Eczema", "Rosacea", "Scars", "Melasma", "Dark circles",
                "Under-eye puffiness",
              ],
            },
            { key: "other_concern", type: "text", label: "Any other" },
          ],
        },
        {
          title: "Your Skin Care Routine",
          fields: [
            {
              key: "routine",
              type: "checkboxes",
              label: "Check everything you use:",
              options: [
                "Eye makeup remover", "Foam cleanser", "Gel cleanser", "Facial soap",
                "Toner", "Eye cream", "Day cream", "Night cream", "Serum", "Sunscreen",
                "Facial oils", "Mask", "Exfoliants", "Spot treatment", "Retinols",
              ],
            },
            {
              key: "ingredients",
              type: "checkboxes",
              label: "Are you currently using products containing any of the following ingredients?",
              options: [
                "Any exfoliating scrub", "Any hydroxy acids (AHAs)",
                "Any beta hydroxy acids (BHAs)", "Vitamin A derivative (i.e. retinol)",
                "Renova/Retinoids", "Hydroquinone",
              ],
            },
          ],
        },
        {
          title: "Your Skin History",
          fields: [
            { key: "previous_treatments", type: "text", label: "Any history of previous facials, microdermabrasion, peels or other treatments?" },
            { key: "skin_heal", type: "radio", label: "How does your skin heal?", options: ["Fast", "Slow", "Scars", "Pigments"] },
            { key: "bruises", type: "yesno", label: "Do you get bruises easily?" },
            { key: "acne_medication", type: "yesno_detail", label: "Have you ever used or been prescribed any acne medication?" },
            { key: "botox", type: "yesno_detail", label: "Have you received Botox, Restylane, or Collagen injections in the last 6 months?" },
            {
              key: "truthful",
              type: "statement",
              text: "I have read and completed this questionnaire truthfully. I understand that withholding information or providing inaccurate details about my medical history, allergies, medications, and skincare routines may lead to contraindications or adverse reactions to the treatments I undergo. I agree to inform the technician of any changes in the above information.",
            },
          ],
        },
        {
          title: "Facial Treatment — Client Consent",
          fields: [
            { key: "procedure", type: "text", label: "I hereby consent to and authorize SKIN360 FACE BODY SCALP to perform the following procedure:" },
            {
              key: "consent",
              type: "statement",
              text: "I have voluntarily chosen to undergo this treatment/procedure after the nature and purpose of this treatment has been explained to me.\n\nWhile it's not possible to list every potential risk and complication, I've been informed about potential benefits, risks, and complications. I understand that results are not guaranteed and may vary based on factors like age, skin condition, and lifestyle. Additional treatments for expected results may be needed, incurring extra costs.\n\nI have read and understood the post-treatment home care instructions. I understand how important it is to follow all instructions given to me for post-treatment care. In the event that I may have additional questions or concerns regarding my treatment or suggested home post-treatment care, I will consult the esthetician immediately.\n\nI have also, to the best of my knowledge, provided an accurate account of my medical history, including any known allergies and current use of prescription drugs or topical products.\n\nI consent to the use of photographs for treatment documentation purposes, with all personal information kept confidential.\n\nI have read and fully understand this consent agreement and all of my questions have been answered to my satisfaction. I hereby give my full consent to the procedure and subsequent treatments, releasing SKIN360 FACE BODY SCALP and associates from any liability related to it.",
            },
          ],
        },
      ],
    },
  },
  {
    id: "form-body-sculpting",
    name: "Body Sculpting Intake & Consent",
    category: "intake",
    description:
      "Body sculpting questionnaire — medical history, lifestyle, goals — plus the body contouring consent and waiver.",
    sort: 2,
    active: true,
    schema: {
      sections: [
        {
          title: "Client Information",
          fields: [
            { key: "date_of_birth", type: "date", label: "Date of birth", half: true },
            { key: "gender", type: "radio", label: "Gender", options: ["Female", "Male", "NB"] },
            { key: "address", type: "text", label: "Address" },
            { key: "city", type: "text", label: "City", half: true },
            { key: "postal_code", type: "text", label: "Postal code", half: true },
            { key: "home_phone", type: "text", label: "Home phone", half: true },
            { key: "emergency_contact", type: "text", label: "Emergency contact name", half: true },
            { key: "emergency_phone", type: "text", label: "Emergency phone", half: true },
          ],
        },
        {
          title: "Medical History",
          fields: [
            {
              key: "conditions",
              type: "checkboxes",
              label: "Have you ever been diagnosed with or treated for any of the following conditions?",
              options: [
                "Autoimmune disorders", "Blood clotting disorder", "Cancer", "Diabetes",
                "Epilepsy", "Gastrointestinal disorders", "Gallbladder removed",
                "Heart disease", "High blood pressure", "History of gallstones",
                "Infections", "Kidney disease", "Liver disease", "Photosensitivity",
                "Skin conditions", "Tumors", "Thyroid disorder", "Varicose veins",
              ],
            },
            { key: "chronic", type: "yesno_detail", label: "Do you have any other chronic medical conditions which we should know about?" },
            { key: "allergic_reaction", type: "yesno_detail", label: "Have you ever had an allergic reaction to any food or substance?" },
            { key: "implants", type: "yesno_detail", label: "Do you have hearing aids, a pacemaker, hormone pellets, or metal/medical devices implanted? (Where?)" },
            { key: "surgeries", type: "yesno_detail", label: "Have you had any recent surgeries or injuries?" },
            { key: "adverse_reactions", type: "yesno_detail", label: "Have you ever had any adverse reactions to medications or topical treatments?" },
            { key: "pain_target_areas", type: "yesno_detail", label: "Are you currently experiencing any pain or discomfort in the areas you would like to target?" },
            { key: "weight_loss_program", type: "yesno_detail", label: "Are you currently on a weight loss program?" },
            { key: "exercise", type: "yesno_detail", label: "Do you exercise? If yes, how often?" },
            { key: "alcohol", type: "radio", label: "Do you consume alcohol, and if yes, how often?", options: YESNO_ALCOHOL_BODY },
          ],
        },
        {
          title: "Female Clients",
          fields: [
            { key: "pregnant_nursing", type: "yesno_detail", label: "Are you currently pregnant or nursing?" },
            { key: "next_cycle", type: "text", label: "When is your next menstrual cycle due to begin?" },
            { key: "cycle_note", type: "note", text: "(For your personal comfort, you should avoid hair removal two days before your cycle is due and two days after it is completed.)" },
          ],
        },
        {
          title: "Body Sculpting Goals",
          fields: [
            { key: "prior_treatments", type: "yesno_detail", label: "Have you ever received body sculpting treatments before?" },
            { key: "goals", type: "checkboxes", label: "Wanting to achieve?", options: ["General Weight Loss", "Slimming/Firming", "Body Contouring", "Cellulite Removal"] },
            { key: "target_areas", type: "textarea", label: "What areas of your body would you like to target?" },
            { key: "specific_goals", type: "textarea", label: "What are your specific goals for body sculpting?" },
            { key: "certify", type: "statement", text: "By signing below, I certify that the medical history provided today is accurate and complete to the best of my knowledge." },
          ],
        },
        {
          title: "Client Consent — Body Sculpting",
          fields: [
            {
              key: "consent",
              type: "statement",
              text: "SCOPE OF PRACTICE\nBody sculpting increases flow of both the lymphatic and circulatory systems, and it also helps with cleaning of the tissues. The main use of body sculpting treatment is inch loss, diminishing of cellulite, and tightening of the skin.\n\nPRECAUTIONS\nBody sculpting treatments are not recommended if you are pregnant, breast feeding, have a lymphatic disorder, acute illness, metal implants, pacemakers, or are currently being treated for active cancer.\n\nWAIVER\nI understand that I am receiving Body Sculpting treatment at my own risk. Should I sustain an injury while using the equipment, I agree to not hold the service provider responsible.\n\nACKNOWLEDGEMENT\nI understand and acknowledge that payments for the above services are non-refundable. By my signature below, I certify that I have read and understand the contents of this Consent Form for Body Contouring. I further agree to provide 24-hour notice of a cancellation or change in appointment time, or I will forfeit a treatment off my package since treatments are by appointment only. There are no refunds if I am responding to treatment and decide to stop treatments. Should the service provider wish to use any photos of my progress other than for my personal file, I will sign a separate Photo Release form.\n\nI understand that the results of body sculpting treatments may vary from person to person and that multiple sessions may be required to achieve the desired outcome. I acknowledge that I am responsible for following all pre- and post-treatment instructions provided by the provider to ensure optimal results.\n\nI have disclosed all relevant medical information to the provider and have provided an accurate medical history. I understand that certain medical conditions may increase the risks of body sculpting treatments and that the provider may recommend against or modify the treatment plan based on my medical history and current health status.\n\nI acknowledge that there are certain risks and potential complications associated with body sculpting treatments, including but not limited to: pain, discomfort, or bruising at the treatment site; swelling, redness, or itching; numbness or tingling; changes in skin texture or color; infection or scarring; asymmetry or unevenness; unsatisfactory results.\n\nI understand that I have the right to ask questions and to withdraw my consent at any time during the treatment process. I also understand that I may experience side effects or complications that were not discussed during the consultation.\n\nI hereby release the provider and their staff from any liability arising from body sculpting treatments, except for instances of gross negligence or intentional misconduct. I also agree to follow all instructions provided by the provider and to promptly report any unusual symptoms or concerns.\n\nBy signing below, I acknowledge that I have read and fully understand this consent form and that I freely and voluntarily agree to undergo body sculpting treatments.",
            },
          ],
        },
      ],
    },
  },
  {
    id: "form-headspa",
    name: "Japanese HeadSpa Intake",
    category: "intake",
    description:
      "Head spa questionnaire — goals, hair and scalp history, health information, preferences — with consent and waiver.",
    sort: 3,
    active: true,
    schema: {
      sections: [
        {
          title: "Client Information",
          fields: [
            { key: "date_of_birth", type: "date", label: "Date of birth", half: true },
            { key: "emergency_contact", type: "text", label: "Emergency contact name & number", half: true },
          ],
        },
        {
          title: "Treatment Goals",
          fields: [
            { key: "reason", type: "checkboxes", label: "Primary reason for visit (check all that apply):", options: ["Relaxation", "Scalp Health", "Stress Relief", "Hair Care"] },
            { key: "reason_other", type: "text", label: "Other (please specify)" },
            { key: "focus_areas", type: "textarea", label: "Main concerns or focus areas" },
            { key: "hair_scalp_history", type: "textarea", label: "Hair and scalp history" },
            { key: "hair_care_routine", type: "textarea", label: "Current hair care routine" },
            { key: "shampoo", type: "text", label: "Shampoo", half: true },
            { key: "conditioner", type: "text", label: "Conditioner", half: true },
            { key: "additional_products", type: "text", label: "Additional products (e.g., oils, masks)" },
          ],
        },
        {
          title: "Scalp Condition",
          fields: [
            { key: "scalp_condition", type: "checkboxes", label: "Check all that apply:", options: ["Normal", "Dry", "Oily", "Sensitive", "Itchy", "Flaky"] },
            { key: "scalp_other", type: "text", label: "Other" },
          ],
        },
        {
          title: "Previous Treatments in the Last 6 Months",
          fields: [
            { key: "prev_treatments", type: "checkboxes", label: "Check all that apply:", options: ["Hair Coloring", "Perming", "Scalp Treatment"] },
            { key: "prev_other", type: "text", label: "Other" },
          ],
        },
        {
          title: "Health Information",
          fields: [
            { key: "allergies", type: "yesno_detail", label: "Do you have any allergies?" },
            { key: "experiencing", type: "checkboxes", label: "Are you currently experiencing any of the following?", options: ["Skin conditions (e.g., eczema, psoriasis)", "Migraines or frequent headaches", "Neck pain or sensitivity", "Sinus issues"] },
            { key: "experiencing_other", type: "text", label: "Other (please specify)" },
            { key: "medications", type: "textarea", label: "Current medications (if relevant to scalp/hair health)" },
          ],
        },
        {
          title: "Lifestyle & Wellness",
          fields: [
            { key: "diet", type: "checkboxes", label: "Dietary information:", options: ["Balanced", "High in protein", "Vegetarian/Vegan"] },
            { key: "diet_other", type: "text", label: "Other" },
            { key: "stress", type: "radio", label: "Stress levels:", options: ["Low", "Moderate", "High"] },
            { key: "sleep", type: "radio", label: "Sleep quality:", options: ["Good", "Average", "Poor"] },
          ],
        },
        {
          title: "Treatment Preferences",
          fields: [
            { key: "scent", type: "radio", label: "Aromatherapy scent preference (if using essential oils instead of already scented products):", options: ["Lavender or cherry blossom (Relaxing)", "Peppermint (Refreshing)", "Citrus (Energizing)"] },
            { key: "scent_other", type: "text", label: "Other" },
            { key: "pressure", type: "radio", label: "Massage pressure preference:", options: ["Light", "Medium", "Firm"] },
          ],
        },
        {
          title: "Consent and Waiver",
          fields: [
            { key: "consent", type: "statement", text: "I understand that the Japanese head spa treatment may involve the use of essential oils, scalp stimulation, and massage. I have disclosed all relevant information regarding my health and consent to the treatment." },
          ],
        },
      ],
    },
  },
  {
    id: "form-lymphatic",
    name: "Lymphatic Massage Intake",
    category: "intake",
    description:
      "Lymphatic drainage questionnaire — medical history and health screening — with the treatment disclaimer.",
    sort: 4,
    active: true,
    schema: {
      sections: [
        {
          title: "Personal Information",
          fields: [
            { key: "date_of_birth", type: "date", label: "Date of birth", half: true },
            { key: "age", type: "text", label: "Age", half: true },
            { key: "address", type: "text", label: "Address" },
            { key: "city", type: "text", label: "City", half: true },
            { key: "state", type: "text", label: "State", half: true },
            { key: "zip", type: "text", label: "Zip", half: true },
          ],
        },
        {
          title: "Medical History",
          fields: [
            {
              key: "conditions",
              type: "checkboxes",
              label: "Do you currently or have you had any of the following? Please check all that apply:",
              options: [
                "Hepatitis", "Glaucoma", "Chemotherapy", "AIDS/HIV", "Radiation",
                "Hemophilia", "Depression", "Diabetes", "Cardiac valve disease",
                "Mood altering disorder", "Hypertrophic scarring/keloids",
                "Bleeding disorder", "Autoimmune disorder", "Pregnant/Breastfeeding",
                "Serious heart condition", "History of MRSA", "Cancer",
              ],
            },
            { key: "conditions_other", type: "text", label: "Other" },
            { key: "reason", type: "textarea", label: "What is the reason you are seeking lymphatic massage today?" },
            { key: "allergies", type: "yesno_detail", label: "Do you have any allergies?" },
            { key: "taking_medications", type: "yesno_detail", label: "Are you currently taking any medications?" },
            { key: "recent_surgeries", type: "yesno_detail", label: "Have you undergone any recent surgeries or medical treatments?" },
            { key: "medical_concerns", type: "yesno_detail", label: "Do you have any medical conditions or concerns?" },
            { key: "pregnant", type: "yesno", label: "Are you currently pregnant or breastfeeding?" },
            { key: "medications_list", type: "text", label: "Medications currently taking" },
            { key: "other_info", type: "textarea", label: "Please provide any other information, medical or otherwise, not specified in this intake form that you feel is important for the therapist to know" },
          ],
        },
        {
          title: "Please Note",
          fields: [
            {
              key: "disclaimer",
              type: "statement",
              text: "Manual lymphatic drainage (MLD) is a very effective method, but certain medical conditions are contraindicated and determine if and when a session is possible. After consultation and consideration of the information you have provided, this form determines whether you can receive MLD today. For some conditions, a doctor's certificate or a consultation between the referring provider and the lymphatic therapist is required before continuing — this is for your safety and health.\n\nI understand that manual lymphatic drainage is not an alternative to medical care: if I need medical attention, diagnosis, or treatment, I should see a doctor or other licensed health care professional. I understand that lymphatic therapists are not qualified to diagnose, prescribe, or treat any physical or mental illness, and that manual lymphatic drainage should not be performed with certain diseases.\n\nI certify that I have disclosed all medical conditions I know of and answered all questions honestly, to the best of my knowledge and belief. I agree to keep my doctor informed and to tell the therapist of any changes to my medical profile.",
            },
          ],
        },
      ],
    },
  },
  {
    id: "form-photo-video-release",
    name: "Photo & Video Release",
    category: "release",
    description:
      "Authorization to use client photos, videos, and audio in promotional materials.",
    sort: 5,
    active: true,
    schema: {
      sections: [
        {
          title: "Release Agreement",
          fields: [
            {
              key: "release",
              type: "statement",
              text: "I, the undersigned client, hereby grant and authorize SKIN360 FACE BODY SCALP the right to take, edit, alter, copy, exhibit, publish, distribute and make use of any and all pictures, videos and/or audio taken of me to be used in and/or for any lawful promotional materials including, but not limited to, newsletters, flyers, posters, brochures, advertisements, press kits, websites, social media sites and other print and digital communications, without payment or any other consideration.\n\nThis authorization shall continue indefinitely and extends to all languages, media, formats and markets now known or later discovered.\n\nI waive any rights to royalties or other compensation arising or related to the use of the photograph or recording.\n\nI understand and agree that these materials shall become the property of SKIN360 FACE BODY SCALP and will not be returned.\n\nI hereby hold harmless and release SKIN360 FACE BODY SCALP from all liability, petitions, and causes of action which I, my heirs, representatives, executors, administrators, or any other persons may make while acting on my behalf or on behalf of my estate.\n\nBy signing below, I hereby acknowledge that I have completely read and fully understand the above release agreement.",
            },
          ],
        },
      ],
    },
  },
];
