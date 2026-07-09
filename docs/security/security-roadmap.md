# Security Roadmap — NOTARIA V3

## P1
- Implement MFA (TOTP) for administrator and notary-level accounts.
- Add step-up authentication for sensitive actions (account reset, exports, deletion).
- Add security event log taxonomy: auth failure, lockout, privilege change, export.
- Add JWT key versioning (`kid`) to support key rotation windows.

## P2
- WebAuthn support for phishing-resistant MFA.
- Immutable audit storage strategy (append-only DB role + tamper-evident hash chain).
- Secure attachment pipeline:
  - malware scan,
  - MIME whitelist,
  - per-tenant encrypted object storage,
  - short-lived signed URLs.
- Secret rotation automation for DB credentials and JWT signing keys.
- Security monitoring and alerting (SIEM-compatible event stream).

## Controls mapped to prompts
- Tenant isolation: strict data boundary tests and tenant-scoped connections.
- Zero trust: explicit check at every request, no implicit internal trust.
- Least privilege: matrix-based policy from one module.
- Audit immutability: roadmap item with DB-level protections.
