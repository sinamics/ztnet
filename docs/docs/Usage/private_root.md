---
id: private_root
title: Private Root Servers with ZTNet
slug: /usage/private_root
description: Learn how to create and manage private root servers with ZTNet.
---

# Managing Private Root Servers with ZTNet

### What is a Private Root Server?

A private root server in ZeroTier acts as a central coordination point for a ZeroTier network. Unlike [public root servers](https://zerotier.atlassian.net/wiki/spaces/SD/pages/7241732/Root+Server+IP+Addresses) provided by ZeroTier, private root servers are self-hosted and managed by the network administrator. They play a crucial role in network management, node authentication, and route orchestration.

### Functions of a Private Root Server

- **Network Coordination**: It coordinates network activities and manages connections between nodes.
- **Security and Privacy**: Offers enhanced security and privacy as the server is under your control, reducing reliance on external or public infrastructure.
- **Customization and Control**: Allows for greater customization of network behavior and policies.
- **Improved Performance**: Can potentially offer improved performance, especially if located geographically closer to the majority of the nodes.

### When to Use a Private Root Server

- **Enhanced Security Requirements**: Ideal for organizations with strict security and data privacy requirements.
- **Large-scale Networks**: Beneficial for managing large-scale or enterprise-level networks where control over all network components is essential.
- **Geographic Considerations**: When network nodes are concentrated in a specific geographical area, a private root server in the same region can reduce latency.


## Verifying Public Root Servers

To check the current root servers associated with your ZTNET network:

- Access the server where ZTNet is running using a terminal.
- Execute the command `zerotier-cli listpeers | grep PLANET` to list all peers and root servers. If you are using Docker, you can use the command `docker exec zerotier zerotier-cli listpeers | grep PLANET`.
- Note the entries with the role 'PLANET', which are the [zerotier public root servers](https://zerotier.atlassian.net/wiki/spaces/SD/pages/7241732/Root+Server+IP+Addresses).

Example output indicating public root servers:
```
200 listpeers <ztaddr> <path> <latency> <version> <role>
200 listpeers 62f865ae71 50.7.252.138/9993;101694;101510 184 - PLANET
200 listpeers 778cde7190 103.195.103.66/9993;-1;101558 136 - PLANET
200 listpeers cafe04eba9 84.17.53.155/9993;1582;101643 51 - PLANET
200 listpeers cafe9efeb9 104.194.8.134/9993;-1;101519 175 - PLANET
```
## Creating a Private Root Server with ZTNet

### Steps to Create a Private Root

1. Access the ZTNet web UI and navigate to the Admin - ZT Controller page.
2. Click the `Generate Planet` button to open the planet generation form.
3. External IP should be automatically populated. If not, enter the external IP address and port `<IP>:<PORT>` of the server where ZTNet is running.
    -  If you're deploying these for use at a physical location, use internal IPs.
4. Optionally add an identity comment for administrative purposes.
5. Click on the `CREATE PLANET` button to initialize the creation of your private root server.
6. After creation, restart zerotier to apply the changes:
   - For Docker users: `docker restart zerotier`.
   - For standalone users: `sudo systemctl restart zerotier-one`.

### Verifying Private Root Server Creation
Now, if you type `docker exec zerotier zerotier-cli listpeers | grep PLANET` again, all the public root servers should be gone.

### Downloading Configuration Files

1. Click on `DOWNLOAD CONFIG` to get your configuration files.
2. The downloaded archive will contain `mkworld.config.json`, `planet.custom`, `current.c25519`, and `previous.c25519`.

### Example `mkworld.config.json`

```json
{
  "rootNodes": [
    {
      "comments": "default.domain",
      "identity": "1234b056ca:0:94b06bbbe254...",
      "endpoints": ["11.22.33.444/9993"]
    }
  ],
  "signing": ["previous.c25519", "current.c25519"],
  "output": "planet.custom",
  "plID": 957052816,
  "plBirth": 1703590007112,
  "plRecommend": true
}
```

## Configuring Devices with the New `planet` File

To connect your devices to the newly established private root server, they need to be configured with the `planet.custom` file that was generated during the creation process. This file provides the necessary information for connecting to your private root instead of the default public servers. Follow these steps to update each device:

1. **Rename `planet.custom`**: Change the file name from `planet.custom` to `planet` to match ZeroTier's expected configuration file name.

2. **Distribute the New `planet` File**: You need to distribute this new `planet` file to each device on your network, replacing the existing one.

   - **Windows**:
     - Access the ZeroTier configuration folder located at `%PROGRAMDATA%\ZeroTier\One\`.

   - **Linux**:
     - The corresponding folder on Linux systems is typically `/var/lib/zerotier-one/`.

    - Backup the existing `planet` file by renaming it to `planet.bak`.
    - Overwrite the existing `planet` file with the new one you've renamed from `planet.custom`.

3. **Restart ZeroTier Service**: After updating the file, restart the ZeroTier service on each device to make sure the changes are applied.

   - **Windows**: Restart the service through the Services management console or by using the PowerShell command `Restart-Service ZeroTierOne`.
   - **Linux**: Use `sudo systemctl restart zerotier-one` or the appropriate command for your init system.

4. **Downloading the `planet` File Conveniently**:
   - For added convenience, Ztnet has a api endpoint for downloading the `planet` file. `https://ztnet_domain/api/planet`

By implementing these steps, your network devices will use your private root server, ensuring that they are no longer connected to the public ZeroTier root servers. Confirm the success of your setup by checking that devices can communicate with each other through the private root and that the public root servers no longer appear in the peer list.

## Adding a Second Private Root Server in ZeroTier

To add a second private root server to your ZeroTier network, follow these steps:

1. **Install ZeroTier-One on a New Server**:
   - Set up ZeroTier-One on a separate server to serve as your second private root.
   - Ensure it has a static public IP.
   - Add port `9993/udp` to the server's firewall.

2. **Obtain the Identity of the Second Server**:
   - The identity of the ZeroTier server is stored in a file on the server itself.
   - On the new root server, locate the identity file, typically found at `/var/lib/zerotier-one/identity.public` on Linux systems.
   - Read the contents of this file to find the server's identity.

3. **Download and Unzip the Current Configuration from ZTNet**:
   - Download the current configuration as a ZIP file from ZTNet.
   - Unzip this file to access the `mkworld.config.json`.

4. **Update `mkworld.config.json` with Second Server Information**:
   - Edit `mkworld.config.json` to include the identity and IP address of the second root server in the `rootNodes` section.

Example `mkworld.config.json` for Two Roots:
```json
{
  "rootNodes": [
    {
      "identity": "[identity_of_first_root]",
      "endpoints": ["[ip_of_first_root]/[port]"]
    },
    {
      "identity": "[identity_of_second_root]",
      "endpoints": ["[ip_of_second_root]/[port]"]
    }
  ],
  ...
}
```

5. **Rezip and Upload the Configuration to ZTNet**:
   - Rezip the updated `mkworld.config.json` with the other original files into a ZIP archive.
   - In ZTNet, use the 'Restore Original Planet' to remove the current config.
   - Now, Upload the new ZIP file.

6. **Download, Rename, and Distribute the Updated `planet.custom` File**:
   - After ZTNet processes the upload, download the new `planet.custom` file.
   - Rename this file to `planet` and distribute it to each client device in your network.

7. **Restart ZeroTier Services on Client Devices**:
   - Restart the ZeroTier-One service on each client device to apply the new configuration.

8. **Verify the Configuration**:
   - Use `zerotier-cli listpeers` on client devices to check for the presence of both private root servers.
   - Ensure no public root servers are listed, confirming the network is using only your private roots.

This process ensures your ZeroTier network operates with two private root servers, improving redundancy and control.


## Important Notes

- Proceed with caution when updating the planet file as it will modify the core structure of your ZeroTier network.
- Ensure the endpoints specified in the `mkworld.config.json` are globally reachable unless you are using the private root server for a local network.
- After setting up a private root server, verify its functionality by checking for the presence of private peers and the absence of public root servers.

