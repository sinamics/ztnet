---
id: info
title: How ZTNET Works
slug: /how-ztnet-works
description: How ZTNET works
sidebar_position: 4
---

# How ZTNET Works

## Overview

ZTnet is a web-based user interface developed in TypeScript, designed to facilitate easier management of ZeroTier networks. It works as an intermediary between the end-user and the ZeroTier Controller API, providing an intuitive interface for network management tasks.

## Core Components

### Frontend

The frontend is built using TypeScript along with modern web frameworks to offer an interactive and user-friendly experience.

### Backend

The backend acts as the bridge between the frontend and the ZeroTier Controller API, also written in TypeScript. It handles API requests and performs data transformation, making it easier to manage the network configurations.

## Communication Flow

1. **User Input**: The user performs actions on the ZTnet web UI.
2. **API Requests**: ZTnet translates these actions into API requests.
3. **ZeroTier Controller API**: These requests are sent to the ZeroTier Controller API for processing.
4. **API Responses**: The API sends back the data or status update.
5. **Display Data**: ZTnet then takes this information and updates the UI accordingly.

## ZeroTier API Reference

For more details about the API endpoints and data formats used, you can refer to the [ZeroTier API Documentation](https://docs.zerotier.com/service/v1/).

## Language and Libraries

- **Language**: TypeScript
- **Key Libraries**: React, Next.js

## Conclusion

Understanding the basic structure and flow of ZTnet can help both end-users and developers get the most out of the application. The modular design and the use of TypeScript make it scalable and easy to contribute to.
