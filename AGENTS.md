# AGENTS.md

Guidance for AI coding agents and other contributors working on ZTNET. Humans should also read [CONTRIBUTING.md](CONTRIBUTING.md) and [STYLE_GUIDE.md](STYLE_GUIDE.md).

ZTNET is a self hosted web UI for ZeroTier controllers and ZeroTier Central. It is used in production by many people, so correctness and access control matter more than speed.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Stack

- Next.js (pages router) with React and TypeScript, Tailwind and daisyUI for styling
- tRPC for the web UI, plain Next API routes for the REST API under `/api/v1`
- Prisma with PostgreSQL
- better-auth for sessions, Socket.IO for live updates
- Biome for linting and formatting, Jest for tests
- Docusaurus for the documentation in `docs/`

## Setup

The easiest setup is the dev container, see `docs/docs/Contribute/info.md`. It starts PostgreSQL and ZeroTier next to the app. Outside the container you need Node 22, a PostgreSQL database and a `.env` file based on `.env.example`.

```bash
npm install        # also runs prisma generate
npm run dev        # development server
```

## Checks to run before opening a pull request

CI runs these on every pull request and all of them must pass:

```bash
npm run lint       # biome check src
npm run format     # biome format src (check only, format:fix writes)
npm run test       # both Jest configs
npm run build      # next build, this is also where type errors fail
```

`npx tsc --noEmit` is a faster way to find type errors than a full build. Test files are type checked too.

Tests are mock based and do not need a running database, but the environment is validated on import. Set at least `DATABASE_URL`, `NEXTAUTH_URL` and `NEXTAUTH_SECRET` (dummy values are fine, see `.github/workflows/pull_request.yml`).

- `jest.api.config.ts` runs `*.test.ts` under `src/server/api/__tests__`, `src/pages/api/__tests__` and `src/utils/__tests__`
- `jest.pages.config.ts` runs `*.test.tsx` under `src/__tests__`

## Where things are

- `src/pages` holds pages and API routes. `src/pages/api/v1` is the public REST API, `src/pages/api/trpc` the tRPC endpoint, `src/pages/api/websocket` the Socket.IO server
- `src/server/api/routers` holds the tRPC routers, `src/server/api/services` the logic shared between tRPC and REST
- `src/server/api/trpc.ts` defines `publicProcedure`, `protectedProcedure` and `adminRoleProtectedRoute`
- `src/utils` holds shared helpers, including the access control helpers listed below
- `src/components` and `src/hooks` hold the UI
- `src/locales/<lang>/common.json` holds the translations
- `prisma/schema.prisma` and `prisma/migrations` hold the database schema
- `docs/docs` holds the user documentation, `docs/docs/Rest Api/*/_source/*.yml` the OpenAPI source for the REST API pages

## Rules

These are requirements, not suggestions. A pull request that breaks one of them will not be merged. If a rule seems to block a legitimate change, say so in the pull request instead of working around it.

### Scope

- MUST keep a pull request to one topic. No unrelated refactoring, renaming, reformatting or dependency changes.
- MUST NOT add, remove or upgrade a dependency unless the change requires it, and then say why in the description.
- MUST NOT change files you were not asked to change in order to make a check pass. That includes CI workflows, `biome.json`, `tsconfig.json` and the Jest configs.
- MUST NOT guess. Read the code you are changing and the code that calls it before editing.

### Access control

- MUST call `checkNetworkAccess` from `src/utils/networkAccess.ts` in every procedure or route that takes a network id, before any read or write.
- MUST use `checkNetworkConfigAccess` for changes to routes, DNS, IP assignment and flow rules.
- MUST call `checkUserOrganizationRole` from `src/utils/role.ts` in organization scoped code, with the lowest role that should be allowed.
- MUST wrap REST routes in `SecuredPrivateApiRoute` or `SecuredOrganizationApiRoute` from `src/utils/apiRouteAuth.ts`.
- MUST use `adminRoleProtectedRoute` for anything only the instance admin may do. A check in the UI is not access control.
- MUST NOT treat an id from the client as proof of ownership. `network_members.nodeid`, invitation ids and similar keys are global. Tie them to the network or organization the caller was checked against, in the same query.
- MUST check access before logging or writing. A rejected request leaves no trace in the database or the activity log.

### Data that must not leave the server

- MUST NOT return a full `User` row from any procedure or route. Select the fields you need, or use `ORG_MEMBER_FIELDS` and `USER_SECRET_FIELDS` from `src/server/api/userFields.ts`.
- MUST send member rows through `serializeMemberRow` in `src/server/api/services/memberService.ts` before they reach a client.
- MUST NOT put secrets, tokens or password hashes in responses, error messages or logs.
- MUST NOT commit secrets or `.env` files.

### Outbound requests, limits and live updates

- MUST pass every URL a user can type in (webhooks, the ZeroTier Central URL) through `src/utils/ssrfGuard.ts` before the server requests it.
- MUST rate limit public endpoints with `src/utils/rateLimit.ts`. The call is `limiter.check(req, res, limit, token)` and counts per client.
- MUST emit Socket.IO events to rooms, never to every socket. See `src/utils/socketChannels.ts` and `src/server/sync`.

### Database

- MUST add a migration in `prisma/migrations`, named `<timestamp>_<description>`, for every schema change.
- MUST keep migrations additive and safe on existing data. New columns need a default or must be nullable.
- MUST NOT edit or delete a migration that is already on `main`.
- MUST NOT drop or rewrite a column in the same release that stops using it. A downgrade has to keep working.

### Tests

- MUST add or update tests for every behaviour change.
- MUST include a test for the rejected case when the change is about access.
- MUST NOT delete, skip or weaken a test to make it pass. If a test is wrong, fix it and explain why in the description.
- MUST NOT add `any`, `@ts-ignore`, `@ts-expect-error` or `biome-ignore` to get a change past the type checker or linter. Existing ones are not a licence to add more.

### Translations and docs

- MUST add new UI text to `src/locales/en/common.json` and to every other language folder with the same keys.
- MUST NOT hard code user facing text in components.
- MUST update the OpenAPI source under `docs/docs/Rest Api` when a REST route changes, so the documented schema matches the response.
- MUST document new environment variables in `docs/docs/Installation/options.md` and `.env.example`.

### Before opening a pull request

- MUST run lint, format, tests and build locally, and all four MUST pass.
- MUST branch from `main` and open the pull request against `main`.
- MUST write a short description: what changed and why. No generated summaries of the diff.
- MUST NOT report a security problem in a public issue or pull request. Use a private report under the repository's Security tab.

## Style

- Follow the patterns of the surrounding code. Biome decides formatting: tabs, 90 character lines.
- Import from `src` with the `~/` alias.
- Prefer one shared helper over copies of the same check or serializer.
- Comments explain why, not what.
