---
id: docker-compose
title: Docker Compose
slug: /installation/docker-compose
description: Docker Compose installation instructions for ZTNET
sidebar_position: 1
---

# Docker Compose
### Services
- **Postgres**: Database. **Change `POSTGRES_PASSWORD` for security**.
- **ZeroTier**: Zerotier Docker service.
- **ZTNET**: Main app, depends on both `postgres` and `zerotier`.

### Setup

```yml title="Create a docker-compose.yml file and populate it as follows:"
version: "3.1"
services:
  postgres:
    image: postgres:15.2-alpine
    container_name: postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: ztnet
    volumes:
      - postgres-data:/var/lib/postgresql/data
    networks:
      - app-network

  zerotier:
    image: zyclonite/zerotier:1.10.6
    hostname: zerotier
    container_name: zerotier
    restart: unless-stopped
    volumes:
      - zerotier:/var/lib/zerotier-one
    cap_add:
      - NET_ADMIN
      - SYS_ADMIN
    devices:
      - /dev/net/tun:/dev/net/tun
    networks:
      - app-network
    ports:
      - "9993:9993/udp"
    environment:
      - ZT_OVERRIDE_LOCAL_CONF=true
      - ZT_ALLOW_MANAGEMENT_FROM=172.31.255.0/29

  ztnet:
    image: sinamics/ztnet:latest
    container_name: ztnet
    working_dir: /app
    volumes:
      - zerotier:/var/lib/zerotier-one
    restart: unless-stopped
    ports:
      - 3000:3000
    # - 127.0.0.1:3000:3000  <--- Use / Uncomment this line to restrict access to localhost only
    environment:
      POSTGRES_HOST: postgres
      POSTGRES_PORT: 5432
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: ztnet
      NEXTAUTH_URL: "http://localhost:3000"
      NEXTAUTH_SECRET: "random_secret"
    networks:
      - app-network
    links:
      - postgres
    depends_on:
      - postgres
      - zerotier
volumes:
  zerotier:
  postgres-data:

networks:
  app-network:
    driver: bridge
    ipam:
      driver: default
      config:
        - subnet: 172.31.255.0/29
```
To launch ZTNET, execute the following command in your `docker-compose.yml` directory:

`docker-compose up -d`

This action pulls necessary images, initializes the containers, and activates the services.
Visit `http://localhost:3000` to access the ZTNET web interface.


### ⚠️ NOTE
The first registered user automatically gains admin privileges.
As an administrator, you possess unique capabilities not available to regular users. This includes the ability to view all registered accounts on the controller.

Please note that while admins have visibility over registered accounts, they **cannot** interact with or modify other users' networks directly. Each network's configuration and data remain exclusive to the respective user account, maintaining privacy and security for all users.

## Ztnet Environment Variables
The following environment variables are available for configuration. They can be set in the `.env` file or passed directly to the docker-compose.yml file.

- **ZT_ADDR**  zerotier controller address. Defaults to `http://zerotier:9993` for docker environment, and `http://127.0.0.1:9993` for standalone.
- **ZT_SECRET** zerotier controller secret. Defaults to the content of `/var/lib/zerotier-one/authtoken.secret`.
- **NEXT_PUBLIC_SITE_NAME** Site name. Defaults to `ZTNET`.
- **POSTGRES_HOST** Default: postgres
- **POSTGRES_PORT** Default: 5432
- **POSTGRES_USER** Default: postgres
- **POSTGRES_PASSWORD** Default: postgres
- **POSTGRES_DB** Default: ztnet
- **NEXTAUTH_URL** Default: "http://localhost:3000" # Change `localhost` to your production domain when deploying.
- **NEXTAUTH_SECRET** Default: "random_secret", change this to a random string for security.