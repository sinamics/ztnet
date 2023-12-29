---
id: create_webhooks
title: Configure Webhooks
slug: /webhooks/add_webhooks/
description: Webhooks are a way for apps to provide other applications with real-time information. A webhook delivers data to other applications as it happens, meaning you get data immediately.
sidebar_position: 1
---

# Configuring Webhooks in ZTNET

Webhooks in ZTNET empower your organization with real-time event notifications. To set up a webhook, you'll need to specify:

- **Webhook Name**: Assign a unique and descriptive name to each webhook.
- **Webhook Actions**: Choose the [events](/webhooks/events) that should trigger notifications. Multiple selections are allowed.
- **Endpoint URL (HTTPS)**: This is the receiver URL where ZTNET will send event data. It must be a publicly accessible HTTPS URL to ensure security.


## Data Structure

Each webhook event in ZTNET includes a JSON payload sent to the configured endpoint URL. Here are examples of the JSON content for several webhook types:

## Member Configuration Changed (`MEMBER_CONFIG_CHANGED`)

When a member's configuration changes, the webhook will contain the following data:

```json
{
  // HookType is the type of hook being fired.
  "hookType": "MEMBER_CONFIG_CHANGED",
  // organizationId is the internal ID the hook belongs to
  "organizationId": "org_123456",
  // NetworkID is the network the member belongs to
  "networkId": "network_12345",
  // MemberID is the network member that was changed
  "memberId": "mem_112233",
  // UserID is the ID of the user that modified the network member
  "userId": "user_445566",
  // UserEmail is the email address of the user that modified the network member
  "userEmail": "user@example.com",
  // Changes is a map of the changes that were made to the network member
  "changes": {
    "authorized": true,
  }
}
```

### Network Created (NETWORK_CREATED)
After a new network is created, the webhook payload will contain the following data:
```json
{
  "hookType": "NETWORK_CREATED",
  "organizationId": "org_123456",
  "networkId": "net_78910",
  "userId": "user_445566",
  "userEmail": "user@example.com"
}
```