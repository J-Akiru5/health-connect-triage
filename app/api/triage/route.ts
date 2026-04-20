import { NextRequest, NextResponse } from "next/server";
import { createAzureOpenAIClient, extractAssistantText } from "../../../src/server/azureOpenAI";

export const runtime = "nodejs";

type TriageCategoryLabel = "Homecare" | "Non-Urgent Consultation" | "Urgent Care" | "Emergency";
type TriageCategoryDb = "home_care" | "non_urgent" | "urgent" | "emergency";

type SymptomTriageRequest = {
  patientId?: string | null;
  assessmentId?: string | null;
  symptoms?: string[];
  duration?: string | null;
  severity?: string | null;
  notes?: string | null;
  vitals?: Record<string, unknown> | null;
  age?: number | null;
  sex?: string | null;
  barangay?: string | null;
  riskFactors?: string[];
};

type TriageModelPayload = {
  triageLevel?: string;
  riskScore?: number;
  recommendedAction?: string;
  explanation?: string;
  redFlags?: string[];
};

type TriageResponse = {
  patientId: string | null;
  assessmentId: string | null;
  triageLevel: TriageCategoryDb;
  triageLabel: TriageCategoryLabel;
  riskScore: number;
  recommendedAction: string;
  explanation: string;
  redFlags: string[];
  source: "azure-openai" | "fallback";
};

const TRIAGE_LABEL_TO_DB: Record<TriageCategoryLabel, TriageCategoryDb> = {
  Homecare: "home_care",
  "Non-Urgent Consultation": "non_urgent",
  "Urgent Care": "urgent",
  Emergency: "emergency",
};

const DB_TO_LABEL: Record<TriageCategoryDb, TriageCategoryLabel> = {
  home_care: "Homecare",
  non_urgent: "Non-Urgent Consultation",
  urgent: "Urgent Care",
  emergency: "Emergency",
};

const LABEL_ALIASES = new Map<string, TriageCategoryLabel>([
  ["homecare", "Homecare"],
  ["home care", "Homecare"],
  ["home_care", "Homecare"],
  ["non urgent consultation", "Non-Urgent Consultation"],
  ["non-urgent consultation", "Non-Urgent Consultation"],
  ["nonurgent", "Non-Urgent Consultation"],
  ["non_urgent", "Non-Urgent Consultation"],
  ["urgent care", "Urgent Care"],
  ["urgent", "Urgent Care"],
  ["emergency", "Emergency"],
]);

function getTextList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function normalizeLabel(value: unknown): TriageCategoryLabel | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim().toLowerCase().replace(/[_-]+/g, " ");
  return LABEL_ALIASES.get(normalized) ?? null;
}

function clampRiskScore(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round(value)));
}

function extractJsonBlock(text: string): string | null {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    return fenced[1].trim();
  }
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return trimmed.slice(start, end + 1).trim();
  }
  return null;
}

function buildSystemPrompt(): string {
  return [
    "You are a localized medical triage assistant for rural barangays in Western Visayas, Philippines.",
    "You do not diagnose. You triage based on the symptoms and context the patient provides.",
    "Use simple, calm English. Light Tagalog or Visayan is allowed when it helps clarity.",
    "Consider common rural and tropical risks such as dengue, leptospirosis, dehydration, acute respiratory infection, gastroenteritis, wound infection, pregnancy-related emergencies, and other urgent conditions common in the Philippines.",
    "Do not invent laboratory results or vitals.",
    "Return valid JSON only with these keys: triageLevel, riskScore, recommendedAction, explanation, redFlags.",
    "triageLevel must be exactly one of: Homecare, Non-Urgent Consultation, Urgent Care, Emergency.",
    "recommendedAction should be concise and practical.",
    "redFlags should be an array of short warning signs.",
  ].join(" ");
}

