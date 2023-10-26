---
id: override_default_route
title: Routing all traffic through Home with ZeroTier
slug: /usage/override_default_route
description: Routing all traffic through Home with ZeroTier
---

# Routing all traffic through Home with ZeroTier

This guide will walk you through the steps to route all your internet traffic through a ZeroTier client, effectively using it as a VPN gateway. This setup is particularly useful for securing your internet connection or bypassing geo-restrictions. 

## Overview
This guide involves two Debian OS machines:

1. ZeroTier Web UI Server: This machine hosts Ztnet and serves as the ZeroTier Web UI for managing network configurations.
2. Debian Client: This machine will act as the client through which all internet traffic will be routed.


### Step 1: Enable IPv4 Forwarding ( Run on Debian Client )

1. Open the sysctl configuration file by editing `/etc/sysctl.conf`.
2. Find and uncomment the line `net.ipv4.ip_forward` to enable IP forwarding upon boot.
3. To enable IP forwarding immediately, run the following command:

```bash
sudo sysctl -w net.ipv4.ip_forward=1
```

### Step 2: Configure iptables for NAT and Forwarding ( Run on Debian Client )
Replace `PHY_IFACE` and `ZT_IFACE` with your actual physical and ZeroTier interface names.
```bash
PHY_IFACE=eth0
ZT_IFACE=ztxxxxxxx

sudo iptables -t nat -A POSTROUTING -o $PHY_IFACE -j MASQUERADE
sudo iptables -A FORWARD -i $ZT_IFACE -o $PHY_IFACE -j ACCEPT
sudo iptables -A FORWARD -i $PHY_IFACE -o $ZT_IFACE -m state --state RELATED,ESTABLISHED -j ACCEPT
```

After setting up your iptables rules, you'll want to make sure they are persistent across reboots. You can achieve this by installing `iptables-persistent` , you will be asked if you want to save the iptable config.

```bash
sudo apt install iptables-persistent
sudo sh -c 'iptables-save > /etc/iptables/rules.v4'
```

### Step 3: Update ZeroTier Network Configuration

In the Ztnet Managed network settings, add `0.0.0.0/0` via your ZeroTier Server node IP address. 


After completing these steps, you'll be able to route your internet traffic through the zerotier client. You can verify this by visiting [https://whatismyipaddress.com/](https://whatismyipaddress.com/) and checking that your IP address matches the IP address of your ZeroTier Server node.

### Example:

All the above commands has been exectued on the `218 PVE VPN passtrough` node in the picture below.

Now every member in this network will be able to route their internet traffic through the "218 PVE VPN passtrough" as long as they have selected "Allow default route override" or on mobile "Route all traffic through Zerotier" in their client settings.


![VPN Passthrough](/img/usage/vpn_passthrough.png)


