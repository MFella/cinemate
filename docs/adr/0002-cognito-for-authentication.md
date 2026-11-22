# 2. Amazon Cognito for authentication

Date: 2026-11-23

## Decision

Users sign in through an Amazon Cognito User Pool that federates Google and Facebook. The login flow is the authorization code flow, handled by the backend:

1. `GET /api/auth/google` (or `facebook`) redirects to the Cognito Hosted UI with `identity_provider` set.
2. Cognito redirects to `GET /api/auth/callback?code=...`. The backend checks the `state`, exchanges the code for tokens (confidential client, client secret), verifies the ID token and finds or creates the user.
3. The ID token is stored in the existing `httpOnly` cookie `access_token`. A guard verifies it on every request with the pool's public keys (`aws-jwt-verify`).

The frontend is unchanged: it still redirects to `/api/auth/<provider>` and reads `/api/auth/user-info`.

## Reasons

- Tokens stay out of JavaScript (httpOnly cookie), the same security level as before.
- Replaces the own Passport strategies and the self-signed JWT by a managed service.
- The ID token validity is set to 24 hours (the previous cookie lifetime), so no refresh logic is needed.

## The user id

The pool is federation-only (no passwords, no self sign-up). The application user id is the identity provider's user id from the `identities` claim of the ID token. For Google this is the same id the application has always used (the Google `sub`), so **existing users and all their data keep working without a database migration**.

Limit: native Cognito users (e-mail and password) would have no such id. Adding them later needs a migration of the `User.id` type.

## Consequences

- Sessions created before the switch are invalid; users sign in again once.
- Needs a Google and a Facebook OAuth client; their secrets are stored in AWS Secrets Manager and read by the stack, never committed.
