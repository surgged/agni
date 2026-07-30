# Todo Tracker: Simplified Email Verification Auth

- Status: Done
- Slug: `simplified-email-verification-auth`
- Linked engineering doc: `./02-engineering-doc.md`
- Last updated: 2026-07-30

## Task Board

| # | Task | Owner | Write scope | Status | Depends on |
|---|------|-------|-------------|--------|------------|
| 1 | Update User Domain & Schema | main-agent | `internal/domain/user/`, `internal/adapters/persistence/` | done | - |
| 2 | Update Email Port & Resend Client | main-agent | `internal/adapters/email/` | done | 1 |
| 3 | Update Application Commands & Handlers | main-agent | `internal/application/user/` | done | 1 |
| 4 | Update HTTP Auth Handler & Routes | main-agent | `internal/adapters/http/web/auth_handler.go` | done | 3 |
| 5 | Update Frontend API & Auth Context | main-agent | `views/src/api.ts`, `views/src/contexts/auth.tsx` | done | 4 |
| 6 | Create/Update Frontend Pages & Routes | main-agent | `views/src/pages/`, `views/src/App.tsx` | done | 5 |
| 7 | Verification & Testing | main-agent | backend/frontend build & tests | done | 6 |

## Per-Agent Sections

### Agent: main-agent
- [x] Task 1 — Update User Aggregate & Database schema for `is_email_verified` and `verification_token`
- [x] Task 2 — Add `SendVerificationEmail` to `EmailSender` interface and Resend client implementation
- [x] Task 3 — Update `CreateUserCommand`, `AuthenticateUserCommand`, and add `VerifyEmailCommand`, `ResendVerificationCommand`
- [x] Task 4 — Update HTTP endpoints (`/auth/register`, `/auth/login`, `/auth/verify-email`, `/auth/resend-verification`)
- [x] Task 5 — Update frontend `api.ts` and `auth.tsx` context
- [x] Task 6 — Update `Register.tsx` (Name, Email, Pass, Confirm Pass), `Login.tsx` (unverified email banner + resend button), add `VerifyEmail.tsx`
- [x] Task 7 — Run verification tests (`crank test`, check UI & handlers)

## Newly Discovered Work

- None.

## Drift Check

- Last reconciled against version control: 2026-07-30

## Done Log

- 2026-07-30 — Created plans (01-overview.md, 02-engineering-doc.md, 03-todo.md)
- 2026-07-30 — Completed implementation of backend email verification, frontend React pages & context, and passed all tests.

