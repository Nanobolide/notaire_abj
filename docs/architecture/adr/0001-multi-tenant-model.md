# ADR-0001 — Multi-tenant model for NOTARIA V3

## Status
Accepted

## Context
NOTARIA targets notarial offices handling highly confidential data. The platform must guarantee strict tenant isolation, strong security posture, and operational scalability for a SaaS B2B model.

## Decision
Use **Separate Database per tenant** in production, plus a dedicated **platform database** for super-admin, plans, subscriptions, billing, support, and global metrics.

## Why this model
- **Security**: strongest blast-radius containment; data breach in one tenant does not expose others.
- **Compliance**: easier to prove separation and audit controls for regulated activity.
- **Performance**: tenant workload isolation prevents noisy-neighbor contention.
- **Scalability**: horizontal growth by provisioning tenant databases independently.
- **Operations**: controlled maintenance windows and backup/restore per tenant.

## Trade-offs
- Higher infrastructure and orchestration cost compared to shared-schema.
- More complex provisioning, migrations, and observability.
- Requires robust tenant routing and lifecycle automation.

## Consequences
- Introduce a `TenantResolver` + `ConnectionManager` abstraction.
- Maintain migration versioning per tenant database.
- Keep local development compatible with SQLite while preserving authorization/isolation behavior.
- Enforce security gates in CI (isolation tests, authorization matrix, security smoke tests).

## Rejected alternatives
- **Shared DB / Shared Schema**: low cost but highest leakage risk.
- **Shared DB / Separate Schema**: improved isolation but still single-instance coupling and larger shared blast radius.
