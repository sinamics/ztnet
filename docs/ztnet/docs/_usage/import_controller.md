# Migrate Controller
## How to Migrate an Established ZeroTier Controller into ZTNET

To move an already established ZeroTier controller into a Docker container, you can follow these steps. This guide assumes you have Docker set up on the machine where the new controller will reside.

### Prerequisites
- Ensure Docker is installed and running.
- Stop the ZeroTier service on the source controller to prevent data inconsistencies.

### Steps

1. **Stop the ZeroTier Service on the Source Machine**  
   Depending on your OS, use the relevant command to stop the ZeroTier service.
    ```bash
    sudo systemctl stop zerotier-one  # For systemd-based Linux distributions
    ```
    Or for other systems:
    ```bash
    sudo service zerotier-one stop  # For SysVinit or Upstart
    ```

2. **Locate the ZeroTier Configuration Folder**  
   The configuration folder is typically `/var/lib/zerotier-one` on Linux systems.

3. **Backup Configuration**  
   Create a backup just to be safe.
    ```bash
    sudo cp -r /var/lib/zerotier-one /path/to/backup/folder
    ```

4. **Copy Configuration to Docker Volume**  
   Copy the configuration files to the Docker volume specified in your Docker Compose file. Replace `zerotier:/var/lib/zerotier-one` with the actual volume name and path.
    ```bash
    sudo cp -r /var/lib/zerotier-one /path/to/docker/volume
    ```

5. **Start the Docker Container**  
   Use Docker Compose to start your new ZeroTier controller. Navigate to the directory where your `docker-compose.yml` file is located.
    ```bash
    docker-compose up -d
    ```

6. **Verify the Controller**  
   Verify that the new Dockerized ZeroTier controller has all the networks and members from the source controller.
