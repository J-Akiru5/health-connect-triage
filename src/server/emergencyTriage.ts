import { createAzureOpenAIClient, extractAssistantText } from "./azureOpenAI";

export type EmergencyPriorityLevel = "emergency" | "urgent" | "non-urgent" | "home-care";
export type EmergencyUrgencyLabel = "high" | "medium" | "low";

type IncomingSymptom = {
  id?: unknown;
  label?: unknown;
  category?: unknown;
};

export type EmergencyTriageRequestBody = {
  locale?: string | null;
  patient?: {
    name?: string | null;
    duration?: string | null;
  } | null;
  symptoms?: IncomingSymptom[] | null;
  riskFactors?: string[] | null;
};

type EmergencyTriageResult = {
  priorityLevel: EmergencyPriorityLevel;
  riskScore: number;
  urgencyLabel: EmergencyUrgencyLabel;
  recommendedAction: string;
  summary: string;
  redFlags: string[];
};

function normalizeLocale(locale: string | null | undefined): "en" | "tl" | "hil" {
  const value = (locale ?? "").toLowerCase();
  if (value.startsWith("tl") || value.startsWith("fil")) return "tl";
  if (value.startsWith("hil")) return "hil";
  return "en";
}

function getLanguageInstruction(locale: "en" | "tl" | "hil"): string {
  if (locale === "tl") return "Write all user-facing text in Filipino/Tagalog.";
  if (locale === "hil") return "Write all user-facing text in Hiligaynon/Ilonggo.";
  return "Write all user-facing text in English.";
}

function clampScore(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 50;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function sanitizePriority(value: unknown): EmergencyPriorityLevel {
  if (value === "emergency" || value === "urgent" || value === "non-urgent" || value === "home-care") {
    return value;
  }
  return "non-urgent";
}

function sanitizeUrgency(value: unknown, priority: EmergencyPriorityLevel): EmergencyUrgencyLabel {
  if (value === "high" || value === "medium" || value === "low") return value;
  if (priority === "emergency" || priority === "urgent") return "high";
  if (priority === "home-care") return "low";
  return "medium";
}

function sanitizeText(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function sanitizeRedFlags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((x): x is string => typeof x === "string")
    .map((x) => x.trim())
    .filter((x) => x.length > 0)
    .slice(0, 6);
}

function extractJsonPayload(raw: string): unknown {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1]?.trim() || raw.trim();

  const firstBrace = candidate.indexOf("{");
  const lastBrace = candidate.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error("AI response did not include a JSON object.");
  }

  const jsonText = candidate.slice(firstBrace, lastBrace + 1);
  return JSON.parse(jsonText);
}

function normalizeSymptoms(symptoms: IncomingSymptom[] | null | undefined) {
  return (symptoms ?? [])
    .map((s) => ({
      id: typeof s.id === "string" ? s.id : "",
      label: typeof s.label === "string" ? s.label : "",
      category: typeof s.category === "string" ? s.category : "",
    }))
    .filter((s) => s.id && s.label);
}

function normalizeRiskFactors(riskFactors: string[] | null | undefined): string[] {
  return (riskFactors ?? [])
    .filter((x): x is string => typeof x === "string")
    .map((x) => x.trim())
    .filter((x) => x.length > 0)
    .slice(0, 12);
}

export async function generateEmergencyTriageAssessment(
  body: EmergencyTriageRequestBody,
  apiKey: string
): Promise<EmergencyTriageResult> {
  const locale = normalizeLocale(body.locale ?? "en");
  const symptoms = normalizeSymptoms(body.symptoms);
  const riskFactors = normalizeRiskFactors(body.riskFactors);

  if (symptoms.length === 0) {
    throw new Error("At least one symptom is required for AI triage.");
  }

  const patientName = typeof body.patient?.name === "string" ? body.patient.name.trim() : "";
  const duration = typeof body.patient?.duration === "string" ? body.patient.duration.trim() : "";

  if (apiKey) {
    process.env.AZURE_OPENAI_API_KEY = apiKey;
  }

  const systemPrompt = [
    "You are an emergency triage prioritization assistant for a barangay telehealth app.",
    "You do not diagnose diseases.",
    "Output must be strict JSON only.",
    "Classify priority using exactly one of: emergency, urgent, non-urgent, home-care.",
    "Set urgencyLabel to one of: high, medium, low.",
    "Provide a riskScore integer from 0 to 100.",
    "recommendedAction and summary must be concise, practical, and non-diagnostic.",
    "If symptoms indicate immediate danger (e.g., chest pain, severe breathing difficulty, unconsciousness, severe bleeding, seizure), prioritize emergency.",
    getLanguageInstruction(locale),
  ].join(" ");

  const userPrompt = [
    "Return JSON with this exact shape:",
    '{"priorityLevel":"emergency|urgent|non-urgent|home-care","riskScore":0,"urgencyLabel":"high|medium|low","recommendedAction":"...","summary":"...","redFlags":["..."]}',
    "",
    `Locale: ${locale}`,
    `Patient name: ${patientName || "unknown"}`,
    `Duration: ${duration || "unknown"}`,
    `Symptoms: ${JSON.stringify(symptoms)}`,
    `Risk factors: ${JSON.stringify(riskFactors)}`,
  ].join("\n");

  const { client, deploymentName } = createAzureOpenAIClient();
  const completion = await client.getChatCompletions(
    deploymentName,
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    { temperature: 0.2, maxTokens: 650 }
  );

  const raw = extractAssistantText(completion).trim();
  if (!raw) throw new Error("No triage assessment returned by AI.");

  let parsed: any;
  try {
    parsed = extractJsonPayload(raw);
  } catch {
    throw new Error("AI returned invalid triage JSON.");
  }

  const priorityLevel = sanitizePriority(parsed?.priorityLevel);
  const urgencyLabel = sanitizeUrgency(parsed?.urgencyLabel, priorityLevel);

  return {
    priorityLevel,
    riskScore: clampScore(parsed?.riskScore),
    urgencyLabel,
    recommendedAction: sanitizeText(
      parsed?.recommendedAction,
      locale === "en"
        ? "Seek immediate help if symptoms worsen suddenly."
        : locale === "tl"
          ? "Humingi agad ng tulong kung biglang lumala ang sintomas."
          : "Pangayo dayon bulig kon kalit maglala ang sintomas."
    ),
    summary: sanitizeText(
      parsed?.summary,
      locale === "en"
        ? "This is an AI-assisted urgency estimate and not a medical diagnosis."
        : locale === "tl"
          ? "AI-assisted na pagtataya ito ng urgency at hindi medikal na diagnosis."
          : "AI-assisted ini nga pagtantiya sang urgency kag indi medikal nga diagnosis."
    ),
    redFlags: sanitizeRedFlags(parsed?.redFlags),
  };
}
