---
id: reverse-proxy
title: Reverse Proxy (WebSocket)
slug: /installation/reverse-proxy
description: Forward WebSocket connections so ZTNET live updates work behind a reverse proxy.
sidebar_position: 5
---

# Reverse Proxy

ZTNET pushes live updates (member status, network changes) to the browser over a **WebSocket** (Socket.IO, served on `/socket.io/`). Behind a reverse proxy, that connection only works if the proxy forwards the **WebSocket upgrade**. If it doesn't, the UI still works but falls back to a slower 60‑second refresh.

## Verify

Open DevTools → Network → **WS**, then reload a network page. You should see a `/socket.io/?...` connection switch to **101 Switching Protocols**. If it stays on polling or errors with `wss://… can't connect`, the proxy isn't forwarding the upgrade.

## Configuration

Replace `127.0.0.1:3000` with wherever ZTNET listens.

### nginx

```nginx
location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
}
```

### Apache

Enable the modules, then add the rewrite to your vhost:

```bash
a2enmod proxy proxy_http proxy_wstunnel rewrite
```

```apache
ProxyPreserveHost On

# Tunnel the WebSocket upgrade to the ws:// backend
RewriteEngine On
RewriteCond %{HTTP:Upgrade} =websocket [NC]
RewriteRule ^/?(.*) "ws://127.0.0.1:3000/$1" [P,L]

# Everything else over normal HTTP
ProxyPass        /  http://127.0.0.1:3000/
ProxyPassReverse /  http://127.0.0.1:3000/
```

### Caddy & Traefik

Both forward WebSockets automatically — no extra configuration needed.

```
your.domain {
    reverse_proxy 127.0.0.1:3000
}
```
