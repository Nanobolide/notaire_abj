# CI Non-Regression Gates

## Required checks on every PR
1. `npm run build`
2. `npm run test:isolation`
3. `npm run test:authz`
4. `npm run test:security:smoke`

## Gate policy
- Any failed gate blocks merge.
- Isolation and authorization gates are mandatory for release.
- Security smoke validates baseline controls are still active.

## Coverage intent
- Isolation: no cross-tenant read/write exposure.
- Authz: least-privilege policy respected per role/function.
- Security smoke: session/cookie hardening and critical endpoint protections.
