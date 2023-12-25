---
id: create_dns_host
title: DNS Host File Generator
slug: /usage/create_dns_host
description: Use the zt2hosts script to automate the conversion of ZTNET API network member data into a hosts file format for efficient local DNS resolution.
---

# Using the ZT2Hosts Script

The `zt2hosts` script is a tool designed to interact with the ZTNET API. It retrieves a list of authorized network members and converts them to a format compatible with the `hosts(5)` file, which is used for local hostname resolution on most Unix-like systems.

## What the Script Does

The script performs the following functions:

1. **Contacting ZTNET API**: It makes requests to the ZTNET API to fetch information about network members.

2. **Parsing Network Member Data**: The script processes the JSON data returned by the API, focusing on authorized members.

3. **Formatting for Hosts File**: It converts the network member data into a format suitable for inclusion in a `hosts` file, providing both IPv4 and IPv6 addresses.

## Prerequisites

Before using the script, ensure you have:

- `curl` and `jq` installed (for API requests and JSON processing) 
```bash	
sudo apt install curl jq
```

## How to Use the Script

1. **Set the API Token**: The script requires a ZTNET API token that can be created in the ZTNET settings. Set this token in an environment variable named `ZTNET_API_TOKEN`.
```bash
export ZTNET_API_TOKEN='your-api-token'
```

2. **Set the API ADDRESS**: The script requires a ZTNET API token that can be created in the ZTNET settings. Set this token in an environment variable named `API_ADDRESS`.
```bash
export API_ADDRESS='domain or ip address of your ztnet server'
# example 1: export API_ADDRESS='https://ztnet.network'
# example 2: export API_ADDRESS='http://localhost:3000'
```


