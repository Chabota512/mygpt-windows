# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally
- `pnpm --filter @workspace/student-ai run dev` — run the production My_GPT 4 Students web app

## Artifacts

- `artifacts/student-ai` — production React/Vite frontend (graduated from the canvas mockup). Talks to the local Python backend in `python-backend/` on `http://localhost:8000`. See `WINDOWS_BUILD_GUIDE.md` for the full local + native Windows build flow.
- `artifacts/mockup-sandbox` — canvas/design sandbox (kept for reference).
- `artifacts/api-server` — Express API scaffold (unused by student-ai; kept from template).
- `python-backend/` — FastAPI + SQLite backend, the real "brain".

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
