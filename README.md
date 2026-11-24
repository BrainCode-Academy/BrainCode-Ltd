# BCschools — Integrated Learning, Coding, AI & Developer Ecosystem

**Organization:** BrainCode Technology Limited  
**Product Name:** Configurable via `PRODUCT_NAME` environment variable or the Admin Portal (`BrandConfig`).

## Architecture Overview

BCschools unifies structured online courses, browser-based interactive coding, quizzes & assignments, Gemini-powered AI tutoring, developer communities, real-time WebSocket messaging & collaboration rooms, developer portfolios, technical documentation, and server-verified subscriptions under a single account and entitlement model.

- **Frontend:** React 19, TypeScript, Tailwind CSS v4, Motion (`motion/react`), Lucide React (`src/`)
- **Backend API & Realtime Server:** Express, HTTP/WebSockets (`ws`), Node built-in `node:sqlite` (`server.ts`, `server/`)
- **AI Learning Assistant:** Server-side `@google/genai` integration (`server/ai.ts`) with daily usage quotas and configurable guardrails
- **Auth & Security:** Scrypt salted password hashing, HTTP-only session cookies + Bearer tokens, sliding-window rate limiters, HMAC-SHA256 webhook signature verification, and database audit logs (`server/security.ts`)
- **Entitlement & Billing Engine:** Decoupled `subscriptions`, `payments`, `webhook_events`, and `entitlements` tables supporting both subscription billing and scholarship/promotional feature grants (`server/db.ts`, `server/routes.ts`)

## Local Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy environment configuration and supply your secrets:
   ```bash
   cp .env.example .env
   ```
3. Start the full-stack server (Express API + WebSockets + Vite middleware on port `3000`):
   ```bash
   npm run dev
   ```
4. Build for production and start:
   ```bash
   npm run build
   NODE_ENV=production npm start
   ```

## Environment Variables & Integration Configuration

See `.env.example` for the full reference:
- `GEMINI_API_KEY`: Enables the server-side Gemini AI Learning Assistant. When unset, AI endpoints return HTTP `503` without fabricating AI output.
- `AUTH_SECRET`: Signing secret for sessions and tokens.
- `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` / `PAYMENT_WEBHOOK_SECRET`: Enables live gateway mode and HMAC-SHA256 verification on `/api/billing/webhook`. When `STRIPE_SECRET_KEY` is empty, billing runs in explicit **Development Sandbox** mode where payments start as `pending` and require explicit server verification before unlocking entitlements.
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `APPLE_CLIENT_ID`: Controls real OAuth button availability in the authentication flow.
- `CODE_SANDBOX_URL`: Optional isolated remote execution sandbox for server-side languages (Python, Go, Rust, C++). HTML/CSS/JS execution runs client-side inside a sandboxed `<iframe sandbox="allow-scripts">`.

## Testing & Verification

Run typechecks, production build, and automated backend tests:
```bash
npm run lint
npm run build
npm test
```

## Seeded Development Accounts

On an empty database, `server/db.ts` seeds two staff accounts for verification:
- **Admin / Mentor:** `mentor@bcschools.dev` / `BrainCode#2026!`
- **Instructor:** `elena@bcschools.dev` / `BrainCode#2026!`

Change or remove seeded credentials before deploying to production.
