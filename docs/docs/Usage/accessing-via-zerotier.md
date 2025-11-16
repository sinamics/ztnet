---
id: accessing-via-zerotier
title: Accessing ZTNET via ZeroTier Network
slug: /usage/accessing-via-zerotier
description: Configure ZTNET to be accessible through ZeroTier network
sidebar_position: 6
---

# Accessing ZTNET via ZeroTier Network

By default, the ZTNET web interface is not accessible via ZeroTier network IPs when running in Docker. This is due to Docker's isolated bridge network preventing routing between the ZeroTier virtual network and the container network.

This guide provides solutions to access your ZTNET web interface (port 3000) using ZeroTier-assigned IP addresses.

## Option 1: Host Network Mode (Recommended)

This solution configures the ZeroTier container to use the host's network stack directly.

### Step 1: Modify docker-compose.yml

Edit your `docker-compose.yml` file and update the `zerotier` service. Remove `networks` and `ports` sections, and add `network_mode: "host"`:

```yaml
zerotier:
  image: zyclonite/zerotier:1.14.2
  hostname: zerotier
  container_name: zerotier
  restart: unless-stopped
  network_mode: "host"  # Add this line
  volumes:
    - zerotier:/var/lib/zerotier-one
  cap_add:
    - NET_ADMIN
    - SYS_ADMIN
  devices:
    - /dev/net/tun:/dev/net/tun
  # Remove 'networks' section - incompatible with host mode
  # Remove 'ports' section - not needed with host mode
  environment:
    - ZT_OVERRIDE_LOCAL_CONF=true
    - ZT_ALLOW_MANAGEMENT_FROM=0.0.0.0/0
```

### Step 2: Update ZTNET Environment Variables

In the `ztnet` service section, update the `ZT_ADDR` to point to your host machine's IP, and update `NEXTAUTH_URL` to use your ZeroTier-assigned IP:

```yaml
ztnet:
  # ... other configuration
  environment:
    - ZT_ADDR=http://192.168.1.100:9993  # Replace with your host IP
    - NEXTAUTH_URL=http://10.147.20.1:3000  # Replace with your ZeroTier-assigned IP
    # ... other environment variables
```

:::note
The `NEXTAUTH_URL` should be set to the ZeroTier IP address you'll use to access ZTNET. You can find this IP after the host joins the ZeroTier network.
:::

### Step 3: Restart Containers

```bash
docker-compose down
docker-compose up -d
```

After the ZeroTier container joins its own network, you can access ZTNET at `http://<zerotier-ip>:3000`.

---

## Option 2: Host-Based ZeroTier Installation

This solution runs ZeroTier directly on your host system instead of in a container.

:::warning Port Conflict
You cannot run ZeroTier on the host and in Docker simultaneously, as both use port 9993.
:::

### Step 1: Comment Out ZeroTier Service

In your `docker-compose.yml`, comment out or remove the entire `zerotier` service.

### Step 2: Install ZeroTier on Host

Install ZeroTier One on your host system:

```bash
curl -s https://install.zerotier.com | sudo bash
```

### Step 3: Configure Management Access

Edit `/var/lib/zerotier-one/local.conf` to allow remote management:

```json
{
  "settings": {
    "allowManagementFrom": ["0.0.0.0/0"]
  }
}
```

:::warning Security Consideration
The `0.0.0.0/0` setting allows management from any IP. For production environments, consider restricting this to specific IP ranges.
:::

### Step 4: Restart ZeroTier

```bash
sudo systemctl restart zerotier-one
```

### Step 5: Update ZTNET Configuration

In your `docker-compose.yml`, update the `ztnet` service:

```yaml
ztnet:
  # ... other configuration
  environment:
    - ZT_ADDR=http://192.168.1.100:9993  # Replace with your host IP
    - NEXTAUTH_URL=http://10.147.20.1:3000  # Replace with your ZeroTier-assigned IP
    # ... other environment variables
```

### Step 6: Restart ZTNET

```bash
docker-compose restart ztnet
```

---

## Verification

To verify the setup is working:

1. Join your ZeroTier container/host to your ZeroTier network
2. Authorize the member in ZTNET
3. Access ZTNET using the ZeroTier-assigned IP: `http://<zerotier-ip>:3000`

## Related Resources

- [Docker Compose Installation](/docs/Installation/docker-compose)
- [Environment Variables](/docs/Installation/options#zerotier-controller-configuration)
- [GitHub Issue #249](https://github.com/sinamics/ztnet/issues/249)
