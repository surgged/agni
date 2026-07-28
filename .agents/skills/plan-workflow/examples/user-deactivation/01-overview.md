# Overview Plan: User Deactivation

- Status: Done
- Slug: `user-deactivation`
- Form: Full
- Author (agent/model + date): example / 2026-07-18
- Date: 2026-07-18

## 1. Request & Problem

The user asked for a way to "soft-delete" a user account without losing audit
history. Today deleting a user removes the row, which breaks references in audit
logs and active sessions and makes incident review impossible. We need a
deactivate action that preserves the record, revokes active sessions, and lets
support reactivate the account on request.

## 2. Goals & Non-Goals

- Goals:
  - Soft state transition `active → deactivated` on the user record.
  - Revoke active sessions on deactivation.
  - New endpoints to deactivate and reactivate a user.
  - Auditable trail via the existing event/outbox mechanism.
- Non-goals (explicitly out of scope):
  - GDPR-style hard delete / PII purge (separate feature).
  - Self-service deactivation UI (backend only this round).
  - Email notification to the user.

## 3. Product Features

- User stories:
  - As a support agent, I want to deactivate a misbehaving user so that their
    sessions stop working without losing their history.
  - As a support agent, I want to reactivate a user when the issue is resolved.
- Key features:
  - New `status` field on the user (`active`, `deactivated`).
  - Idempotent deactivate (calling it twice is a no-op).
  - Auth failure for deactivated users on the next authed request.
- UX / behavior notes:
  - Deactivation is synchronous from the API caller's POV; session revocation
    happens asynchronously via an event consumed by the auth service.

## 4. Engineering Overview (surface level)

- Rough approach: add a `status` field to the user entity, two new use cases,
  two thin API handlers, one schema migration.
- Affected areas: domain model for users, use-case layer, persistence layer,
  API/transport layer, auth middleware, schema migrations.
- Major building blocks: `DeactivateUser` and `ReactivateUser` use cases,
  `UserDeactivated` event.
- Dependencies: existing auth middleware, existing event publisher.

## 5. Risks & Unknowns

- Auth middleware hot path — adding a status check on every request may need
  caching.
- Reactivation race: what if support reactivates a user mid-revocation? Proposal:
  reactivation publishes a `UserReactivated` event that supersedes pending
  revocation work.

## 6. Open Questions for the User

- [x] Should deactivation also cancel in-flight background jobs owned by the
      user? — Yes, follow-up (out of scope here).
- [ ] Preferred cache TTL for the auth-status check? Defaulting to 60s.

## 7. Review

- Reviewer comments: "Don't forget to handle the reactivation-race case."
- Resolution / changes made: added the `UserReactivated` supersedes note to Risks.
- Approval: [x] Approved by user (2026-07-18)
