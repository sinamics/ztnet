---
id: oauth
title: Oauth
slug: /authentication/oauth/
description: OAuth Configuration Guide
sidebar_position: 2
---

# OAuth Configuration Guide


:::note

OAuth will be available from version v0.5.6

:::

This document provides guidelines on configuring OAuth for various providers in our application. We support both standard OAuth 2.0 and OpenID Connect integrations.

## OpenID Connect and Standard OAuth 2.0 Configuration

Both OpenID Connect (OIDC) and Standard OAuth 2.0 are widely used for user authentication and authorization. The following environment variables are essential for configuring these protocols:

- `OAUTH_ALLOW_DANGEROUS_EMAIL_LINKING`: Set to `true` to enable the merging of user accounts that were initially created using email and password credentials with OAuth accounts. This is important for account merging and applies to both OpenID Connect and Standard OAuth 2.0 integrations. 

### OpenID Connect Configuration

OpenID Connect (OIDC) is an identity layer on top of the OAuth 2.0 protocol and is implemented by providers like Google. Configure the following for OIDC:

- `OAUTH_ID`: Your OAuth Client ID.
- `OAUTH_SECRET`: Your OAuth Client Secret.
- `OAUTH_WELLKNOWN`: URL to the OpenID Connect discovery document provided by the OAuth server. For example: `http://{PROVIDER_URL}/auth/realms/{REALM}/.well-known/openid-configuration`.

### Standard OAuth 2.0 Configuration

Standard OAuth 2.0 is used by various providers, including GitHub and Facebook. Set the following environment variables for OAuth 2.0 providers:

- `OAUTH_ID`: The OAuth Client ID.
- `OAUTH_SECRET`: The OAuth Client Secret.
- `OAUTH_ACCESS_TOKEN_URL`: URL to obtain the access token. For example: `"https://github.com/login/oauth/access_token"`.
- `OAUTH_AUTHORIZATION_URL`: URL to redirect users for authentication. It should be generated in the provider's developer settings. For example: `"https://github.com/login/oauth/authorize"` for GitHub.
- `OAUTH_USER_INFO`: URL to fetch the user's profile information after authentication. For example: `"https://api.github.com/user"` for GitHub.
- `OAUTH_SCOPE`: Defines the scope of access. For example: `"read:user user:email"` for GitHub.


### Callback URL
- `https://awesome.ztnet.com/api/auth/callback/oauth`


## Examples

### Keycloak Configuration

docker-compose.yml
```yml
ztnet:
  image: sinamics/ztnet:latest
  ...
  environment:
    OAUTH_ID: "your-client-id"
    OAUTH_SECRET: "your-client-secret"
    OAUTH_ALLOW_DANGEROUS_EMAIL_LINKING: "true"
    OAUTH_WELLKNOWN: "http://{PROVIDER_URL}/auth/realms/{REALM}/.well-known/openid-configuration"
```

### GitHub Configuration


Documentation: https://developer.github.com/apps/building-oauth-apps/authorizing-oauth-apps
```yml
ztnet:
  image: sinamics/ztnet:latest
  ...
  environment:
    OAUTH_ID: "your-github-client-id"
    OAUTH_SECRET: "your-github-client-secret"
    OAUTH_ACCESS_TOKEN_URL: "https://github.com/login/oauth/access_token"
    OAUTH_AUTHORIZATION_URL: "https://github.com/login/oauth/authorize"
    OAUTH_USER_INFO: "https://api.github.com/user"
    OAUTH_SCOPE: "read:user user:email"
```

### Facebook Configuration


Documentation: https://developers.facebook.com/docs/facebook-login/manually-build-a-login-flow/
```yml
ztnet:
  image: sinamics/ztnet:latest
  ...
  environment:
    OAUTH_ID: "your-facebook-client-id"
    OAUTH_SECRET: "your-facebook-client-secret"
    OAUTH_ACCESS_TOKEN_URL: "https://graph.facebook.com/oauth/access_token"
    OAUTH_AUTHORIZATION_URL: "https://www.facebook.com/v11.0/dialog/oauth?scope=email"
    OAUTH_USER_INFO: "https://graph.facebook.com/me"
    OAUTH_SCOPE: "id,name,email,picture"
```

### Discord Configuration


Documentation: https://discord.com/developers/docs/topics/oauth2
**Note* on `OAUTH_AUTHORIZATION_URL`  
When configuring the OAUTH_AUTHORIZATION_URL, it is important to generate it properly within your Discord application's developer settings. This URL contains critical parameters such as the client_id, response_type, redirect_uri, and scope. The redirect_uri must be precisely the same as the one registered in your Discord application to ensure successful redirection and authentication.
```yml
ztnet:
  image: sinamics/ztnet:latest
  ...
  environment:
    OAUTH_ALLOW_DANGEROUS_EMAIL_LINKING: "true"
    OAUTH_ID: "your-discord-client-id"
    OAUTH_SECRET: "your-discord-client-secret"
    OAUTH_ACCESS_TOKEN_URL: "https://discord.com/api/oauth2/token"
    OAUTH_AUTHORIZATION_URL: "https://discord.com/api/oauth2/authorize?client_id=xxxx&response_type=code&redirect_uri=https%3A%2F%2Fawesome.ztnet.com%2Fapi%2Fauth%2Fcallback%2Foauth&scope=email+identify"
    OAUTH_USER_INFO: "https://discord.com/api/users/@me"
```

## Troubleshooting
If you are having trouble with OAuth, please check the docker server logs:
```bash
docker logs ztnet
```

or if you are using standalone installation, check the systemd logs:
```bash
journalctl -u ztnet.service
```
