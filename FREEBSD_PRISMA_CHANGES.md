# FreeBSD Prisma Driver Adapter Changes

## Problem
Prisma does not provide precompiled native query engines for FreeBSD. After upgrading to Prisma 6.19 and Next.js 16.0.7, the application fails with:
```
Error: Prisma Client could not locate the Query Engine for runtime "freebsd14"
```

## Solution
Use Prisma's Rust-free driver adapter mode (`engineType = "client"`) which uses TypeScript/WASM instead of native binaries.

---

## Files Changed

### 1. `prisma/schema.prisma`
**Change:** Update generator to use client engine type (no native binaries)

```prisma
generator client {
  provider   = "prisma-client-js"
  engineType = "client"
}
```

**Remove:** `binaryTargets` array (not needed with driver adapters)

---

### 2. `src/server/db.ts`
**Change:** Add driver adapter for PostgreSQL

```typescript
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

import { env } from "~/env.mjs";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });

export const prisma =
	globalForPrisma.prisma ||
	new PrismaClient({
		adapter,
		log:
			env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
	});

if (env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

---

### 3. `src/server/api/services/organizationAuthService.ts`
**Change:** Import prisma from central db.ts instead of creating new instance

**Before:**
```typescript
import { Invitation, PrismaClient } from "@prisma/client";
// ...
const prisma = new PrismaClient();
```

**After:**
```typescript
import type { Invitation } from "@prisma/client";
// ...
import { prisma } from "~/server/db";
```

---

### 4. `prisma/seed.ts`
**Change:** Add driver adapter

```typescript
import { updateUserId } from "./seeds/update-user-id";
import { seedUserOptions } from "./seeds/user-option.seed";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
	await seedUserOptions();
	await updateUserId();
}

main()
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
```

---

### 5. `prisma/seeds/user-option.seed.ts`
**Change:** Add driver adapter

```typescript
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

export async function seedUserOptions() {
	// ... rest of function unchanged
}
```

---

### 6. `prisma/seeds/update-user-id.ts`
**Change:** Add driver adapter

```typescript
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { createId } from "@paralleldrive/cuid2";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

export async function updateUserId() {
	// ... rest of function unchanged
}
```

---

## New Dependencies

Add to `package.json`:
```json
{
  "dependencies": {
    "@prisma/adapter-pg": "^6.19.0",
    "pg": "^8.11.0"
  },
  "devDependencies": {
    "@types/pg": "^8.10.0"
  }
}
```

Install with:
```bash
npm install @prisma/adapter-pg pg
npm install --save-dev @types/pg
```

---

## Build Process Changes

After `npm run build`, copy WASM files to standalone:
```bash
cp node_modules/.prisma/client/*.wasm .next/standalone/node_modules/.prisma/client/
```

---

## Benefits
- No native binary dependencies (works on FreeBSD, Alpine, etc.)
- 90% smaller bundle size (~14MB to ~1.6MB)
- Up to 3.4x faster queries
- Better edge runtime support
