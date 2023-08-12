FROM node:18-bullseye-slim AS base

# Install dependencies only when needed
FROM base AS deps

# RUN apt update && apt install libc6-compat
WORKDIR /app

# Install Prisma Client - remove if not using Prisma
RUN npx prisma generate
COPY prisma ./

# Install dependencies based on the preferred package manager
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./
RUN \
    if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
    elif [ -f package-lock.json ]; then npm ci; \
    elif [ -f pnpm-lock.yaml ]; then yarn global add pnpm && pnpm i --frozen-lockfile; \
    else echo "Lockfile not found." && exit 1; \
    fi


# Rebuild the source code only when needed
FROM base AS builder

ARG NEXT_PUBLIC_APP_VERSION

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN SKIP_ENV_VALIDATION=1 npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

# set the app version as an environment variable. Used in the github action
# used in the init-db.sh script
ARG NEXT_PUBLIC_APP_VERSION
ENV NEXT_PUBLIC_APP_VERSION ${NEXT_PUBLIC_APP_VERSION}

ENV NODE_ENV production

# Disable telemetry during runtime.
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
RUN apt update && apt install -y curl sudo postgresql-client && apt clean && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*
RUN npm install @prisma/client
RUN npm install -g prisma ts-node
RUN mkdir -p /var/lib/zerotier-one && chown -R nextjs:nodejs /var/lib/zerotier-one && chmod -R 777 /var/lib/zerotier-one

COPY --from=builder /app/next.config.mjs ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/init-db.sh ./init-db.sh

# prepeare .env file for the init-db.sh script
RUN touch .env && chown nextjs:nodejs .env

RUN chmod u+x init-db.sh

# USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME localhost

ENTRYPOINT ["/app/init-db.sh"]
CMD ["node", "server.js"]