function buildUserPrompt(input: SymptomTriageRequest): string {
  const symptoms = getTextList(input.symptoms);
  const riskFactors = getTextList(input.riskFactors);
  const vitals = input.vitals && typeof input.vitals === "object" && !Array.isArray(input.vitals) ? input.vitals : null;

  return [
    "Assess this symptom report and return JSON only.",
    `Age: ${typeof input.age === "number" ? input.age : "unknown"}`,
    `Sex: ${typeof input.sex === "string" ? input.sex : "unknown"}`,
    `Barangay: ${typeof input.barangay === "string" ? input.barangay : "unknown"}`,
    `Duration: ${typeof input.duration === "string" ? input.duration : "unknown"}`,
    `Severity: ${typeof input.severity === "string" ? input.severity : "unknown"}`,
    `Symptoms: ${symptoms.length ? symptoms.join(", ") : "none provided"}`,
    `Risk factors: ${riskFactors.length ? riskFactors.join(", ") : "none provided"}`,
    `Notes: ${typeof input.notes === "string" ? input.notes : "none"}`,
    `Vitals: ${vitals ? JSON.stringify(vitals) : "none"}`,
    "Focus on whether the patient needs homecare, a non-urgent consultation, urgent care, or emergency care.",
  ].join("\n");
}

function makeResponse(payload: TriageResponse, status = 200): NextResponse<TriageResponse> {
  return NextResponse.json(payload, { status });
}

