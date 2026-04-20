import { createAzureOpenAIClient, extractAssistantText } from "./azureOpenAI.js";

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

type AzureTriageError = Error & {
  status: number;
  detail: string;
};

function isTransientError(error: unknown): boolean {
  const e = error as { status?: unknown; statusCode?: unknown; message?: unknown };
  const status = Number(e?.statusCode ?? e?.status ?? 0);
  if (status === 429 || status >= 500) return true;

  const message = typeof e?.message === "string" ? e.message.toLowerCase() : "";
  return message.includes("timeout") || message.includes("timed out") || message.includes("econnreset");
}

function shouldRetryFromMessage(message: string): boolean {
  const normalized = message.toLowerCase();
  return normalized.includes("invalid triage json") || normalized.includes("no triage assessment returned");
}

function isConfigurationError(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("unauthorized") ||
    normalized.includes("authentication") ||
    normalized.includes("forbidden") ||
    normalized.includes("deployment") ||
    normalized.includes("resource not found") ||
    normalized.includes("openai_api_version") ||
    normalized.includes("azure_openai_endpoint") ||
    normalized.includes("azure_openai_api_key")
  );
}

function isAzureUpstreamFailure(error: unknown): boolean {
  const e = error as { status?: unknown; statusCode?: unknown; response?: { status?: unknown }; message?: unknown };
  const candidate = e?.statusCode ?? e?.status ?? e?.response?.status;
  const status = typeof candidate === "number" ? candidate : Number(candidate);

  if (Number.isFinite(status) && (status === 429 || status >= 500)) {
    return true;
  }

  const message = typeof e?.message === "string" ? e.message.toLowerCase() : "";
  return (
    message.includes("timeout") ||
    message.includes("timed out") ||
    message.includes("fetch failed") ||
    message.includes("network") ||
    message.includes("econnreset") ||
    message.includes("socket hang up") ||
    message.includes("service unavailable")
  );
}

