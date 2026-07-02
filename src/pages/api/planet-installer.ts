import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "~/server/db";

/**
 * Serves a cross-platform installer script that mirrors the official ZeroTier
 * install flow and adds a single extra step: download this controller's custom
 * planet and drop it into the ZeroTier data directory, then restart the service.
 *
 * Usage:
 *   Linux / macOS / ARM / soft-router:
 *     curl -fsSL https://<host>/api/planet-installer | sudo sh
 *   Windows (PowerShell as Administrator):
 *     irm https://<host>/api/planet-installer?platform=windows | iex
 *
 * The script contains no secrets. If planet download is protected
 * (planetDownloadAuthMode = REST_API), set ZTNET_TOKEN before running.
 */

function getBaseUrl(req: NextApiRequest): string {
	// Prefer the configured public URL. The generated commands are meant to be
	// run on OTHER machines, so the request host (which may be localhost or an
	// internal IP when an admin opens the panel) is unreliable. Fall back to the
	// forwarded/request host only when NEXTAUTH_URL is not set.
	const configured = process.env.NEXTAUTH_URL?.trim().replace(/\/+$/, "");
	if (configured) return configured;

	const forwardedProto = (req.headers["x-forwarded-proto"] as string | undefined)
		?.split(",")[0]
		?.trim();
	const forwardedHost = (req.headers["x-forwarded-host"] as string | undefined)
		?.split(",")[0]
		?.trim();
	const proto = forwardedProto || "http";
	const host = forwardedHost || req.headers.host || "localhost:3000";
	return `${proto}://${host}`;
}

function unixScript(planetUrl: string, downloadToken: string | null): string {
	return `#!/bin/sh
# ztnet custom planet installer
# Mirrors the official ZeroTier installer, then replaces the planet file with
# this controller's custom planet and restarts the service.
#
# Run as root:   curl -fsSL ${planetUrl.replace(/\/api\/planet$/, "/api/planet-installer")} | sudo sh
${downloadToken ? "# This installer already includes this controller's planet download key.\n" : ""}set -e

PLANET_URL="${planetUrl}"
ZTNET_TOKEN="${downloadToken ?? ""}"

log() { printf '\\033[0;36m[ztnet]\\033[0m %s\\n' "$1"; }
err() { printf '\\033[0;31m[ztnet] %s\\033[0m\\n' "$1" >&2; }

if [ "$(id -u)" -ne 0 ]; then
  err "Please run as root (e.g. with sudo)."
  exit 1
fi

# 1) Install ZeroTier if it is not present.
if command -v zerotier-cli >/dev/null 2>&1; then
  log "ZeroTier already installed: $(zerotier-cli -v 2>/dev/null || echo unknown)"
else
  log "Installing ZeroTier..."
  if command -v opkg >/dev/null 2>&1; then
    opkg update && opkg install zerotier            # OpenWRT / soft router
  elif command -v curl >/dev/null 2>&1; then
    curl -s https://install.zerotier.com | bash     # official (Linux / macOS)
  elif command -v wget >/dev/null 2>&1; then
    wget -qO- https://install.zerotier.com | bash
  else
    err "Need curl or wget to install ZeroTier."; exit 1
  fi
fi

# 2) Locate the ZeroTier data directory.
ZT_DIR=""
for d in /var/lib/zerotier-one "/Library/Application Support/ZeroTier/One" /etc/zerotier-one /usr/local/var/lib/zerotier-one; do
  if [ -d "$d" ]; then ZT_DIR="$d"; break; fi
done
if [ -z "$ZT_DIR" ]; then err "ZeroTier data directory not found."; exit 1; fi
log "Data directory: $ZT_DIR"

# 3) Download the custom planet.
TMP="$(mktemp 2>/dev/null || echo /tmp/ztnet-planet.$$)"
if [ -n "$ZTNET_TOKEN" ]; then
  log "Downloading custom planet (with access key)..."
else
  log "Downloading custom planet..."
fi
if command -v curl >/dev/null 2>&1; then
  if [ -n "$ZTNET_TOKEN" ]; then
    curl -fsSL -H "x-ztnet-auth: $ZTNET_TOKEN" "$PLANET_URL" -o "$TMP"
  else
    curl -fsSL "$PLANET_URL" -o "$TMP"
  fi
elif command -v wget >/dev/null 2>&1; then
  if [ -n "$ZTNET_TOKEN" ]; then
    wget -qO "$TMP" --header="x-ztnet-auth: $ZTNET_TOKEN" "$PLANET_URL"
  else
    wget -qO "$TMP" "$PLANET_URL"
  fi
else
  err "Need curl or wget to download the planet."; exit 1
fi
if [ ! -s "$TMP" ]; then
  err "Downloaded planet is empty. If downloads are token-protected, set ZTNET_TOKEN."
  rm -f "$TMP"; exit 1
fi

# 4) Back up the existing planet and replace it.
if [ -f "$ZT_DIR/planet" ]; then
  cp "$ZT_DIR/planet" "$ZT_DIR/planet.bak.$(date +%s 2>/dev/null || echo old)" 2>/dev/null || true
fi
cp "$TMP" "$ZT_DIR/planet"
rm -f "$TMP"
log "Custom planet installed."

# 5) Restart ZeroTier so it loads the new planet (planet is only read at start).
log "Restarting ZeroTier..."
if command -v systemctl >/dev/null 2>&1; then
  systemctl restart zerotier-one 2>/dev/null || systemctl restart zerotier 2>/dev/null || true
elif [ -x /etc/init.d/zerotier ]; then
  /etc/init.d/zerotier restart
elif [ -x /etc/init.d/zerotier-one ]; then
  /etc/init.d/zerotier-one restart
elif command -v service >/dev/null 2>&1; then
  service zerotier-one restart 2>/dev/null || true
elif command -v launchctl >/dev/null 2>&1; then
  launchctl kickstart -k system/com.zerotier.one 2>/dev/null || true
else
  err "Could not detect init system. Restart ZeroTier manually."
fi

log "Done. Verify with:  zerotier-cli listpeers | grep PLANET"
`;
}

