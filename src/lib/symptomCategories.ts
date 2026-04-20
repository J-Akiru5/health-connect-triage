export type TriageLevel = "emergency" | "urgent" | "non-urgent" | "home-care" | null;

export interface SymptomItem {
  id: string;
  label: string;
  severity: number;
}

export interface SymptomCategory {
  name: string;
  /** Shown under the category title when present (e.g. how to answer joint/muscle location). */
  description?: string;
  symptoms: SymptomItem[];
}

export const EMERGENCY_SYMPTOM_IDS = [
  "difficulty-breathing",
  "chest-pain",
  "unconscious",
  "severe-bleeding",
  "seizure",
  "confusion",
] as const;

export const symptomCategories: SymptomCategory[] = [
  {
    name: "General Symptoms",
    symptoms: [
      { id: "fever", label: "Fever (lagnat)", severity: 2 },
      { id: "fatigue", label: "Fatigue / Weakness (panghihina)", severity: 1 },
      { id: "chills", label: "Chills (ginaw)", severity: 2 },
      { id: "weight-loss", label: "Unexplained weight loss", severity: 3 },
    ],
  },
  {
    name: "Respiratory",
    symptoms: [
      { id: "cough", label: "Cough (ubo)", severity: 1 },
      { id: "difficulty-breathing", label: "Difficulty breathing (hirap huminga)", severity: 5 },
      { id: "chest-pain", label: "Chest pain (sakit ng dibdib)", severity: 5 },
      { id: "sore-throat", label: "Sore throat (namamagang lalamunan)", severity: 1 },
    ],
  },
  {
    name: "Pain",
    description:
      "For joint or muscle pain, mark the painful areas. You can choose more than one. Add details in notes if needed (e.g. left knee, front of thigh).",
    symptoms: [
      { id: "headache", label: "Headache (sakit ng ulo)", severity: 1 },
      { id: "severe-headache", label: "Severe / Sudden headache", severity: 4 },
      { id: "abdominal-pain", label: "Abdominal pain (sakit ng tiyan)", severity: 2 },
      {
        id: "joint-pain",
        label:
          "Joint or muscle pain — whole body, many areas, or not sure where (buong katawan / maraming bahagi / hindi tiyak)",
        severity: 1,
      },
      { id: "pain-neck", label: "Neck (leeg)", severity: 1 },
      { id: "pain-upper-back", label: "Upper back / between shoulder blades (itaas na likod)", severity: 1 },
      { id: "pain-lower-back", label: "Lower back (ibaba ng likod / lumbar)", severity: 2 },
      { id: "pain-shoulder-arm", label: "Shoulder or upper arm (balikat / itaas na braso)", severity: 1 },
      { id: "pain-elbow-forearm", label: "Elbow or forearm (siko / bisig)", severity: 1 },
      { id: "pain-wrist-hand", label: "Wrist, hand, or fingers (pulso / kamay / mga daliri)", severity: 1 },
      { id: "pain-hip-groin", label: "Hip or groin (balakang / singit)", severity: 1 },
      { id: "pain-thigh", label: "Thigh (hità)", severity: 1 },
      { id: "pain-knee", label: "Knee (tuhod)", severity: 1 },
      { id: "pain-calf-shin", label: "Calf or shin (binti / tibia)", severity: 1 },
      { id: "pain-ankle-foot", label: "Ankle or foot (takong / paa)", severity: 1 },
      { id: "muscle-ache-cramp", label: "Muscle ache or cramps in arms or legs (masakit na kalamnan / pulikat)", severity: 1 },
      {
        id: "joint-swollen-hot",
        label: "Painful joint with swelling, redness, or warmth (namamaga, namumula, o mainit ang kasukasuan)",
        severity: 3,
      },
    ],
  },
  {
    name: "Digestive",
    symptoms: [
      { id: "nausea", label: "Nausea / Vomiting (pagsusuka)", severity: 2 },
      { id: "diarrhea", label: "Diarrhea (pagtatae)", severity: 2 },
      { id: "blood-stool", label: "Blood in stool", severity: 4 },
      { id: "loss-appetite", label: "Loss of appetite", severity: 1 },
    ],
  },
  {
    name: "Emergency Signs",
    symptoms: [
      { id: "unconscious", label: "Loss of consciousness (nawalan ng malay)", severity: 5 },
      { id: "severe-bleeding", label: "Severe bleeding (matinding pagdurugo)", severity: 5 },
      { id: "seizure", label: "Seizure / Convulsions (kombulsyon)", severity: 5 },
      { id: "confusion", label: "Sudden confusion / Disorientation", severity: 5 },
    ],
  },
];

const allSymptomsFlat: SymptomItem[] = symptomCategories.flatMap((c) => c.symptoms);

export function findSymptomLabel(symptomId: string): string | undefined {
  return allSymptomsFlat.find((s) => s.id === symptomId)?.label;
}

export function resolveSymptomLabel(symptomId: string): string {
  return findSymptomLabel(symptomId) ?? symptomId;
}

const emergencySymptomSet = new Set<string>(EMERGENCY_SYMPTOM_IDS);

export function calculateTriage(
  selectedSymptoms: string[],
  selectedRiskFactors: string[],
): TriageLevel {
  let totalSeverity = 0;

  symptomCategories.forEach((category) => {
    category.symptoms.forEach((symptom) => {
      if (selectedSymptoms.includes(symptom.id)) {
        totalSeverity += symptom.severity;
      }
    });
  });

  if (selectedSymptoms.some((s) => emergencySymptomSet.has(s))) {
    return "emergency";
  }

  totalSeverity += selectedRiskFactors.length * 1.5;

  if (totalSeverity >= 8) return "urgent";
  if (totalSeverity >= 4) return "non-urgent";
  if (totalSeverity >= 1) return "home-care";

  return null;
}
