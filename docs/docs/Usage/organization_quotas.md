---
id: organization_quotas
title: Organization Quotas
slug: /usage/organization-quotas/
description: Limit how many networks an organization can have and how many members can be authorized on each of its networks.
sidebar_position: 9
---

# Organization Quotas

An instance administrator can limit what each organization may use:

| Quota | What it limits |
| --- | --- |
| **Networks** | How many networks the organization can hold. |
| **Authorized members per network** | How many authorized members each network of the organization can have. Stashed and deleted members do not count. |

Both quotas are empty by default, which means unlimited, so existing organizations are not affected until a limit is set.

## Setting the quotas

Go to **Admin** -> **Organization** -> **Organization Quotas**. Every organization on the instance is listed with its current usage next to each limit. Select **Change**, enter a whole number of 1 or more, or leave a field empty for unlimited, and submit.

Only instance administrators can change the quotas. Organization owners and organization admins can see the limits on the organization page, but have no way to change them, neither in the UI nor through the REST API.

## What happens at a limit

- **Networks**: creating a network in the organization is refused, in the UI and through `POST /api/v1/org/:orgid/network`. Transferring a personal network into the organization is refused as well. The organization page shows the usage, for example `2/5 networks`, and disables the add network button at the limit.
- **Authorized members**: authorizing one more member on a full network is refused, in the UI and through `POST /api/v1/org/:orgid/network/:nwid/member/:memberId`. Members that are already authorized can still be renamed, edited and deauthorized. The network page shows the usage, for example `3/5 authorized members`.
- **Stashed members**: a stashed member has to be restored before it can be authorized. Restoring a member that is still flagged as authorized is refused on a full network, and a member that is still authorized cannot be stashed without being deauthorized, so stashing never frees a slot for a device the controller keeps authorized.
- A refused request returns HTTP `403` with a message that asks the user to contact the instance administrator.

Lowering a quota below the current usage removes nothing. No network is deleted and no member is deauthorized. The organization simply cannot add anything new until its usage is below the limit again.

## Public networks

A public network authorizes every device that joins, without ZTNET being involved. A member limit cannot work on such a network, so while an organization has a member limit:

- its networks cannot be switched to public, and
- a public personal network cannot be transferred into it. A personal network with more authorized members than the limit cannot be transferred either.

If an organization already has public networks when a member limit is set, those networks are left unchanged. The admin page shows a warning that names them. Switch them to private to make the limit apply. If the controller does not answer for a network, the admin page says so instead of leaving the network out silently.

## Limits of the member quota

ZeroTier itself has no member limit. Any device that knows the network ID can join, and the controller creates a member record for it. ZTNET cannot prevent that. What the quota controls is **authorization** on **private** networks: a device that joins a full network shows up as an unauthorized member and cannot be authorized until there is room.

The count comes from the ZTNET database, which mirrors the controller. A member that is authorized directly on the ZeroTier controller, outside ZTNET, is not stopped by the quota, but it is counted once ZTNET has synced it.

The network quota is checked under a database lock, so concurrent requests cannot exceed it. The member quota is checked right before the authorization is sent to the controller and is not locked, so two authorizations sent at the same moment on a network with one free slot can both succeed.
