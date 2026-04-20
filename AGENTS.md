# Agent Instructions

This repository is a Vite + React + TypeScript telehealth app. Keep changes small, prefer existing patterns, and use the project docs instead of restating them.

## Start Here

- Read [README.md](README.md) for setup and scripts.
- Read [docs/RBAC_AND_DATA_VISIBILITY.md](docs/RBAC_AND_DATA_VISIBILITY.md) before changing auth, roles, or visibility rules.
- Read [docs/MVP_IMPLEMENTATION_PLAN.md](docs/MVP_IMPLEMENTATION_PLAN.md) and [docs/MVP_GAPS_ANALYSIS.md](docs/MVP_GAPS_ANALYSIS.md) before adding or scoping features.
- Follow [\.cursor/rules/supabase-mcp.md](.cursor/rules/supabase-mcp.md) for anything involving Supabase.

## Current Conventions

- Supabase is the default data/auth/storage integration for the app.
- Server-side OpenAI usage lives in [api/triage-explain.ts](api/triage-explain.ts) and [src/server/triageExplain.ts](src/server/triageExplain.ts).
- Client-exposed env vars use the `VITE_` prefix; secrets do not.
- Prefer lazy env validation inside called functions when a missing secret should only fail on use.
- Keep UI route protection aligned with the existing `ProtectedRoute` and role-based patterns.

## Azure Work

- If a task involves Microsoft Azure services, use the Azure service skill at [\.github/skills/azure-services/SKILL.md](.github/skills/azure-services/SKILL.md).
- Preserve existing Supabase/OpenAI behavior unless the user explicitly asks to migrate it.
- Keep Azure credentials server-side only; use managed identity or environment-backed secrets instead of browser-exposed values.

## Useful Commands

- `npm run dev`
- `npm run build`
- `npm run test`
- `npm run lint`
