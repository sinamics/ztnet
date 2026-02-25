---
sidebar_position: 1
---

# Community Tools

A collection of third-party tools built by the community to extend and integrate with ZTNet.

:::note
These tools are developed and maintained by community members independently from the ZTNet project.
:::

## CLI Tools

### ztnet-cli

A command-line interface for managing ZTNet, built in Rust.

- **Repository:** [github.com/JKamsker/ztnet-cli](https://github.com/JKamsker/ztnet-cli)
- **Install:** `cargo install ztnet` or `npm install -g ztnet-cli`

**Features:**
- **Full REST API coverage** — networks, members, orgs, stats, planet files
- **Named profiles** — switch between multiple ZTNet instances with `auth profiles use`
- **Host-bound credentials** — stored tokens/sessions are only used for their configured host
- **Smart name resolution** — reference networks and orgs by name, not just ID
- **Flexible output** — table, JSON, YAML, or raw for scripting
- **Hosts file export** — generate `/etc/hosts` entries from network members
- **Raw API escape hatch** — call any endpoint with `api get /api/v1/...`
- **Dry-run mode** — preview HTTP requests without sending them
- **Automatic retries** — exponential backoff on transient errors and rate limits
- **Shell completions** — bash, zsh, fish, PowerShell, elvish
