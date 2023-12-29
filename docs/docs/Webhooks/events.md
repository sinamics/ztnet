---
id: events
title: Events
slug: /webhooks/events
description: Webhook events are the possible actions that can trigger a webhook notification.
sidebar_position: 2
---

# ZTNET Webhook Events

Webhooks in ZTNET allow you to set up automated notifications for specific events within your networks and organization. Below you'll find the available webhook events and their descriptions:

## Network Events

- **Network Join (`NETWORK_JOIN`)**  
  Fired when a new member requests to join a network. This event is triggered once when the network controller receives the join request from the member.

- **Network Created (`NETWORK_CREATED`)**  
  Fired when a network is created within the organization.

- **Network Configuration Changed (`NETWORK_CONFIG_CHANGED`)**  
  Fired when there is a change in the organization network's configuration settings.

- **Network Deleted (`NETWORK_DELETED`)**  
  Fired when a network is permanently deleted from the organization.

## Member Events

- **Member Configuration Changed (`MEMBER_CONFIG_CHANGED`)**  
  Triggered when a member's configuration in a organization network is altered.

- **Member Deleted (`MEMBER_DELETED`)**  
  Fired when a member is removed from a organization network.

## Organization Events

- **Organization Member Removed (`ORG_MEMBER_REMOVED`)**  
  Fired when a member is removed from the organization, whether by an administrator or by the member themselves.

