import { createGeminiClient } from "./gemini";

type ExplainRequestBody = {
  triageLevel?: string | null;
  riskScore?: number | null;
  recommendedAction?: string | null;
  assessment?: {
    symptoms?: unknown;
    duration?: string | null;
    severity?: string | null;
    notes?: string | null;
    vitals?: Record<string, unknown> | null;
  } | null;
};

function getStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
}

export async function generateTriageExplanation(body: ExplainRequestBody) {
  const triageLevel = typeof body.triageLevel === "string" ? body.triageLevel : null;
  const recommendedAction = typeof body.recommendedAction === "string" ? body.recommendedAction : null;
  const riskScore =
    typeof body.riskScore === "number" && Number.isFinite(body.riskScore) ? body.riskScore : null;

  const assessment = body.assessment ?? null;
  const symptoms = getStringArray(assessment?.symptoms);
  const duration = typeof assessment?.duration === "string" ? assessment?.duration : null;
  const severity = typeof assessment?.severity === "string" ? assessment?.severity : null;
  const notes = typeof assessment?.notes === "string" ? assessment?.notes : null;
  const vitals =
    assessment?.vitals && typeof assessment.vitals === "object" && !Array.isArray(assessment.vitals)
      ? assessment.vitals
      : null;

  const systemInstructions = [
    "You are a clinical triage explanation assistant for a rural barangay health app. You are powered by Google's Gemini AI.",
    "You DO NOT diagnose. You explain the triage output in plain language.",
    "Be cautious, concise, and use non-alarming wording when possible.",
    "Always include a brief safety disclaimer and what to do if symptoms worsen.",
    "Respond naturally in simple English.",
  ].join(" ");

  const userPrompt = [
    "Explain this triage result for the patient in 4-7 sentences.",
    "Use simple English (optionally mix a little Tagalog phrases if helpful, but keep it mostly English).",
    "",
    `Triage level: ${triageLevel ?? "unknown"}`,
    `Risk score: ${riskScore ?? "unknown"}`,
    `Recommended action: ${recommendedAction ?? "unknown"}`,
    `Symptoms: ${symptoms.length ? symptoms.join(", ") : "unknown"}`,
    `Duration summary: ${duration ?? "unknown"}`,
    `Severity: ${severity ?? "unknown"}`,
    `Notes: ${notes ?? "none"}`,
    `Vitals: ${vitals ? JSON.stringify(vitals) : "none"}`,
  ].join("\n");

  const { model } = createGeminiClient();

  const result = await model.generateContent(`${systemInstructions}\n\nUSER REQUEST:\n${userPrompt}`);
  const response = await result.response;
  const explanation = response.text().trim();

  if (!explanation) throw new Error("No explanation returned from Gemini");
  return explanation;
}

