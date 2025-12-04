#!/bin/bash

# === SSH Setup for DevContainer ===
# Løser: VS Code Git extension + terminal SSH med passphrase

# Fast socket-path som VS Code kan finne via remoteEnv
SSH_SOCK="/tmp/ssh-agent-vscode.sock"

# --- Kopier SSH-nøkler fra host ---
if [ -d "/tmp/host-ssh" ]; then
    sudo cp -r /tmp/host-ssh /tmp/ssh-copy
    sudo chown -R node:node /tmp/ssh-copy
    mkdir -p ~/.ssh
    cp /tmp/ssh-copy/* ~/.ssh/ 2>/dev/null
    chmod 700 ~/.ssh
    chmod 600 ~/.ssh/id_* 2>/dev/null
    chmod 644 ~/.ssh/*.pub ~/.ssh/known_hosts ~/.ssh/config 2>/dev/null
    rm -rf /tmp/ssh-copy
    echo "✓ SSH-nøkler kopiert"
fi

# --- Start ssh-agent med fast socket ---
# Fjern gammel socket hvis den finnes men agenten er død
if [ -S "$SSH_SOCK" ]; then
    if ! SSH_AUTH_SOCK="$SSH_SOCK" ssh-add -l &>/dev/null; then
        rm -f "$SSH_SOCK"
    fi
fi

# Start ny agent hvis nødvendig
if [ ! -S "$SSH_SOCK" ]; then
    eval $(ssh-agent -a "$SSH_SOCK") > /dev/null
    echo "✓ SSH agent startet på $SSH_SOCK"
else
    export SSH_AUTH_SOCK="$SSH_SOCK"
    echo "✓ SSH agent allerede kjører"
fi

# --- Legg til i .bashrc for terminaler ---
if ! grep -q "SSH_AGENT_VSCODE" ~/.bashrc 2>/dev/null; then
    cat >> ~/.bashrc << 'BASHRC'

# SSH_AGENT_VSCODE
export SSH_AUTH_SOCK="/tmp/ssh-agent-vscode.sock"

# Legg til nøkkel hvis agent kjører men ingen nøkler lastet
if [ -S "$SSH_AUTH_SOCK" ]; then
    if ! ssh-add -l &>/dev/null; then
        echo "Kjør 'ssh-add' for å laste SSH-nøkkel"
    fi
fi
BASHRC
    echo "✓ .bashrc oppdatert"
fi

echo ""
echo "==========================================="
echo "SSH SETUP FERDIG"
echo "==========================================="
echo ""
echo "VIKTIG: Åpne en terminal og kjør:"
echo "  ssh-add ~/.ssh/id_ed25519"
echo ""
echo "Du blir spurt om passphrase ÉN gang."
echo "Etter det fungerer både terminal OG VS Code Git."
echo "==========================================="