function parseTriagePayload(rawText: string): TriageModelPayload | null {
  const jsonBlock = extractJsonBlock(rawText);
  if (!jsonBlock) {
    return null;
  }

  try {
    const parsed = JSON.parse(jsonBlock) as TriageModelPayload;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function fallbackTriage(input: SymptomTriageRequest): TriageResponse {
  const symptoms = getTextList(input.symptoms).join(" ").toLowerCase();
  const notes = typeof input.notes === "string" ? input.notes.toLowerCase() : "";
  const combined = `${symptoms} ${notes}`;
  const riskFactors = getTextList(input.riskFactors);

  const emergencySignals = [
    "chest pain",
    "trouble breathing",
    "shortness of breath",
    "fainting",
    "unconscious",
    "seizure",
    "severe bleeding",
    "vomiting blood",
    "black stool",
    "confusion",
    "stroke",
    "severe dehydration",
    "pregnant and bleeding",
  ];
  const urgentSignals = [
    "dengue",
    "leptospirosis",
    "high fever",
    "persistent vomiting",
    "severe headache",
    "neck stiffness",
    "jaundice",
    "dark urine",
    "urinating less",
    "rash",
    "calf pain",
    "diarrhea",
    "abdominal pain",
  ];

  const emergencyMatch = emergencySignals.some((signal) => combined.includes(signal));
  const urgentMatch = urgentSignals.some((signal) => combined.includes(signal));
  const riskBoost = riskFactors.length >= 2 ? 10 : riskFactors.length === 1 ? 5 : 0;
  const level: TriageCategoryDb = emergencyMatch ? "emergency" : urgentMatch ? "urgent" : "non_urgent";
  const label = DB_TO_LABEL[level];
  const riskScore = level === "emergency" ? 95 : level === "urgent" ? 75 : 45 + riskBoost;

  return {
    patientId: typeof input.patientId === "string" ? input.patientId : null,
    assessmentId: typeof input.assessmentId === "string" ? input.assessmentId : null,
    triageLevel: level,
    triageLabel: label,
    riskScore,
    recommendedAction:
      level === "emergency"
        ? "Go to the nearest hospital or call emergency services now."
        : level === "urgent"
          ? "Seek same-day consultation with a Barangay Health Worker or Rural Health Unit."
          : "Monitor at home, hydrate well, and book a routine consultation if symptoms persist or worsen.",
    explanation:
      level === "emergency"
        ? "The symptom pattern includes emergency warning signs that should not wait."
        : level === "urgent"
          ? "The symptom pattern suggests a condition that should be assessed the same day."
          : "The symptom pattern does not show immediate danger signs, but follow-up is still important if symptoms continue.",
    redFlags:
      level === "emergency"
        ? ["severe breathing difficulty", "chest pain", "fainting", "heavy bleeding"]
        : level === "urgent"
          ? ["persistent fever", "worsening pain", "vomiting", "dehydration"]
          : ["worsening fever", "trouble breathing", "dehydration", "new severe pain"],
    source: "fallback",
  };
}

export async function POST(request: NextRequest) {
  let body: SymptomTriageRequest;
  try {
    body = (await request.json()) as SymptomTriageRequest;
  } catch {
    return makeResponse(
      {
        patientId: null,
        assessmentId: null,
        triageLevel: "non_urgent",
        triageLabel: "Non-Urgent Consultation",
        riskScore: 0,
        recommendedAction: "Provide a valid symptom payload.",
        explanation: "The request body could not be parsed.",
        redFlags: [],
        source: "fallback",
      },
      400
    );
  }

  const input: SymptomTriageRequest = {
    patientId: typeof body.patientId === "string" ? body.patientId : null,
    assessmentId: typeof body.assessmentId === "string" ? body.assessmentId : null,
    symptoms: getTextList(body.symptoms),
    duration: typeof body.duration === "string" ? body.duration : null,
    severity: typeof body.severity === "string" ? body.severity : null,
    notes: typeof body.notes === "string" ? body.notes : null,
    vitals: body.vitals && typeof body.vitals === "object" && !Array.isArray(body.vitals) ? body.vitals : null,
    age: typeof body.age === "number" && Number.isFinite(body.age) ? body.age : null,
    sex: typeof body.sex === "string" ? body.sex : null,
    barangay: typeof body.barangay === "string" ? body.barangay : null,
    riskFactors: getTextList(body.riskFactors),
  };

  if (input.symptoms.length === 0 && !input.notes && !input.vitals) {
    return makeResponse(
      {
        patientId: input.patientId,
        assessmentId: input.assessmentId,
        triageLevel: "non_urgent",
        triageLabel: "Non-Urgent Consultation",
        riskScore: 0,
        recommendedAction: "Please provide at least one symptom or note.",
        explanation: "The triage request did not include symptom details.",
        redFlags: [],
        source: "fallback",
      },
      400
    );
  }

  try {
    const { client, deploymentName } = createAzureOpenAIClient();
    const response = await client.chat.completions.create({
      model: deploymentName,
      messages: [
        { role: "system", content: buildSystemPrompt() },
        { role: "user", content: buildUserPrompt(input) },
      ],
      temperature: 0.2,
      max_tokens: 600,
    });

    const rawText = extractAssistantText(response).trim();
    const parsed = rawText ? parseTriagePayload(rawText) : null;

    if (!parsed || !parsed.triageLevel) {
      return makeResponse(fallbackTriage(input));
    }

    const triageLabel = normalizeLabel(parsed.triageLevel) ?? "Non-Urgent Consultation";
    const triageLevel = TRIAGE_LABEL_TO_DB[triageLabel];
    const riskScore = clampRiskScore(parsed.riskScore);
    const recommendedAction =
      typeof parsed.recommendedAction === "string" && parsed.recommendedAction.trim().length > 0
        ? parsed.recommendedAction.trim()
        : triageLevel === "emergency"
          ? "Go to the nearest hospital or call emergency services now."
          : triageLevel === "urgent"
            ? "Seek same-day consultation with a Barangay Health Worker or Rural Health Unit."
            : "Monitor at home, hydrate well, and book a routine consultation if symptoms persist or worsen.";

    const explanation =
      typeof parsed.explanation === "string" && parsed.explanation.trim().length > 0
        ? parsed.explanation.trim()
        : "The model returned a triage result without an explanation.";

    const redFlags = getTextList(parsed.redFlags);

    return makeResponse({
      patientId: input.patientId,
      assessmentId: input.assessmentId,
      triageLevel,
      triageLabel,
      riskScore,
      recommendedAction,
      explanation,
      redFlags,
      source: "azure-openai",
    });
  } catch {
    return makeResponse(fallbackTriage(input));
  }
}
