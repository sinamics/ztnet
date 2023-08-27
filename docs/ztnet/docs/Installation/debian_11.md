---
sidebar_position: 2
---

# Standalone Debian 11


### Install PostgreSQL and ZeroTier
First, make sure PostgreSQL and ZeroTier are installed and configured on your FreeBSD server.
```bash
    curl -s https://install.zerotier.com | sudo bash
    sudo apt install postgresql postgresql-contrib
```

### Install Node.js and npm
Next, install Node.js version 18.
```bash
    curl -sL https://deb.nodesource.com/setup_18.x | sudo bash -
    sudo apt-get install -y nodejs
```
### Setup Ztnet

1. Clone the Ztnet repository:
    ```bash
    git clone https://github.com/sinamics/ztnet.git
    ```

2. Navigate into the directory:
    ```bash
    cd ztnet
    ```

3. Checkout version:
    ```bash
    git checkout tags/v0.3.6
    ````

4. Install the Node.js dependencies:
    ```bash
    npm install
    ```

5. Create a `.env` file in the root directory and populate it with the necessary environment variables, Make sure these match what you've set up in your PostgreSQL database.
    ```
    DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres?schema=public
    ZT_ADDR=http://localhost:9993
    NEXT_PUBLIC_SITE_NAME=ZTnet
    NEXTAUTH_URL="http://localhost:3000"
    NEXTAUTH_SECRET="random_secret"
    ```

6. Populate the PostgreSQL database with the necessary tables:
    ```bash
    npx prisma migrate deploy
    npx prisma db seed
    ```
    
7. Build Next.js production:
    ```bash
    npm run build
    ```

8. Run server:
   ```bash
   cd .next/standalone
   node server.js
   ```




