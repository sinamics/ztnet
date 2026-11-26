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

## Rules that are easy to get wrong

Access control

- Every procedure or route that takes a network id must call `checkNetworkAccess` from `src/utils/networkAccess.ts` before reading or writing. Changes to routes, DNS, IP assignment or flow rules use `checkNetworkConfigAccess` instead.
- Organization scoped code calls `checkUserOrganizationRole` from `src/utils/role.ts` with the lowest role that should be allowed.
- REST routes are wrapped in `SecuredPrivateApiRoute` or `SecuredOrganizationApiRoute` from `src/utils/apiRouteAuth.ts`.
- Ids from the client are not proof of ownership. `network_members.nodeid`, invitation ids and similar keys are global, so tie them to the network or organization the caller was checked against in the same query.
- Check access first, then log and write. A rejected request must leave no trace in the database or activity log.

Data that must not leave the server

- Never return a full `User` row. Select the fields you need, or use `ORG_MEMBER_FIELDS` and `USER_SECRET_FIELDS` from `src/server/api/userFields.ts`.
- Member rows sent to the client go through `serializeMemberRow` in `src/server/api/services/memberService.ts`.

Outbound requests and limits

- A URL that a user can type in (webhooks, the ZeroTier Central URL) must go through `src/utils/ssrfGuard.ts` before the server requests it.
- Public endpoints are rate limited with `src/utils/rateLimit.ts`. The call is `limiter.check(req, res, limit, token)` and counts per client.

Live updates

- Emit Socket.IO events to rooms, never to every socket. See `src/utils/socketChannels.ts` and `src/server/sync`.

Database

- Schema changes need a migration in `prisma/migrations`, named `<timestamp>_<description>`. Migrations must be additive and safe on existing data: new columns need a default or must be nullable. Never edit a migration that has been released.

Translations

- New UI text goes in `src/locales/en/common.json` and in every other language folder with the same keys. Do not leave keys missing in some languages.

REST API

- When a REST route changes, update its OpenAPI source under `docs/docs/Rest Api` so the documented schema matches the response.

## Style

- Follow the patterns of the surrounding code. Biome decides formatting: tabs, 90 character lines.
- Import from `src` with the `~/` alias.
- Prefer one shared helper over copies of the same check or serializer.
- Comments explain why, not what.
- Add or update tests for every behaviour change, including a test for the rejected case when the change is about access.

## Pull requests

- Branch from `main` and open the pull request against `main`.
- One topic per pull request. Keep the description short: what changed and why.
- Do not report security problems in a public issue or pull request. Use a private report under the repository's Security tab.
