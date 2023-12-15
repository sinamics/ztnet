---
id: env-options
title: Environment Options
slug: /installation/options
description: Detailed documentation of environment variable options available for configuring the application.
---

# Application Configuration Options

This document outlines various environment variables and options that can be configured to customize the behavior of the application. Setting these variables correctly is crucial for the application to function as intended.

## Usage

### In Docker Compose

To use these environment variables in a Docker Compose setup, define them in your `docker-compose.yml` file under the `environment` section for the relevant service. For example:

```yaml
services:
  ztnet:
    environment:
      ZT_ADDR: "`http://zerotier:9993`"
      ZT_SECRET: "`your-zerotier-secret`"
      NEXT_PUBLIC_SITE_NAME: "ZTNET"
      # ... other environment variables ...
```

### In a Standalone Environment with .env File
```bash
ZT_ADDR="http://127.0.0.1:9993"
ZT_SECRET="your-zerotier-secret"
NEXT_PUBLIC_SITE_NAME="ZTNET"
```

## Available Environment options

Configure the application using the following environment variables:

- `ZT_ADDR`
  - Description: ZeroTier controller address.
  - Default: `http://zerotier:9993` for Docker environment, and `http://127.0.0.1:9993` for standalone.

- `ZT_SECRET`
  - Description: ZeroTier controller secret.
  - Default: Contents of `/var/lib/zerotier-one/authtoken.secret`.

- `NEXT_PUBLIC_SITE_NAME`
  - Description: Site name.
  - Default: `ZTNET`.

- `POSTGRES_HOST`
  - Default: `postgres`.

- `POSTGRES_PORT`
  - Default: `5432`.

- `POSTGRES_USER`
  - Default: `postgres`.

- `POSTGRES_PASSWORD`
  - Default: `postgres`.

- `POSTGRES_DB`
  - Default: `ztnet`.

- `NEXTAUTH_URL`
  - Description: Canonical URL of your site.
  - Default: `http://localhost:3000`.

- `NEXTAUTH_URL_INTERNAL`
  - Description: Server-side URL for NEXTAUTH. Used when the server doesn't have access to the canonical URL of your site.
  - Default: Value of `NEXTAUTH_URL`.

- `NEXTAUTH_SECRET`
  - Description: Secret key for NEXTAUTH, used for security.
  - Default: `"random_secret"` (change to a random string for enhanced security).

- `NEXTAUTH_SESSION_MAX_AGE`
  - Description: Duration (in seconds) before the user is logged out due to inactivity.
  - Default: 2592000 (30 Days).


For more information on NEXTAUTH environment variables, see [NEXTAUTH Environment Variables](https://next-auth.js.org/configuration/options#environment-variables).
