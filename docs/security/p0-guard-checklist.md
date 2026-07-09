# P0 Guard Checklist (Tenant/Authz/Audit)

## Unified guard requirements for every API endpoint
- Resolve authenticated session (`uid`, `etudeId`, `niveauAcces`).
- Enforce tenant scope before any read/write.
- Evaluate authorization policy from `src/lib/acces.js`.
- Validate input and apply least-privilege field filtering.
- Write audit entry for sensitive create/update/delete/export actions.
- Return normalized error format and status codes.

## Mandatory endpoint checks
- `401` when not authenticated.
- `403` when authorized role/function is missing.
- No query without tenant predicate or tenant-bound transaction.
- No financial fields returned to unauthorized profiles.

## Runtime hardening
- Secure session cookie in production (`secure: true`, `httpOnly`, `sameSite=lax`).
- Brute-force throttling on login/recovery.
- Correlation id in server logs for security events.

## Definition of Done (P0)
- Access matrix module present and used by business APIs.
- Isolation tests passing.
- Authorization matrix tests passing.
- No direct cross-tenant SQL path remaining in API code.