## Obtain the script.
```bash
#!/bin/bash
# zt2hosts: Contact ZTNET API, and convert a list of authorized network members to hosts(5) format

set -eo pipefail

## -----------------------------------------------------------------------------

# Function to check if the zone name is valid
is_valid_zone() {
  if [[ $1 =~ ^([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,6}$ ]]; then
    return 0 
  else
    return 1
  fi
}

[[ -z "$ZTNET_API_TOKEN" ]] && \
  >&2 echo "ERROR: must set ZTNET_API_TOKEN!" && \
  exit 1

[ "$1" = "" ] && \
  >&2 echo "ERROR: must provide at least one network ID!" && \
  exit 1

## -----------------------------------------------------------------------------
API_ADDRESS=${API_ADDRESS:-"http://localhost:3000"}
API_URL="${API_ADDRESS}/api/v1"
AUTH_HEADER="x-ztnet-auth: ${ZTNET_API_TOKEN}"

## -----------------------------------------------------------------------------
get_network_info() { curl -sH "${AUTH_HEADER}" "$API_URL/network/${1}/"; }
get_network_members() { curl -sH "${AUTH_HEADER}" "${API_URL}/network/${1}/member/"; }

print_ipv6_id() {
  printf "%s:%s:%s" \
    $(echo "$1" | cut -c1-2) \
    $(echo "$1" | cut -c3-6) \
    $(echo "$1" | cut -c7-10)
}

print_rfc4193() {
  printf "fd%s:%s:%s:%s:%s99:93%s" \
    $(echo "$2" | cut -c1-2) \
    $(echo "$2" | cut -c3-6) \
    $(echo "$2" | cut -c7-10) \
    $(echo "$2" | cut -c11-14) \
    $(echo "$2" | cut -c15-16) \
    $(print_ipv6_id "$1")
}

print_6plane() {
  local TOP=${2:0:8}
  local BOT=${2:9:16}
  local hashed=$(printf '%x\n' "$(( 0x$TOP ^ 0x$BOT ))")

  printf "fc%s:%s:%s%s:0000:0000:0001" \
    $(echo "$hashed" | cut -c1-2) \
    $(echo "$hashed" | cut -c3-6) \
    $(echo "$hashed" | cut -c7-8) \
    $(print_ipv6_id "$1")
}

## -----------------------------------------------------------------------------
ipv4_lines=("127.0.0.1 localhost")
ipv6_lines=("::1 localhost ip6-localhost ip6-loopback")

for NETWORK in $@; do
  mapfile -td \: FIELDS < <(printf "%s\0" "$NETWORK")
  DNSNAME="${FIELDS[0]}"
  NETWORK="${FIELDS[1]}"

  # Check if the zone name is valid
  if [ -n "$DNSNAME" ] && ! is_valid_zone "$DNSNAME"; then
    >&2 echo "ERROR: Invalid domain name '$DNSNAME'"
    exit 1
  fi

  netmembers=$(get_network_members "$NETWORK")
  netinfo=$(get_network_info "$NETWORK")
  
  # check if "error" is in the response
  if [[ "$netinfo" == *"error"* ]]; then
    >&2 echo "ERROR GET Network: $netinfo"
    exit 1
  fi
  
  # check if "error" is in the response
  if [[ "$netmembers" == *"error"* ]]; then
    >&2 echo "ERROR GET Network Members: $netmembers"
    exit 1
  fi

joined=$(echo "$netmembers" | \
  jq '.[] | select(.authorized == true) | 
      { name: (.name | gsub(" "; "_")), id: .id, ips: .ipAssignments }')

  v6conf=$(echo "$netinfo" | jq -c '.v6AssignMode')
  sixplane=$(echo "$v6conf" | jq -r '.["6plane"]')
  rfc4193=$(echo "$v6conf" | jq -r '.rfc4193')

  for entry in $(echo "$joined" | jq -c '.'); do
    nodeid=$(echo "$entry" | jq -r '.id')
    nodename=$(echo "$entry" | jq -r '.name')

    for ipv4_address in $(echo "$entry" | jq -r '.ips[]'); do
      line=$(printf "%s\t%s\t%s" \
        "$ipv4_address" \
        "$nodename.$DNSNAME" \
        "$nodeid.$DNSNAME")

      ipv4_lines+=("$line")
    done
  done

  for entry in $(echo "$joined" | jq -c '.'); do
    nodeid=$(echo "$entry" | jq -r '.id')

    if [ "$rfc4193" = "true" ]; then
      line=$(printf "%s\t%s.%s\t%s" \
        $(print_rfc4193 "$nodeid" "$NETWORK") \
        $(echo "$entry" | jq -r '.name') \
        "$DNSNAME" \
        "$nodeid.$DNSNAME")
      ipv6_lines+=("$line")
    fi

    if [ "$sixplane" = "true" ]; then
      line=$(printf "%s\t%s.%s\t%s" \
        $(print_6plane "$nodeid" "$NETWORK") \
        $(echo "$entry" | jq -r '.name') \
        "$DNSNAME" \
        "$nodeid.$DNSNAME")
      ipv6_lines+=("$line")
    fi
  done
done

## -----------------------------------------------------------------------------

(
  for x in "${ipv4_lines[@]}"; do printf "%s\n" "$x"; done
  for x in "${ipv6_lines[@]}"; do printf "%s\n" "$x"; done
) | column -t
```

## Make it executable
```bash
chmod +x zt2hosts.sh
```

## Run the script
```bash
./zt2hosts.sh <ZONE>:<NETWORK_ID>
```

## Example output
```bash
./zt2hosts.sh ztnet.network:8056c2e21c000001
```

```bash
127.0.0.1                                localhost                                            
::1                                      localhost               ip6-localhost                ip6-loopback
172.25.25.31                             awesome_user.ztnet.network  efcc1b0947.ztnet.network  
fd17:d395:d8cb:43a8:1899:93ef:cc1b:0947  awesome_user.ztnet.network  efcc1b0947.ztnet.network  
fc1c:903d:c0ef:cc1b:0947:0000:0000:0001  awesome_user.ztnet.network  efcc1b0947.ztnet.network
```

## Backup your hosts file
```bash
sudo cp /etc/hosts /etc/hosts.bak
```

## Add the output to your hosts file
```bash
./zt2hosts.sh ztnet.network:8056c2e21c000001 | sudo tee -i /etc/hosts
```

## Test it out
```bash
ping awesome_user.ztnet.network
```
