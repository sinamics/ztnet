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
      NEXT_PUBLIC_SITE_NAME: "ZTNET"
      NEXTAUTH_URL: http://your_server_ip:3000
      # ... other environment variables ...
```

### In a Standalone Environment
Edit the `.env` file in `/opt/ztnet` to set the environment variables. For example:

```bash
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/ztnet?schema=public
NEXT_PUBLIC_SITE_NAME=ZTNET
NEXTAUTH_URL=http://your_server_ip:3000
```

## Available Environment options

Configure the application using the following environment variables:
### ZTNET Configuration
- `NEXT_PUBLIC_SITE_NAME`
  - Description: Site name.
  - Default: `ZTNET`.

- `HOSTNAME`
  - Description: Hostname of the server. Only available in standalone mode.
  - Default: `0.0.0.0`.

### ZeroTier Controller Configuration
- `ZT_ADDR`
  - Description: ZeroTier controller address. Use these settings if you wish to configure a custom ZeroTier controller instead of the default one.
  - Default: `http://zerotier:9993` for Docker environment, and `http://127.0.0.1:9993` for standalone.

- `ZT_SECRET`
  - Description: ZeroTier controller secret. Necessary for custom controller configuration.
  - Default: Contents of `/var/lib/zerotier-one/authtoken.secret`.


### Database Configuration
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

## OAuth Configuration
See [OAuth](/authentication/oauth) for more information.
- `OAUTH_ALLOW_DANGEROUS_EMAIL_LINKING`
  - Description: Allows linking of user accounts registered with email credentials to OAuth accounts. This should be enabled if a user has initially registered using email and password and later chooses to log in via OAuth, facilitating account merging.
  - Default: `false`

- `OAUTH_WELLKNOWN`
  - Description: URL to the OAuth server's well-known configuration. 
  - Examples:
    - For Google: `https://accounts.google.com/.well-known/openid-configuration`
    - For Keycloak: `http://{KEYCLOAK_SERVER_URL}/auth/realms/{REALM}/.well-known/openid-configuration`
  - Default: None. Must be set.

- `OAUTH_ID`
  - Description: Client ID for OAuth authentication.
  - Default: None. Must be set.

- `OAUTH_SECRET`
  - Description: Client secret for OAuth authentication.
  - Default: None. Must be set.

- `OAUTH_ACCESS_TOKEN_URL`
  - Description: URL to obtain the access token in OAuth 2.0 flow. Used by OAuth providers to exchange authorization code for an access token.
  - Example: `"https://github.com/login/oauth/access_token"` for GitHub.
  - Default: None. Must be set according to the OAuth provider.

- `OAUTH_AUTHORIZATION_URL`
  - Description: URL where the application redirects users for authentication and authorization. Initiates the OAuth 2.0 authorization flow.
  - Example: `"https://github.com/login/oauth/authorize"` for GitHub.
  - Default: None. Must be set according to the OAuth provider.

- `OAUTH_USER_INFO`
  - Description: URL to fetch the user's profile information after successful authentication in OAuth 2.0 flow. Used to retrieve details about the authenticated user.
  - Example: `"https://api.github.com/user"` for GitHub.
  - Default: None. Must be set according to the OAuth provider.

- `OAUTH_SCOPE`
  - Description: Specifies the scope of access requests in the OAuth 2.0 flow. This defines the level of access that the application is requesting from the user's account. Varies depending on the OAuth provider and the information the application needs.
  - Example: `"read:user user:email"` for GitHub, to request basic user information and email.
  - Default: `"openid profile email"`.

- `OAUTH_EXCLUSIVE_LOGIN`
  - Description: If set to `true`, users can only log in using OAuth. If set to `false`, users can log in using either OAuth or email credentials.
  - Default: `false`.

## NEXTAUTH Configuration
For more information on NEXTAUTH environment variables, see [NEXTAUTH Environment Variables](https://next-auth.js.org/configuration/options#environment-variables).

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


