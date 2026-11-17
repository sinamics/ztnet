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
| Log Direct/Relay changes | Off | | Also store when a member switches between a direct and a relayed connection. While off, only changes to or from Offline are stored. |

Turning the log off stops sampling and hides the log for everyone. Events that were already stored are kept until they are older than the retention, so they are there again if you turn the log back on. Use **Clear log** to delete them all at once.

## Where to find the log

- **Network page**: both personal and organization networks get a **Logs** section below the member table. It can be filtered by member and by the new status. Online and offline changes are shown by default. When the admin has turned on **Log Direct/Relay changes**, an **Include Direct/Relay changes** filter appears to also show when a member switched between a direct and a relayed connection.
- **Member options**: the options dialog of a member shows the log for that one member.
- **Admin** -> **Settings** -> **Member status log**: admins get a view across all networks, with filters for network, node address and status.

A user only sees events for members of a network they have access to, and only from the time the member joined that network.

## How it works

ZeroTier does not keep any connection history. The controller can only tell which nodes it is talking to right now. To build a history, ZTNET asks the controller for its peer list once per sample interval and compares the result with the status it has stored for every member.

A change becomes a log entry once **two samples in a row** show it. The entry is dated to the first of the two. A member that looks different in one sample and is back to normal in the next leaves no trace, which keeps a flapping connection from filling the log.

A sample in which the peer list is empty, or in which nearly every member that was online is suddenly gone, is treated as a controller hiccup: nothing is stored for it. If the next sample shows the same, the members are logged as offline from the time of the first one.

Every status is one of:

| Status | Meaning |
| --- | --- |
| Offline | The controller has no peer entry for the member. |
| Direct | The controller talks to the member over a direct path. |
| Relay | The controller knows the member but has no direct path to it. |

These are the same statuses the member table shows.

With **Log Direct/Relay changes** off, Direct and Relay both count as "online". A member moving between the two is not a change, and an entry such as "Direct to Offline" shows the kind of connection the member had when it came online. Direct/Relay entries stored while the switch was on are kept and are shown again when it is turned back on.

## Limits

The log is useful for answering "roughly when did this device drop off", not for exact uptime measurements. Keep the following in mind:

- **It is sampled, and a change needs two samples.** A drop shorter than two sample intervals is not recorded. A shorter sample interval catches shorter drops at the cost of more requests to the controller.
- **Offline is reported late.** The controller keeps a node in its peer list for a while after the node has gone silent. In a test with ZeroTier 1.14.2 a member that was shut down was still reported as Direct for about 4 minutes, then as Relay, and as Offline about 8 and a half minutes after it was stopped. The timestamp of an Offline event is therefore later than the moment the device actually disappeared.
- **It is the controller's view.** The status describes the link between the controller and the member. Two members can still reach each other while one of them shows as Relay or Offline to the controller, and the other way around.
- **Status is per node, not per network.** A device that is a member of several networks has one status. The same event shows up in the log of every network the device is a member of.
- **Relay is a best guess.** The controller does not say outright that a connection is relayed, ZTNET derives it from the peer data. Direct and Relay changes can be noisy, which is why they are hidden by default.
- **Local controller only.** Networks on ZeroTier Central have no peer data and are not covered.
- **No events across a gap.** After a restart of ZTNET, or after the log was disabled, the first sample only records the current status. A change that happened while nothing was sampling is not turned into an event.
- **If the controller cannot be reached** the sample is skipped. A controller that was restarted has an empty peer list for a short while. One such sample is ignored, an outage that lasts for two samples or more is recorded as the members going offline and coming back.
- **Counts stop at 1000.** The log views page through the entries with Previous and Next and show "1000+" for a larger log instead of counting every row.

## Large instances

The sampler makes one request to the controller per interval, however many networks and members there are, and only writes when something changed. Measured on a development machine with 4,000 members in 60 networks at a 10 second interval:

| | |
| --- | --- |
| One sample with nothing changed | about 60 ms |
| One sample with 1 percent of the members changing | about 75 ms |
| One sample with all 4,000 members changing | about 0.5 s |
| Log entries per day when 1 percent of the members change in every sample | about 35,000 with the defaults, about 256,000 with Direct/Relay logging on |
| Opening a log page with 10 million stored entries | under 15 ms, also deep into the log |

The size of the log is what to keep an eye on. It grows with how often members really change status, the sample interval only decides how quickly a change is noticed. Leave **Log Direct/Relay changes** off unless you need it, and set the retention to what you actually look back at. Old entries are deleted in small batches, so the nightly cleanup does not block the log.
