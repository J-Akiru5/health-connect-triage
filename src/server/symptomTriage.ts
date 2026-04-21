import { createAzureOpenAIClient, extractAssistantText } from "./azureOpenAI.js";

// ─── Types ───────────────────────────────────────────────────────────────────

export type SymptomPriorityLevel = "emergency" | "urgent" | "non-urgent" | "home-care";
export type SymptomUrgencyLabel = "high" | "medium" | "low";

export type SymptomTriageSymptom = {
  id: string;
  label: string;
  category: string;
  duration: string;       // raw value: "today" | "days" | "week" | "weeks"
  durationLabel: string;  // human-readable, e.g. "A few days"
  severity: string;       // "mild" | "moderate" | "severe"
};

export type SymptomTriageRequestBody = {
  locale?: string | null;
  patient?: {
    surname?: string | null;
    firstName?: string | null;
    gender?: string | null;
    age?: number | null;
    birthday?: string | null;
  } | null;
  symptoms: SymptomTriageSymptom[];
  riskFactors?: string[] | null;
  vitals?: {
    bpSystolic?: number | null;
    bpDiastolic?: number | null;
    tempC?: number | null;
  } | null;
  notes?: string | null;
};

export type SymptomTriageResult = {
  priorityLevel: SymptomPriorityLevel;
  riskScore: number;
  urgencyLabel: SymptomUrgencyLabel;
  recommendedAction: string;
  summary: string;
  redFlags: string[];
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normalizeLocale(locale: string | null | undefined): "en" | "tl" | "hil" {
  const value = (locale ?? "").toLowerCase();
  if (value.startsWith("tl") || value.startsWith("fil")) return "tl";
  if (value.startsWith("hil")) return "hil";
  return "en";
}

function getLanguageInstruction(locale: "en" | "tl" | "hil"): string {
  if (locale === "tl") return "Write all user-facing text (recommendedAction, summary, redFlags) in Filipino/Tagalog.";
  if (locale === "hil") return "Write all user-facing text (recommendedAction, summary, redFlags) in Hiligaynon/Ilonggo.";
  return "Write all user-facing text in clear, plain English.";
}

function clampScore(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 50;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function sanitizePriority(value: unknown): SymptomPriorityLevel {
  if (value === "emergency" || value === "urgent" || value === "non-urgent" || value === "home-care") {
    return value;
  }
  return "non-urgent";
}

function sanitizeUrgency(value: unknown, priority: SymptomPriorityLevel): SymptomUrgencyLabel {
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

  return JSON.parse(candidate.slice(firstBrace, lastBrace + 1));
}

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

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Core Function ────────────────────────────────────────────────────────────

export async function generateSymptomTriageAssessment(
  body: SymptomTriageRequestBody
): Promise<SymptomTriageResult> {
  const locale = normalizeLocale(body.locale);

  if (!body.symptoms || body.symptoms.length === 0) {
    throw new Error("At least one symptom is required for AI triage.");
  }

  // ── Build patient context string ──
  const patient = body.patient ?? {};
  const patientName = [patient.firstName, patient.surname].filter(Boolean).join(" ").trim() || "Unknown";
  const patientAge = typeof patient.age === "number" && patient.age >= 0 ? `${patient.age} years old` : "Unknown";
  const patientGender = typeof patient.gender === "string" && patient.gender ? patient.gender : "Unknown";

  // ── Build symptoms context string ──
  const symptomsText = body.symptoms
    .map(
      (s) =>
        `  - ${s.label} (Category: ${s.category}, Duration: ${s.durationLabel || s.duration}, Patient-rated severity: ${s.severity})`
    )
    .join("\n");

  // ── Build risk factors context string ──
  const riskFactors = (body.riskFactors ?? []).filter((x) => typeof x === "string" && x.trim());
  const riskFactorsText =
    riskFactors.length > 0 ? riskFactors.join(", ") : "None reported";

  // ── Build vitals context string ──
  const vitals = body.vitals ?? {};
  const vitalsLines: string[] = [];
  if (vitals.bpSystolic != null && vitals.bpDiastolic != null) {
    vitalsLines.push(`Blood pressure: ${vitals.bpSystolic}/${vitals.bpDiastolic} mmHg`);
  }
  if (vitals.tempC != null) {
    vitalsLines.push(`Temperature: ${vitals.tempC}°C`);
  }
  const vitalsText = vitalsLines.length > 0 ? vitalsLines.join(", ") : "Not provided";

  const notes = typeof body.notes === "string" && body.notes.trim() ? body.notes.trim() : "None";

  // ── System prompt ──
  const systemPrompt = [
    "You are an emergency triage prioritization assistant for a Philippine barangay telehealth app.",
    "You do NOT diagnose diseases or prescribe treatment.",
    "You evaluate symptom urgency and recommend appropriate next steps within the community health system.",
    "Output ONLY strict JSON — no prose, no markdown outside the JSON block.",
    "Classify priority using exactly one of: emergency, urgent, non-urgent, home-care.",
    "Set urgencyLabel to one of: high, medium, low.",
    "Provide riskScore as an integer from 0 to 100 (100 = most critical).",
    "recommendedAction: concise, practical, non-diagnostic action step (1-2 sentences).",
    "summary: brief clinical context for why this priority was assigned (2-3 sentences).",
    "redFlags: array of 1-5 specific warning signs the patient should watch for.",
    "If symptoms indicate immediate danger (chest pain, severe breathing difficulty, loss of consciousness, seizures, severe bleeding, stroke signs), always classify as emergency.",
    "Apply higher urgency if the patient is elderly (60+), pregnant, diabetic, hypertensive, immunocompromised, or has heart disease.",
    getLanguageInstruction(locale),
  ].join(" ");

  // ── User prompt ──
  const userPrompt = [
    "Return JSON matching this exact shape:",
    '{"priorityLevel":"emergency|urgent|non-urgent|home-care","riskScore":0,"urgencyLabel":"high|medium|low","recommendedAction":"...","summary":"...","redFlags":["..."]}',
    "",
    `--- PATIENT DEMOGRAPHICS ---`,
    `Name: ${patientName}`,
    `Age: ${patientAge}`,
    `Gender: ${patientGender}`,
    `Locale: ${locale}`,
    "",
    `--- REPORTED SYMPTOMS ---`,
    symptomsText,
    "",
    `--- RISK FACTORS ---`,
    riskFactorsText,
    "",
    `--- VITAL SIGNS ---`,
    vitalsText,
    "",
    `--- ADDITIONAL NOTES ---`,
    notes,
  ].join("\n");

  const { client, deploymentName } = createAzureOpenAIClient();
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
        max_tokens: 700,
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
          "Monitor your condition closely and contact your Barangay Health Worker if symptoms worsen."
        ),
        summary: sanitizeText(
          parsed.summary,
          "This is an AI-assisted urgency estimate based on your reported symptoms. It is not a clinical diagnosis."
        ),
        redFlags: sanitizeRedFlags(parsed.redFlags),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const canRetry = isTransientError(error) || shouldRetryFromMessage(message);
      if (!canRetry || attempt >= maxRetries) {
        // Re-throw so the API layer can return a proper error response.
        throw error;
      }
      await wait(300 * (attempt + 1));
    }
  }

  // This line is unreachable in practice but satisfies TypeScript.
  throw new Error("AI triage failed after all retries.");
}
