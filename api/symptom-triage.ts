import type { VercelRequest, VercelResponse } from "@vercel/node";
import { generateSymptomTriageAssessment } from "../src/server/symptomTriage.js";
import type { SymptomTriageRequestBody } from "../src/server/symptomTriage.js";

function json(res: VercelResponse, status: number, body: unknown) {
  res.status(status).setHeader("Content-Type", "application/json").send(JSON.stringify(body));
}

function getErrorStatus(error: unknown): number {
  const e = error as {
    status?: unknown;
    statusCode?: unknown;
    response?: { status?: unknown };
  };
  const candidate = e?.statusCode ?? e?.status ?? e?.response?.status;
  const parsed = typeof candidate === "number" ? candidate : Number(candidate);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 500;
}

function getErrorDetail(error: unknown): string {
  const e = error as {
    detail?: unknown;
    message?: unknown;
    response?: { data?: unknown; bodyAsText?: unknown };
  };
  if (typeof e?.detail === "string" && e.detail.trim()) return e.detail;
  if (typeof e?.message === "string" && e.message.trim()) return e.message;
  if (typeof e?.response?.bodyAsText === "string" && e.response.bodyAsText.trim()) return e.response.bodyAsText;
  return "Unknown server error";
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return json(res, 405, { error: "Method not allowed" });
  }

  if (
    !process.env.AZURE_OPENAI_ENDPOINT ||
    !process.env.AZURE_OPENAI_API_KEY ||
    !process.env.AZURE_OPENAI_DEPLOYMENT_NAME
  ) {
    return json(res, 500, {
      error: "Server not configured: Azure OpenAI environment variables missing",
    });
  }

  const body = (req.body ?? {}) as SymptomTriageRequestBody;

  if (!Array.isArray(body.symptoms) || body.symptoms.length === 0) {
    return json(res, 400, { error: "At least one symptom is required" });
  }

  try {
    const result = await generateSymptomTriageAssessment(body);
    return json(res, 200, result);
  } catch (e) {
    const status = getErrorStatus(e);
    const detail = getErrorDetail(e);
    console.error("[api/symptom-triage]", { status, detail });
    return json(res, status, {
      error: status >= 500 ? "Server error" : "Request failed",
      detail,
    });
  }
}
