# ARG DATABASE_URL
# ARG POSTGRES_HOST
# ARG POSTGRES_PORT
# ARG POSTGRES_USER
# ARG POSTGRES_PASSWORD
# ARG POSTGRES_DB
# ARG NEXTAUTH_URL
# ARG NEXTAUTH_SECRET

FROM node:18-bullseye-slim AS base

# Install dependencies only when needed
FROM base AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
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
ENV NEXT_PUBLIC_APP_VERSION=$NEXT_PUBLIC_APP_VERSION

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next.js collects completely anonymous telemetry data about general usage.
# Learn more here: https://nextjs.org/telemetry
# Uncomment the following line in case you want to disable telemetry during the build.
# ENV NEXT_TELEMETRY_DISABLED 1

# env hack to get app name during runtime (https://dev.to/itsrennyman/manage-nextpublic-environment-variables-at-runtime-with-docker-53dl)
RUN NEXT_PUBLIC_SITE_NAME=APP_NEXT_PUBLIC_SITE_NAME \ 
    SKIP_ENV_VALIDATION=1 \
    npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
# Uncomment the following line in case you want to disable telemetry during runtime.
ENV NEXT_TELEMETRY_DISABLED 1

# Create a nodejs group and user for running the application
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Install necessary packages
RUN apt update && apt install -y curl sudo postgresql-client && apt clean && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*
# RUN curl -s https://install.zerotier.com | sudo bash

# Install prisma client and global package
RUN npm install @prisma/client
RUN npm install -g prisma

# Create a directory for zerotier-one and set permissions
RUN mkdir -p /var/lib/zerotier-one && chown -R nextjs:nodejs /var/lib/zerotier-one && chmod -R 777 /var/lib/zerotier-one

# Copy all the necessary files from the builder stage
COPY --from=builder /app/next.config.mjs ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/init-db.sh ./init-db.sh

# Create an empty .env file and set permissions
RUN touch .env && chown nextjs:nodejs .env

RUN chmod u+x init-db.sh

# USER nextjs

EXPOSE 3000

ENV PORT 3000
ENTRYPOINT ["/app/init-db.sh"]
CMD ["node", "server.js"]