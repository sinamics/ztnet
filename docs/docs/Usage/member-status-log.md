---
id: member_status_log
title: Member Status Log
slug: /usage/member-status-log/
description: Keep a history of when network members go online or offline, with a filterable log on every network page.
sidebar_position: 9
---

# Member Status Log

The member status log keeps a history of connection status changes for the members of your networks: when a member went offline, when it came back, and optionally when its connection switched between Direct and Relay.

The log is **off by default**. Until an instance admin enables it, nothing is sampled, nothing is stored and no log is shown anywhere.

## Enabling the log

Only an instance admin can turn the log on.

1. Go to **Admin** -> **Settings**.
2. Scroll to **Member status log**.
3. Tick **Enable member status log**.

The change takes effect right away, no restart is needed. The first sample after enabling only records where every member stands, so the log starts out empty and fills up as members change status.

| Setting | Default | Range | What it does |
| --- | --- | --- | --- |
| Enable member status log | Off | | Turns sampling and the log views on or off. |
| Retention | 30 days | 1 to 365 days | Events older than this are deleted. A daily job removes them, and lowering the value removes them immediately. |
| Sample interval | 60 seconds | 10 to 3600 seconds | How often ZTNET asks the controller for the status of its members. |

Turning the log off stops sampling and hides the log for everyone. Events that were already stored are kept until they are older than the retention, so they are there again if you turn the log back on. Use **Clear log** to delete them all at once.

## Where to find the log

- **Network page**: both personal and organization networks get a **Logs** section below the member table. It can be filtered by member and by the new status. Online and offline changes are shown by default, tick **Include Direct/Relay changes** to also see when a member switched between a direct and a relayed connection.
- **Member options**: the options dialog of a member shows the log for that one member.
- **Admin** -> **Settings** -> **Member status log**: admins get a view across all networks, with filters for network, node address and status.

A user only sees events for members of a network they have access to, and only from the time the member joined that network.

## How it works

ZeroTier does not keep any connection history. The controller can only tell which nodes it is talking to right now. To build a history, ZTNET asks the controller for its peer list once per sample interval, compares the result with the previous sample, and stores a row for every member whose status changed.

Every status is one of:

| Status | Meaning |
| --- | --- |
| Offline | The controller has no peer entry for the member. |
| Direct | The controller talks to the member over a direct path. |
| Relay | The controller knows the member but has no direct path to it. |

These are the same statuses the member table shows.

## Limits

The log is useful for answering "roughly when did this device drop off", not for exact uptime measurements. Keep the following in mind:

- **It is sampled.** A drop that starts and ends between two samples is never seen. A shorter sample interval catches shorter drops at the cost of more requests to the controller.
- **Offline is reported late.** The controller keeps a node in its peer list for a while after the node has gone silent. In a test with ZeroTier 1.14.2 a member that was shut down was still reported as Direct for about 4 minutes, then as Relay, and as Offline about 8 and a half minutes after it was stopped. The timestamp of an Offline event is therefore later than the moment the device actually disappeared.
- **It is the controller's view.** The status describes the link between the controller and the member. Two members can still reach each other while one of them shows as Relay or Offline to the controller, and the other way around.
- **Status is per node, not per network.** A device that is a member of several networks has one status. The same event shows up in the log of every network the device is a member of.
- **Relay is a best guess.** The controller does not say outright that a connection is relayed, ZTNET derives it from the peer data. Direct and Relay changes can be noisy, which is why they are hidden by default.
- **Local controller only.** Networks on ZeroTier Central have no peer data and are not covered.
- **No events across a gap.** After a restart of ZTNET, or after the log was disabled, the first sample only records the current status. A change that happened while nothing was sampling is not turned into an event.
- **If the controller cannot be reached** the sample is skipped. A controller that was restarted has an empty peer list for a short while, which is recorded as members going offline and coming back.
