# ElectriScribe

Electrical System Troubleshooting, Monitoring, and Documentation platform.

This repository currently implements Phase 1 foundation using Option A (Next.js monorepo):
- Next.js 14 + React 18 + TypeScript
- TailwindCSS + DaisyUI
- Prisma + PostgreSQL
- App Router with basic pages and a health API

Keep Options:
- Option A (current): Next.js monorepo with collocated API and WebSocket.
- Option B (future): Split Vite React frontend + Express/NestJS backend.

## Getting Started

1) Prerequisites
- Node.js >= 18.17 (Node 20 LTS recommended)
- PostgreSQL database

2) Environment
Create `.env` based on `.env.example` and set `DATABASE_URL`.

3) Install, migrate, and seed
```
npm install
npm run prisma:generate
npm run prisma:migrate -- --name init
npm run seed
```

4) Run
```
npm run dev
```
Visit http://localhost:3000 and try `/api/health`.

## Structure
- `src/app` — App Router pages and API routes
- `src/lib` — Shared libraries (e.g., Prisma client)
- `prisma/` — Prisma schema and migrations
- `scripts/` — Seed and utility scripts

## Next Steps
- Add authentication (JWT/NextAuth) with RBAC
- Add WebSocket server for live monitoring
- Implement Troubleshooting KB UI with search/filter
- Implement Monitoring dashboard with charts
- CI, tests (Jest/RTL/Supertest), and deployments

## Notes
- The PRD (Prototype Docs/ELEC.prd.txt) includes an Enhancements section with architecture, schemas, and acceptance criteria.
- If you prefer Option B, we can split the app into `apps/web` and `apps/api` with shared types.

