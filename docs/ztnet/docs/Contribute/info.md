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

### 3. Open the Project in Visual Studio Code with Dev Container

To work on the project using a Dev Container in Visual Studio Code, follow these steps:

1. **Open Visual Studio Code** and ensure you have the 'Remote - Containers' extension installed.

2. **Open the Project in a Dev Container:**  
   - Press `Ctrl + Shift + P` to open the command palette.
   - Type and select `Remote-Containers: Open Folder in Container`.
   - Select the project folder and press OK. Visual Studio Code will reopen the folder inside the Dev Container.

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

