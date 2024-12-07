---
id: migrate
title: Transitioning from Other ZeroTier Web UIs to ZTNET
slug: /usage/migrate
description: Migrate from other ZeroTier applications to ZTNET
---

# Migration Guide to ZTNET

This guide provides step-by-step instructions to help you migrate from other ZeroTier web UIs to ZTNET. 

:::warning IMPORTANT
  It is important to note that merging two ZeroTier instances is not possible, as they are fundamentally separate entities.  
  However, you can configure ZTNET to manage a different ZeroTier instance than the default one.
:::

## Scenario 1: Connecting Locally Installed ZeroTier to ZTNET Docker Installation

If you have ZeroTier installed locally using the official ZeroTier installation instructions, and your ZeroTier data is available at `/var/lib/zerotier-one` on your host, follow these steps to move your networks to ZTNET in a Docker environment:

### Step 1: Modify `docker-compose.yml` for ztnet Installation

First, stop the running Docker services by navigating to the directory containing your `docker-compose.yml` file and running:

```sh
docker-compose down
```

Next, modify your `docker-compose.yml` file as follows:

- Comment out the `zerotier` service section, as ZTNET will use the local ZeroTier installation.
- Comment out `zerotier` in the `depends_on` section of the `ztnet` service.
- Update the `volumes` section of the `ztnet` service to mount the local ZeroTier data directory to the ZTNET container.

**Example:**  
Only the relevant sections are shown below. The full `docker-compose.yml` file should contain additional services and configurations.
```yaml
services:
  # zerotier:
  #   image: zyclonite/zerotier:1.14.2
  #   hostname: zerotier
  #   container_name: zerotier
  #   restart: unless-stopped
  #   volumes:
  #     - zerotier:/var/lib/zerotier-one
  #   cap_add:
  #     - NET_ADMIN
  #     - SYS_ADMIN
  #   devices:
  #     - /dev/net/tun:/dev/net/tun
  #   networks:
  #     - app-network
  #   ports:
  #     - "9993:9993/udp"
  #   environment:
  #     - ZT_OVERRIDE_LOCAL_CONF=true
  #     - ZT_ALLOW_MANAGEMENT_FROM=172.31.255.0/29

  ztnet:
    ...
    volumes:
      # - zerotier:/var/lib/zerotier-one
      - /var/lib/zerotier-one:/var/lib/zerotier-one
    depends_on:
      # - zerotier
```


### Step 2: Configure ZeroTier

To allow ZTNET to manage your local ZeroTier instance, add the following configuration to your `local.conf` file located in `/var/lib/zerotier-one`:

:::info INFO
Create the `local.conf` file if it does not exist.
:::
```json
{
  "settings": {
    "allowManagementFrom": ["0.0.0.0/0"]
  }
}
```
After updating `local.conf`, restart the ZeroTier service:

```sh
sudo systemctl restart zerotier-one
```

### Step 3: Start the Services

In your terminal, navigate to the directory containing your `docker-compose.yml` file and run the following command to start the services:

```sh
docker-compose up -d
```

### Step 4: Configure ZTNET to Use Local ZeroTier

To point ZTNET to use the local ZeroTier controller instead of the previously commented-out ZeroTier container, follow these steps:

1. Go to the ZTNET web interface.
2. Navigate to the Admin => Controller page.
3. Add `http://server_ip:9993` to the ZeroTier API URL field.
4. Click save.

You should now be able to manage your ZeroTier network from the ZTNET web interface.


**Example**, where 10.0.0.32 is the IP address of the host server:
![zerotier api url](/img/admin/controller/zerotier_api_url.png)

### Step 5: Migrate Networks

In the Admin => Controller page, a new table will appear displaying all the "unlinked" networks, but only if there are networks present on the local controller. 

ZTNET stores the user ID for all networks created in PostgreSQL. If a network was created outside of ZTNET, it will be considered "unlinked." To manage these networks within ZTNET, you need to assign them to a user.

Select a user from the dropdown menu to link the network to the chosen user. This will integrate the network into ZTNET, allowing for seamless management through the ZTNET interface.

**Example:**  
![zerotier api url](/img/admin/controller/unlinked_networks.png)


## Scenario 2: 
To be continued...