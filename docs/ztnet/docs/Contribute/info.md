---
id: developer
title: Developer
slug: /developer
description: Developer instructions for ZTNET
sidebar_position: 5
---

# Developer

## Introduction

ZTnet uses a Development Container to simplify the development setup. This container orchestrates a development environment that includes PostgreSQL and ZeroTier, all configured through a `.devcontainer/docker-compose.yml` file. This setup ensures that the internal network remains consistent, making development easier and more efficient.

## Prerequisites

- Docker installed
- Docker Compose installed
- Visual Studio Code with the Remote - Containers extension

## Step-by-Step Guide to Start Development

### 1. Clone the Repository

```bash
git clone https://github.com/sinamics/ztnet.git
```

### 2. Navigate to Project Directory

```bash
cd ztnet
```

### 3. Open in Visual Studio Code

Open the project in Visual Studio Code.

### 4. Attach to Dev Container

- In Visual Studio Code, look for the "Remote Explorer" icon in the sidebar.
- Under the "Containers" section, you will see the Dev Container for this project.
- Right-click and choose "Attach to Container".


### 5. Install Dependencies

Once inside the container, navigate to your project folder and install the required Node.js dependencies.

```bash
npm install
```

### 6. Start the Development Server

```bash
npm run dev
```

Your ZTnet application should now be running in development mode. Any changes you make to the codebase will automatically be reflected in the application.

## Conclusion

Using a Development Container significantly streamlines the setup process, allowing you to focus more on developing features rather than setting up your environment. This also ensures that every developer works within a similar setup, reducing the "it works on my machine" problems.

