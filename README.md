# Next ZTNet

## This is a work in progress. It is not ready for production use.

Next ZTNet is a ZeroTier controller that provides an easy-to-use interface for managing your ZeroTier networks. Built with Next.js, Prisma, tRPC, TypeScript, Tailwind CSS, and DaisyUI, this powerful web application simplifies the process of creating, configuring, and monitoring your ZeroTier networks.

With Next ZTNet, you can:

- Create and manage multiple ZeroTier networks
- Monitor network status and connected nodes
- Easily add and remove nodes from your networks
- Configure network settings such as IP ranges, routes, and access control

## Table of Contents

- [Next ZTNet](#next-ztnet)
  - [This is a work in progress. It is not ready for production use.](#this-is-a-work-in-progress-it-is-not-ready-for-production-use)
  - [Table of Contents](#table-of-contents)
  - [Installation](#installation)
    - [Using Docker Compose](#using-docker-compose)
    - [Environment Variables](#environment-variables)
  - [Development](#development)
    - [Clone the Repository](#clone-the-repository)
    - [Setup Environment Variables](#setup-environment-variables)

## Installation

### Using Docker Compose

You don't need to clone the repository to use Next ZTNet with Docker. Instead, create a `docker-compose.yml` file in your local machine with the following content:

```yaml
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
      - ZT_ALLOW_MANAGEMENT_FROM=172.28.0.0/16

  ztnet:
    image: sinamics/next_ztnet
    container_name: ztnet
    platform: "linux/amd64"
    working_dir: /app
    volumes:
      - zerotier:/var/lib/zerotier-one:ro
    build:
      context: .
      dockerfile: Dockerfile
      args:
        NEXT_PUBLIC_CLIENTVAR: "clientvar"
    restart: unless-stopped
    ports:
      - 3000:3000
    environment:
      ZT_ADDR: http://zerotier:9993
      POSTGRES_HOST: postgres
      POSTGRES_PORT: 5432
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: postgres
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
        - subnet: 172.28.0.0/16
```

Next, run the following command in the same directory as the `docker-compose.yml` file:

`docker-compose up -d`

This will pull the required images, create the containers, and start the services.

You can now access the Next ZTNet web interface at `http://localhost:3000`.

### Environment Variables

The `docker-compose.yml` file includes several environment variables that you can customize based on your needs. Here is a description of each variable:

- `POSTGRES_HOST`: The hostname of the PostgreSQL service.
- `POSTGRES_PORT`: The port number for the PostgreSQL service.
- `POSTGRES_USER`: The username for the PostgreSQL database.
- `POSTGRES_PASSWORD`: The password for the PostgreSQL database user.
- `POSTGRES_DB`: The name of the PostgreSQL database.
- `ZT_OVERRIDE_LOCAL_CONF`: Allows overriding local ZeroTier configuration.
- `ZT_ALLOW_MANAGEMENT_FROM`: Defines the IP range allowed to access the ZeroTier management interface.
- `ZT_ADDR`: The address of the ZeroTier service.
- `NEXTAUTH_URL`: The URL for NextAuth authentication.
- `NEXTAUTH_SECRET`: The secret key for NextAuth authentication.
- `NEXT_PUBLIC_CLIENTVAR`: A public client variable used by the Next.js application.

To change any of these values, update the corresponding environment variable in the `docker-compose.yml` file.

## Development

### Clone the Repository

To start development, first, clone the repository:

`git clone https://github.com/yourusername/next_ztnet.git
cd next_ztnet`

### Setup Environment Variables

Create a `.env` file in the root of the project and set the necessary environment variables:

- `ZT_ADDR`=http://zerotier:9993
- `POSTGRES_HOST`=localhost
- `POSTGRES_PORT`=5432
- `POSTGRES_USER`=postgres
- `POSTGRES_PASSWORD`=postgres
- `POSTGRES_DB`=ztnet
- `NEXTAUTH_URL`=http://localhost:3000
- `NEXTAUTH_SECRET`="your_nextauth_secret"
- `MIGRATE_POSTGRES_DB`="shaddow_ztnet"
- `MIGRATE_DATABASE_URL`="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:${POSTGRES_PORT}/${MIGRATE_POSTGRES_DB}?schema=public"

You need to run the following command to create the database:

`npx prisma db push`

Now start the development server:

`npm run dev`
