# JUSS CMS

An open-source, self-hosted creative command center. Phase 1 implements authentication, organizations, brand profiles, and a workspace dashboard. The universal social connection foundation adds organization-scoped account setup, typed connector contracts and a clearly labeled state preview. Real provider authorization and content modules remain future work.

## First run

Requires Node.js 24 LTS, npm, and Docker Desktop/Compose.

```sh
cd /Users/juss/juss-cms # or your cloned repository
cp .env.example .env
```

Edit `.env`: choose a unique local database password and put the same value in `POSTGRES_PASSWORD` and `DATABASE_URL` (URL-encode special characters). Generate `BETTER_AUTH_SECRET` with `openssl rand -base64 48`. Set `BETTER_AUTH_URL=http://localhost:3000`.

```sh
npm ci
docker compose up -d db
npm run db:migrate
npm run dev
```

Open http://localhost:3000. Register an account, create an organization, then add a brand. `/setup` has an in-app onboarding guide. No demo credentials or automatic seed data are installed.

## Commands

- `npm run dev` — local development server
- `npm run lint`, `npm run typecheck`, `npm test` — static checks and policy/validation tests
- `npm run test:social` — PostgreSQL tests for the connection foundation using isolated test adapters; no provider network calls
- `npm run test:migrations` — replays migrations twice against a temporary database; requires local database-creation privileges and removes the temporary database afterward
- `npm run test:integration` — requires a migrated, disposable development database and a running app at `BETTER_AUTH_URL`; creates unique test accounts/workspaces and removes them afterward
- `npm run build && npm start` — production build and local production preview
- `npm run db:dev -- --name change_name` — create a new development migration
- `npm run db:migrate` — apply committed migrations without changing schema history
- `docker compose stop` — stop infrastructure, retaining database volume

## Architecture

Next.js App Router and TypeScript. Server components load tenant-scoped data; server actions validate input with Zod and call the authorization/service layer. Client components handle interactive forms and navigation. Tailwind CSS 4 and shared CSS provide the dark responsive design; Lucide provides icons.

- `src/app/(workspace)` — authenticated pages, shared navigation, dashboard, organization/brand management, account settings
- `src/app/api/auth` — Better Auth endpoints
- `src/lib/auth*` — maintained authentication library, database sessions, scrypt password hashing, origin checks and rate limits
- `src/lib/services.ts` — workspace permissions, atomic brand mutations and activity logging
- `src/lib/permissions.ts`, `validation.ts` — explicit role policy and server-side schemas
- `prisma/schema.prisma`, `prisma/migrations` — PostgreSQL schema and versioned migration history
- `tests` — role/input unit tests and real HTTP/PostgreSQL integration checks

Prisma CLI, Client, and the PostgreSQL adapter use 7.10.1. The connection URL lives in `prisma.config.ts`; the runtime uses `@prisma/adapter-pg`. Dependencies are locked in `package-lock.json`. A scoped minimatch override patches a development-tool advisory in the TypeScript ESLint dependency tree; lint validation covers compatibility. Tests use Node’s built-in runner through tsx.

## Data and permissions

A user can belong to many organizations; each organization owns brands and activity records. Membership is unique per user/organization. Owners can rename/delete organizations and manage members. Admins can manage brands and non-admin members. Editors can create/edit/delete brands. Viewers can read. The owner role cannot be assigned, demoted, or removed through member forms. Existing registered users are added by email; invitations and ownership transfer are not implemented.

Workspace/brand cookies store selection only and never grant access. Each server read filters by authenticated membership; mutations recheck permissions and use both brand ID and organization ID. Activity writes occur in the same transaction as mutations. Foreign keys, uniqueness constraints, indexes, and cascades enforce relationships.

Dashboard brand totals and recent activity come from PostgreSQL. Draft, scheduled, and published metrics are unavailable (`—`) because those data models do not exist in Phase 1. No analytics are fabricated. Brand logos use generated initials; file uploads are intentionally outside this phase.

## Production configuration

Use a managed or secured PostgreSQL deployment with backups and encrypted transport. The included Compose file is development infrastructure, bound to loopback, and requires explicit credentials. Set a unique random `BETTER_AUTH_SECRET` and the exact HTTPS origin in `BETTER_AUTH_URL`. Never commit `.env`. Environment variables are validated before authentication starts. Put the app behind HTTPS; production session cookies use secure attributes. Apply migrations as a release step, then build and start. For container hosting, set the Next.js host binding as appropriate (the provided scripts bind to loopback).

Better Auth handles credentials, sessions, CSRF/origin protection, and a 12-character minimum password policy. Its rate limiter currently uses process memory; use shared storage or an edge limiter before scaling to multiple processes. Email verification, email delivery, password recovery, MFA, and account deletion are not configured in Phase 1. Public registration is enabled; restrict access at the reverse proxy for private installations. Existing sessions can be revoked by password change; sign-out revokes the current session.

## Scope

Fully implemented: authentication, profile/password settings, workspaces and role management, brand CRUD, selection, dashboard, navigation, loading/error states, and first-run guidance. Content Studio, Media Library, Content Calendar, Publishing, Engagement Inbox, Audience Intelligence, AI Script Studio, and Analytics are coming-soon routes. No social network connections or publishing jobs exist.

## Universal social connection foundation

Open **Settings → Connected Accounts** or choose **Add Account** from a tool. The wizard preserves the original workflow, explains access, and lets users skip connections. All seven providers are unconfigured and cannot authorize in this release. The state preview is browser-only simulation; it never creates accounts or unlocks tools.

Only Owners and Admins can manage connections. Server-side policies separate provider support, developer-app approval and account-granted permissions. Social credentials use a separate encrypted store and are excluded from UI projections. The additive migration preserves Phase 1 records and migration history.

See [the connection architecture and security guide](docs/social-connections.md) for functional versus simulated behavior, the state machine, OAuth scaffold, operator requirements, limitations and tests. No provider keys or social passwords are requested from ordinary users.

## License

Apache License 2.0. See LICENSE.
