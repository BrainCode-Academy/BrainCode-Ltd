# BCschools Build & Implementation Status

**Last Updated:** 2026-11-17  
**Organization:** BrainCode Technology Limited

## Completed Modules

| Module | Status | Notes |
|---|---|---|
| Configurable Branding & Metadata | Complete | Runtime `brand_config` table + `/api/config/public` + Admin editor |
| Public Landing Website | Complete | Coding-first 15-section homepage, database-driven Technology Nav Bar (33+ technologies), interactive Try-It-Yourself hero lab, live `/api/search`, dynamic pricing, verified certificate check, persisted contact form, FAQ, Terms/Privacy modals |
| Authentication & Profile Security | Complete | Glassmorphism login/signup/reset/verify UI, scrypt hashing, sessions, rate limiting, light/dark theme persistence |
| Onboarding & Personalized Dashboard | Complete | Multi-step onboarding, dynamic recommendations, XP/badges/streaks, real SQLite data |
| Learning Management Engine | Complete | 19 Categories -> 33+ Technologies -> 12 Learning Paths -> 10+ Courses -> Modules -> Lessons, Technology Pages (`/technologies/:slug`), free/premium gating, bookmarks, Copy Code, local study notes, completion |
| Coding Workspace | Complete | Multi-file workspace CRUD, duplicate/rename, sandboxed HTML/CSS/JS iframe preview, captured console logs |
| Assessments, Certificates & Gamification | Complete | Timed/untimed quizzes, auto-grading, practical submissions, instructor grading queue, XP & badges, completion-gated verifiable course certificates (`/api/certificates/claim` & `/verify/:code`) |
| AI Learning Assistant | Complete | Context-aware server-side `@google/genai` endpoint, usage tracking, daily quotas, prompt guardrails |
| Communities & Social Network | Complete | User discovery, connections, blocking, public/private/approval guilds, posts, comments, reactions, reporting |
| Private Messaging & Notifications | Complete | Real-time WebSocket delivery, 1-to-1 DM threads, unread counters, alert preferences |
| Collaborative Coding Workspace | Complete | Premium-gated sessions, invite codes, participant roles, live sync over WebSockets, session chat, save-to-project |
| Projects & Developer Portfolio | Complete | Public/private project showcase, external links, contributor attribution, public profile views |
| Technical Resources Library | Complete | Searchable documentation, technology quick references, guides, snippets, and CMS publishing |
| Subscriptions, Webhooks & Entitlements | Complete | Pending->verified checkout, HMAC webhook verification, idempotency (`webhook_events`), decoupled `entitlements` grants, refunds |
| Instructor, Finance & Admin Portal | Complete | Tabbed workspace covering KPIs, brand config, AI limits, category/tech bar ordering/learning paths/courses/modules/lessons CMS + preview & versioning, validated JSON/CSV bulk export/import, grading queue, plan pricing, refunds, scholarship entitlements, moderation, and audit logs |

## Integrations Requiring External Credentials

- **Stripe / Live Payment Gateway**: Operates in explicit **Development Sandbox** mode until `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` are supplied and gateway checkout session redirect adapters are connected.
- **Google & Apple OAuth**: Social login buttons inspect `/api/config/public` and report unavailability clearly until `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `APPLE_CLIENT_ID` are set.
- **Email / SMTP Delivery**: Registration verification tokens and password reset tokens are surfaced in explicit development-notice UI until an SMTP/transactional email provider is configured.
- **Remote Code Sandbox (`CODE_SANDBOX_URL`)**: Browser HTML/CSS/JS runs in a sandboxed iframe; Python/Go/Rust/C++ execution clearly requires an external isolated container runner.
- **Voice / Video / Screen Share Media Server**: Collaboration rooms support real-time code sync and chat via WebSockets; WebRTC SFU/media tokens require configuring a media provider.

## Runtime & Stack Note

- Built with React 19 + Vite + Express + WebSockets + `node:sqlite` (`tsx server.ts`) to align cleanly with the active single-port Node/Vite runtime environment while separating frontend, API routes, security, AI, realtime, and database layers cleanly.

## Tests Performed

- `npm run lint` (`tsc --noEmit`)
- `npm run build` (`vite build`)
- `npm test` (`tests/backend.test.ts`: 7 integration tests covering registration, free-tier gating, HMAC webhooks & refunds, standalone scholarship entitlements, 19 categories / 33+ technologies / 12 paths / `/technologies/:slug` / non-leaking `/search`, course completion certificate gating & verification, and admin tech CRUD + validated JSON/CSV import/export)