function createAzureTriageError(detail: string): AzureTriageError {
  const error = new Error(detail) as AzureTriageError;
  error.status = 502;
  error.detail = detail;
  return error;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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

function fallbackTriage(body: EmergencyTriageRequestBody): EmergencyTriageResult {
  const symptomsText = normalizeSymptoms(body.symptoms)
    .map((symptom) => symptom.label)
    .join(" ")
    .toLowerCase();
  const riskFactors = normalizeRiskFactors(body.riskFactors);
  const duration = typeof body.patient?.duration === "string" ? body.patient.duration.trim() : "";
  const locale = normalizeLocale(body.locale ?? "en");

  const emergencySignals = [
    "chest pain",
    "difficulty breathing",
    "trouble breathing",
    "shortness of breath",
    "unconscious",
    "fainting",
    "severe bleeding",
    "seizure",
    "stroke",
  ];
  const urgentSignals = ["high fever", "dengue", "persistent vomiting", "severe headache", "abdominal pain", "rash"];

  const combinedText = `${symptomsText} ${duration.toLowerCase()} ${riskFactors.join(" ").toLowerCase()}`;
  const isEmergency = emergencySignals.some((signal) => combinedText.includes(signal));
  const isUrgent = urgentSignals.some((signal) => combinedText.includes(signal));

  const priorityLevel: EmergencyPriorityLevel = isEmergency ? "emergency" : isUrgent ? "urgent" : "non-urgent";
  const urgencyLabel: EmergencyUrgencyLabel = isEmergency ? "high" : isUrgent ? "high" : "medium";

  return {
    priorityLevel,
    riskScore: isEmergency ? 95 : isUrgent ? 75 : 45,
    urgencyLabel,
    recommendedAction:
      priorityLevel === "emergency"
        ? locale === "tl"
          ? "Pumunta agad sa pinakamalapit na ospital o tumawag ng emergency services."
          : locale === "hil"
            ? "Kadto dayon sa pinakamalapit nga ospital ukon tawagi ang emergency services."
            : "Go to the nearest hospital or call emergency services now."
        : priorityLevel === "urgent"
          ? locale === "tl"
            ? "Magpatingin sa parehong araw sa Barangay Health Worker o Rural Health Unit."
            : locale === "hil"
              ? "Magpakonsulta sa sina nga adlaw sa Barangay Health Worker ukon Rural Health Unit."
              : "Seek same-day consultation with a Barangay Health Worker or Rural Health Unit."
          : locale === "tl"
            ? "Magpahinga sa bahay, uminom ng sapat na tubig, at magpatingin kung lumala ang sintomas."
            : locale === "hil"
              ? "Magpahuway sa balay, mag-inom sang madamo nga tubig, kag magpakonsulta kon maglala ang sintomas."
              : "Monitor at home, hydrate well, and book a consultation if symptoms persist or worsen.",
    summary:
      priorityLevel === "emergency"
        ? locale === "tl"
          ? "May mga senyales ng emergency na hindi dapat ipagpaliban."
          : locale === "hil"
            ? "May mga senyales sang emergency nga indi dapat pagpaabot."
            : "The symptom pattern includes emergency warning signs that should not wait."
        : priorityLevel === "urgent"
          ? locale === "tl"
            ? "Ang mga sintomas ay dapat masuri sa lalong madaling panahon."
            : locale === "hil"
              ? "Ang mga sintomas dapat masuta sa labing madali nga tion."
              : "The symptom pattern suggests a condition that should be assessed the same day."
          : locale === "tl"
            ? "Walang agad na danger signs, pero bantayan ang sintomas at magpatingin kung lumala."
            : locale === "hil"
              ? "Wala sang agar nga danger signs, pero bantayi ang sintomas kag magpakonsulta kon maglala."
              : "The symptom pattern does not show immediate danger signs, but follow-up is still important if symptoms continue.",
    redFlags:
      priorityLevel === "emergency"
        ? ["severe breathing difficulty", "chest pain", "fainting", "heavy bleeding"]
        : priorityLevel === "urgent"
          ? ["persistent fever", "worsening pain", "vomiting", "dehydration"]
          : ["worsening fever", "trouble breathing", "dehydration", "new severe pain"],
  };
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

  const { client, deploymentName } = createAzureOpenAIClient(apiKey);
  const maxRetries = 2;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      const completion = await client.chat.completions.create({
        model: deploymentName,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.2,
        max_tokens: 650,
      });

      const raw = extractAssistantText(completion).trim();
      if (!raw) throw new Error("No triage assessment returned by AI.");

      let parsed: Record<string, unknown>;
      try {
        parsed = extractJsonPayload(raw) as Record<string, unknown>;
      } catch {
        throw new Error("AI returned invalid triage JSON.");
      }

      const priorityLevel = sanitizePriority(parsed.priorityLevel);
      const urgencyLabel = sanitizeUrgency(parsed.urgencyLabel, priorityLevel);

      return {
        priorityLevel,
        riskScore: clampScore(parsed.riskScore),
        urgencyLabel,
        recommendedAction: sanitizeText(
          parsed.recommendedAction,
          locale === "en"
            ? "Seek immediate help if symptoms worsen suddenly."
            : locale === "tl"
              ? "Humingi agad ng tulong kung biglang lumala ang sintomas."
              : "Pangayo dayon bulig kon kalit maglala ang sintomas."
        ),
        summary: sanitizeText(
          parsed.summary,
          locale === "en"
            ? "This is an AI-assisted urgency estimate and not a medical diagnosis."
            : locale === "tl"
              ? "AI-assisted na pagtataya ito ng urgency at hindi medikal na diagnosis."
              : "AI-assisted ini nga pagtantiya sang urgency kag indi medikal nga diagnosis."
        ),
        redFlags: sanitizeRedFlags(parsed.redFlags),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const canRetry = isTransientError(error) || shouldRetryFromMessage(message);
      if (!canRetry || attempt >= maxRetries) {
        const detail = typeof message === "string" ? message : "AI triage failed";
        if (isConfigurationError(detail)) {
          throw new Error(`Azure OpenAI configuration/runtime issue: ${detail}`);
        }
        if (isAzureUpstreamFailure(error)) {
          throw createAzureTriageError(`Azure OpenAI upstream failure: ${detail}`);
        }
        return fallbackTriage(body);
      }
      await wait(250 * (attempt + 1));
    }
  }

  return fallbackTriage(body);
}