function windowsScript(planetUrl: string, downloadToken: string | null): string {
	return `# ztnet custom planet installer (Windows)
# Run in an elevated PowerShell:
#   irm ${planetUrl.replace(/\/api\/planet$/, "/api/planet-installer")}?platform=windows | iex
${downloadToken ? "# This installer already includes this controller's planet download key.\n" : ""}$ErrorActionPreference = "Stop"

$PlanetUrl = "${planetUrl}"
$ZtnetToken = "${downloadToken ?? ""}"
$ZtDir = Join-Path $env:ProgramData "ZeroTier\\One"

function Log($m) { Write-Host "[ztnet] $m" -ForegroundColor Cyan }

# Require admin.
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) { Write-Error "Please run PowerShell as Administrator."; return }

# 1) Install ZeroTier if the service is missing.
if (-not (Get-Service -Name "ZeroTierOneService" -ErrorAction SilentlyContinue)) {
  Log "Installing ZeroTier..."
  $msi = Join-Path $env:TEMP "ZeroTierOne.msi"
  Invoke-WebRequest "https://download.zerotier.com/dist/ZeroTier%20One.msi" -OutFile $msi
  Start-Process msiexec.exe -ArgumentList "/i \`"$msi\`" /qn /norestart" -Wait
} else {
  Log "ZeroTier already installed."
}

if (-not (Test-Path $ZtDir)) { Write-Error "ZeroTier data directory not found: $ZtDir"; return }

# 2) Download the custom planet.
if ($ZtnetToken) { Log "Downloading custom planet (with access key)..." } else { Log "Downloading custom planet..." }
$tmp = Join-Path $env:TEMP "ztnet-planet"
$headers = @{}
if ($ZtnetToken) { $headers["x-ztnet-auth"] = $ZtnetToken }
Invoke-WebRequest $PlanetUrl -OutFile $tmp -Headers $headers
if ((Get-Item $tmp).Length -eq 0) { Write-Error "Downloaded planet is empty. Set \`$env:ZTNET_TOKEN if downloads are token-protected."; return }

# 3) Stop service, back up, replace planet, start service.
Log "Replacing planet and restarting service..."
Stop-Service "ZeroTierOneService" -Force -ErrorAction SilentlyContinue
$planet = Join-Path $ZtDir "planet"
if (Test-Path $planet) { Copy-Item $planet "$planet.bak" -Force }
Copy-Item $tmp $planet -Force
Remove-Item $tmp -Force -ErrorAction SilentlyContinue
Start-Service "ZeroTierOneService"

Log "Done. Verify with:  zerotier-cli listpeers | Select-String PLANET"
`;
}

export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse,
) {
	if (req.method !== "GET") {
		res.setHeader("Allow", "GET");
		return res.status(405).send("Method Not Allowed");
	}

	let downloadToken: string | null = null;
	try {
		const options = await prisma.globalOptions.findFirst({
			where: { id: 1 },
			select: { planetDownloadAuthMode: true, planetDownloadToken: true },
		});
		// Only embed the token when protection is actually enabled.
		if (options?.planetDownloadAuthMode === "REST_API") {
			downloadToken = options.planetDownloadToken ?? null;
		}
	} catch {
		// If the lookup fails, generate a public (unauthenticated) script.
		downloadToken = null;
	}

	const planetUrl = `${getBaseUrl(req)}/api/planet`;
	const platform = (
		Array.isArray(req.query.platform) ? req.query.platform[0] : req.query.platform
	)?.toLowerCase();

	const isWindows =
		platform === "windows" ||
		platform === "win" ||
		/powershell|windows/i.test(req.headers["user-agent"] || "");

	const body = isWindows
		? windowsScript(planetUrl, downloadToken)
		: unixScript(planetUrl, downloadToken);

	res.setHeader("Content-Type", "text/plain; charset=utf-8");
	res.setHeader("Cache-Control", "no-store");
	return res.status(200).send(body);
}
