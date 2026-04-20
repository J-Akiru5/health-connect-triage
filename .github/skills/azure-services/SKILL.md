---
name: azure-services
description: "Use when integrating Microsoft Azure services in this repo, including Azure AI, Azure OpenAI, Azure AI Search, Blob Storage, Key Vault, App Configuration, Service Bus, or Managed Identity."
---

# Azure Services Skill

Use this skill for any task that adds, changes, or troubleshoots Azure-backed features.

## Default Approach

- Start by identifying the Azure service, the data flow, and whether the code runs in the browser, on the server, or in an Azure-hosted runtime.
- Prefer the official Azure SDK for the target service. Use raw REST only when there is no SDK fit.
- Keep Azure work additive to the existing Supabase/OpenAI app unless the user asks for a migration.

## Authentication And Secrets

- Never expose Azure API keys, connection strings, or tenant secrets to the browser.
- Prefer managed identity or workload identity in deployed environments.
- Use environment variables for local development and document them in the repo when they change.
- If the feature needs secrets at runtime, assume they belong in server code or Key Vault, not in client code.

## Azure AI And Related Services

- For Azure AI or Azure OpenAI features, keep calls server-side and return only the minimum response needed by the UI.
- For search, document retrieval, or file processing flows, keep indexing, storage, and inference boundaries explicit.
- Add guardrails for rate limits, safety behavior, and retry handling where relevant.

## Implementation Checks

- Validate configuration lazily inside the function that needs it unless the module is intentionally server-only.
- Update any env example or setup documentation when a new Azure setting is introduced.
- Prefer a concrete end-to-end verification step over assumptions when the integration path is new.

## Useful Starting Points

- [README.md](../../../../README.md)
- [api/triage-explain.ts](../../../../api/triage-explain.ts)
- [src/server/triageExplain.ts](../../../../src/server/triageExplain.ts)
- [vite.config.ts](../../../../vite.config.ts)
- [\.env.example](../../../../.env.example)
