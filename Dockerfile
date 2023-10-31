ARG NODEJS_IMAGE=node:18-bullseye-slim
FROM --platform=$BUILDPLATFORM $NODEJS_IMAGE AS base

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

# Copy the ztmkworld binary based on the target platform architecture
FROM base AS ztmkworld_builder
ARG TARGETPLATFORM
WORKDIR /app
COPY ztnodeid/build/linux_amd64/ztmkworld ztmkworld_amd64
COPY ztnodeid/build/linux_arm64/ztmkworld ztmkworld_arm64
RUN \
    case "${TARGETPLATFORM}" in \
    "linux/amd64") cp ztmkworld_amd64 /usr/local/bin/ztmkworld ;; \
    "linux/arm64") cp ztmkworld_arm64 /usr/local/bin/ztmkworld ;; \
    *) echo "Unsupported architecture" && exit 1 ;; \
    esac && \
    chmod +x /usr/local/bin/ztmkworld

# Production image, copy all the files and run next
FROM $NODEJS_IMAGE AS runner
WORKDIR /app

# set the app version as an environment variable. Used in the github action
# used in the init-db.sh script
ARG NEXTAUTH_URL
ARG NEXTAUTH_SECRET

ARG NEXT_PUBLIC_APP_VERSION
ENV NEXT_PUBLIC_APP_VERSION ${NEXT_PUBLIC_APP_VERSION}

ENV NODE_ENV production

# Disable telemetry during runtime.
ENV NEXT_TELEMETRY_DISABLED 1

# adding internal url. https://github.com/sinamics/ztnet/issues/105
ENV NEXTAUTH_URL_INTERNAL http://localhost:3000

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

##
# Install PostgreSQL
##
# Create the file repository configuration:
RUN sudo sh -c 'echo "deb https://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'

# Import the repository signing key:
RUN wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -


RUN apt update && apt install -y \
    locales curl sudo postgresql-client-15.2 postgresql-15.2 postgresql-contrib-15.2 \
    && apt clean && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# make the "en_US.UTF-8" locale so postgres will be utf-8 enabled by default
RUN set -eux; \
    if [ -f /etc/dpkg/dpkg.cfg.d/docker ]; then \
    # if this file exists, we're likely in "debian:xxx-slim", and locales are thus being excluded so we need to remove that exclusion (since we need locales)
    grep -q '/usr/share/locale' /etc/dpkg/dpkg.cfg.d/docker; \
    sed -ri '/\/usr\/share\/locale/d' /etc/dpkg/dpkg.cfg.d/docker; \
    ! grep -q '/usr/share/locale' /etc/dpkg/dpkg.cfg.d/docker; \
    fi; \
    apt-get update; apt-get install -y --no-install-recommends locales; rm -rf /var/lib/apt/lists/*; \
    localedef -i en_US -c -f UTF-8 -A /usr/share/locale/locale.alias en_US.UTF-8

ENV LANG en_US.utf8

# need to install these package for seeding the database
RUN npm install @prisma/client @paralleldrive/cuid2
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
COPY --from=ztmkworld_builder /usr/local/bin/ztmkworld /usr/local/bin/ztmkworld

# prepeare .env file for the init-db.sh script
RUN touch .env && chown nextjs:nodejs .env

RUN chmod u+x init-db.sh

# USER nextjs

EXPOSE 3000

ENV PORT 3000

ENTRYPOINT ["/app/init-db.sh"]
CMD ["node", "server.js"]