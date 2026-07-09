# DDD Blueprint — NOTARIA V3

## Target module layout
Each bounded context lives under `src/modules/<context>/` with:
- `domain`: entities, value objects, policies
- `application`: use-cases, commands/queries
- `infrastructure`: DB/files/external adapters
- `interfaces`: API/controller mapping

## Bounded contexts
- `tenant-management`
- `identity-access`
- `clients`
- `dossiers`
- `actes`
- `documents-archives`
- `agenda`
- `paiements-facturation-tenant`
- `reporting-audit`
- `saas-administration`

## Migration order (strangler pattern)
1. `identity-access` (authn/authz guard, policy centralization)
2. `actes` and `appels` (highest traffic business modules)
3. `comptes` and `parametres` (administration and policy-sensitive)
4. `dashboard` and `exports` (aggregations/read models)
5. platform contexts (`saas-administration`, subscriptions, billing)

## Anti-corruption layer
Until migration completes:
- Existing App Router endpoints remain public contracts.
- Route handlers delegate progressively to application use-cases.
- Shared helpers in `src/lib/*` are wrapped by module infrastructure adapters.

## Contract rules
- No cross-module direct table access.
- Cross-module communication via application services/events only.
- Authorization and tenant context checked before domain execution.
