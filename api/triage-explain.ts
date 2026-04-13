import type { VercelRequest, VercelResponse } from "@vercel/node";

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

function json(res: VercelResponse, status: number, body: unknown) {
  res.status(status).setHeader("Content-Type", "application/json").send(JSON.stringify(body));
}

function getStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return json(res, 405, { error: "Method not allowed" });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return json(res, 500, { error: "Server not configured: OPENAI_API_KEY missing" });
  }

  const body = (req.body ?? {}) as ExplainRequestBody;
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

  try {
    const resp = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        temperature: 0.4,
      }),
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      return json(res, resp.status, { error: "OpenAI request failed", detail: text.slice(0, 1500) });
    }

    const data = (await resp.json()) as {
      output_text?: string;
    };

    const explanation = typeof data.output_text === "string" ? data.output_text.trim() : "";
    if (!explanation) return json(res, 502, { error: "No explanation returned" });

    return json(res, 200, { explanation });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return json(res, 500, { error: "Server error", detail: msg });
  }
}

