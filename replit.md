# CampusCare

CampusCare helps students and staff report campus problems and lets administrators manage transparent resolution workflows.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/campus-care` — React + Vite web app with public landing, student reporting/tracking, admin operations, and analytics routes.
- `artifacts/api-server` — Express API implementing the CampusCare issue, notification, timeline, analytics, and metadata endpoints.
- `lib/api-spec/openapi.yaml` — source of truth for the API contract and generated client hooks.
- `lib/db/src/schema/` — Drizzle/PostgreSQL schema for users, issues, status history, and notifications.
- `artifacts/campus-care/src/index.css` — CampusCare visual theme and shared UI styles.

## Architecture decisions

- API contracts are defined in OpenAPI first and consumed through generated React Query hooks.
- The first-run database seed creates a small, realistic demo dataset so the dashboards are useful immediately.
- Issue categorization, priority, and duplicate detection use deterministic heuristics so the hackathon demo works without an external AI key.
- The UI uses a demo role switcher for student/admin flows; the backend models the reported-by identity and admin actions without adding a local auth system.

## Product

CampusCare provides a polished landing page, student dashboard, issue submission with AI-style analysis and duplicate warnings, issue detail timelines, notifications, admin issue management, and analytics based on live database data.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Run `pnpm --filter @workspace/api-spec run codegen` after changing `lib/api-spec/openapi.yaml`.
- The generated API client uses `Headers.entries()`, so composite client builds require `dom.iterable` in the TypeScript `lib` list.
- API and web services are managed through the artifact workflows; do not start them with root-level dev commands.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
