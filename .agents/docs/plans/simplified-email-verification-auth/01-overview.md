# Overview Plan: Simplified Email Verification Auth

- Status: Done
- Slug: `simplified-email-verification-auth`
- Form: Full
- Author: Gemini 3.6 Flash / 2026-07-30
- Date: 2026-07-30

## 1. Request & Problem

The user requested a simplified login and sign up flow with the following requirements:
1. Signup requires: Name, Email, Password, and Password Match (Confirm Password).
2. Upon signup, send an email to verify the email address.
3. Once the email is verified, allow users to access the application UI.
4. Upon login, if the email is not verified, prompt the user for email verification; if verified, allow them into the application UI.
5. Use JWT to validate users for all other APIs.

## 2. Goals & Non-Goals

- **Goals**:
  - Implement signup with Name, Email, Password, and Password Match validation.
  - Implement email verification token generation, storage, and email dispatching upon signup.
  - Add API endpoints for `/auth/verify-email` and `/auth/resend-verification`.
  - Update login logic to check `is_email_verified`. Block unverified users with a clear "Email verification required" error and offer a resend button.
  - Ensure JWT authorization middleware protects all private backend APIs.
  - Update React frontend pages (`Register.tsx`, `Login.tsx`, `VerifyEmail.tsx`, `auth.tsx` context) for smooth UX.
- **Non-goals**:
  - Multi-factor authentication (MFA/2FA) or external OAuth providers (Google/GitHub).

## 3. Product Features

- **Registration Form**: User inputs Name, Email, Password, Confirm Password. Client and server validate password match. On success, user is shown an "Check your email" screen.
- **Verification Email & Link**: Email sent via `EmailSender` containing a tokenized verification link (e.g. `/auth/verify-email?token=...`).
- **Email Verification Screen**: When clicking the link, user arrives at verification page. Backend verifies token, marks `is_email_verified = true`, issues JWT token, and redirects to Dashboard.
- **Login Form & Unverified Gate**: User logs in with Email + Password. If email is unverified, user is prompted to check their inbox or click "Resend Verification Email". If verified, JWT access token is stored and user enters `/dashboard`.

## 4. Engineering Overview (surface level)

- **Backend Layers (`internal/`)**:
  - Domain (`internal/domain/user/`): Extend `User` aggregate with `IsEmailVerified` (bool) and `VerificationToken` (string).
  - Persistence (`internal/adapters/persistence/`): Update GORM model schema and migration to store verification fields.
  - Email Adapter (`internal/adapters/email/`): Add `SendVerificationEmail(ctx, email, token)` method and HTML template.
  - Application Service (`internal/application/user/`): Update `HandleCreate` and add `HandleVerifyEmail`, `HandleResendVerification`, update `HandleAuthenticate`.
  - HTTP Handlers (`internal/adapters/http/web/auth_handler.go`): Expose updated endpoints (`/auth/register`, `/auth/login`, `/auth/verify-email`, `/auth/resend-verification`) and maintain JWT middleware (`JWTAuth`).
- **Frontend Layers (`views/src/`)**:
  - `views/src/contexts/auth.tsx`: Update state and methods for register, login (handling unverified status), email verification.
  - `views/src/pages/Register.tsx`: Update form fields for Name, Email, Password, Confirm Password.
  - `views/src/pages/Login.tsx`: Update UI with error callouts for unverified email & Resend Email action.
  - `views/src/pages/VerifyEmail.tsx`: New route `/verify-email` to handle token verification from email links.

## 5. Risks & Unknowns

- Email sending setup in development environment: if Resend API key is not configured, fallback to logging verification link in server logs so testing locally remains seamless.

## 6. Open Questions for the User

- [ ] Does auto-logging the user into the UI immediately after clicking the email verification link sound good, or should they be redirected to the login page with a success message?

## 7. Review

- Reviewer comments: Pending user review.
- Resolution / changes made: Initial draft.
- Approval: [ ] Approved by user
