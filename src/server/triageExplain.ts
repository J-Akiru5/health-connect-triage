import { createAzureOpenAIClient, extractAssistantText } from "./azureOpenAI";

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

export async function generateTriageExplanation(body: ExplainRequestBody, apiKey: string) {
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

  const system = [
    "You are a clinical triage explanation assistant for a rural barangay health app.",
    "You DO NOT diagnose. You explain the triage output in plain language.",
    "Be cautious, concise, and use non-alarming wording when possible.",
    "Always include a brief safety disclaimer and what to do if symptoms worsen.",
    "Do not mention OpenAI, prompts, or internal policies.",
  ].join(" ");

  const user = [
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

  if (apiKey) {
    process.env.AZURE_OPENAI_API_KEY = apiKey;
  }

  const { client, deploymentName } = createAzureOpenAIClient();
  const result = await client.getChatCompletions(
    deploymentName,
    [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    { temperature: 0.4, maxTokens: 650 }
  );

  const explanation = extractAssistantText(result).trim();
  if (!explanation) throw new Error("No explanation returned");
  return explanation;
}

