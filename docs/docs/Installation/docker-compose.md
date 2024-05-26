---
id: docker-compose
title: Docker Compose
slug: /installation/docker-compose
description: Docker Compose installation instructions for ZTNET
sidebar_position: 1
---

## System Requirements

Your system should meet the following minimum requirements:

- **Memory**: 1GB of RAM
- **CPU**: 1 Core

# Install Docker
Docker is a containerization platform that allows you to quickly build, test, and deploy applications as portable, self-sufficient containers that can virtually run everywhere.

https://github.com/docker/docker-install
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
```

# Docker Compose
### Services
- **Postgres**: Database. **Change `POSTGRES_PASSWORD` for security**.
- **ZeroTier**: Zerotier Docker service.
- **ZTNET**: Main app, depends on both `postgres` and `zerotier`.

### Setup

:::warning IMPORTANT

Change the **NEXTAUTH_URL** environment variable to the canonical URL or IP of your site.  
**Example:**
- If your server's IP address is 123.456.78.90, set NEXTAUTH_URL to http://123.456.78.90:3000.
- If you have a domain name, use it in place of the IP address.
:::

```yml title="Create a docker-compose.yml file and populate it as follows:"
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
    image: zyclonite/zerotier:1.14.0
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
      NEXTAUTH_URL: "http://localhost:3000" # !! Important !! Set the NEXTAUTH_URL environment variable to the canonical URL or IP of your site with port 3000
      NEXTAUTH_SECRET: "random_secret"
      NEXTAUTH_URL_INTERNAL: "http://ztnet:3000" # Internal NextAuth URL for 'ztnet' container on port 3000. Do not change unless modifying container name.
    networks:
      - app-network
    links:
      - postgres
    depends_on:
      - postgres
      - zerotier

  ############################################################################
  #                                                                          #
  # Uncomment the section below to enable HTTPS reverse proxy with Caddy.    #
  #                                                                          #
  # Steps:                                                                   #
  # 1. Replace <YOUR-PUBLIC-HOST-NAME> with your actual public domain name.  #
  # 2. Uncomment the caddy_data volume definition in the volumes section.    #
  #                                                                          #
  ############################################################################

  # https-proxy:
  #   image: caddy:latest
  #   container_name: ztnet-https-proxy
  #   restart: unless-stopped
  #   depends_on:
  #     - ztnet
  #   command: caddy reverse-proxy --from <YOUR-PUBLIC-HOST-NAME> --to ztnet:3000
  #   volumes:
  #     - caddy_data:/data
  #   networks:
  #     - app-network
  #   links:
  #     - ztnet
  #   ports:
  #     - "80:80"
  #     - "443:443"

volumes:
  zerotier:
  postgres-data:
  # caddy_data:

networks:
  app-network:
    driver: bridge
    ipam:
      driver: default
      config:
        - subnet: 172.31.255.0/29
```

Instead of copy the docker-compose.yml file, you can also download it directly from the repository:
```bash
wget -O docker-compose.yml https://raw.githubusercontent.com/sinamics/ztnet/main/docker-compose.yml
```

To change the `NEXTAUTH_URL` in docker-compose.yml, you can use this command that will set the default server ip:
```bash
sed -i "s|http://localhost:3000|http://$(hostname -I | cut -d' ' -f1):3000|" docker-compose.yml
```

To launch ZTNET, execute the following command in your `docker-compose.yml` directory:
```bash
docker compose up -d
```

This action pulls necessary images, initializes the containers, and activates the services.
Visit `http://localhost:3000` to access the ZTNET web interface.

### ⚠️ NOTE
The first registered user automatically gains admin privileges.
As an administrator, you possess unique capabilities not available to regular users. This includes the ability to view all registered accounts on the controller.

Please note that while admins have visibility over registered accounts, they **cannot** interact with or modify other users' networks directly. Each network's configuration and data remain exclusive to the respective user account, maintaining privacy and security for all users.

## Updating ZTNET application
To update ZTNET, pull the latest image and restart the container.

If you are updating from a earlier version, make sure you set the `NEXTAUTH_URL` environment variable to the canonical URL or IP of your site.
See Note above for more information about [Innstallation Setup](/installation/docker-compose#setup)
```bash
docker compose pull
docker compose up -d
```

## Application Logs
To view the ZTNET server logs:
```bash
docker compose logs -f ztnet
```

## Ztnet Environment Variables
See [Environment Variables](/installation/options#environment-variables) for more information.