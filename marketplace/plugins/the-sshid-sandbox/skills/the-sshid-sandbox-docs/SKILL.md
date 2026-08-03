---
name: the-sshid-sandbox-docs
description: Provision Termius SSH ID public keys and run isolated sandbox commands on own PC over SSH. Public keys only; Docker/Podman primary isolation. Use for local remote sandbox or Termius-backed agent execution.
---

# the-sshid-sandbox

**Security gates (mandatory):**
- Termius SSH ID is used ONLY for public-key provisioning on the target host via https://sshid.io/<HANDLE>. Never export, store, or use private keys.
- Agent-side authentication is independent: generate a dedicated ed25519 keypair, use ssh-agent, or run locally.
- Isolation primary: Docker or Podman with `--network none --rm`. Fallback restricted user only if containers unavailable.
- Never unrestricted shell for agents. Always ForceCommand, container wrapper, or equivalent.
- If host is behind NAT/home network: establish reverse tunnel first (cloudflared, ngrok, etc.).

Godspeed is inherited. Name the axes. Iterate cheap in parallel. Keep only moves that improve any axis and harm none.

## 1. Host-side provision (run on the PC)

```bash
export SSHID_HANDLE=yourhandle   # replace with your Termius SSH ID handle
export SANDBOX_USER=sandbox-agent
sudo useradd -m -s /usr/sbin/nologin "$SANDBOX_USER" 2>/dev/null || true
sudo mkdir -p /home/"$SANDBOX_USER"/.ssh /home/"$SANDBOX_USER"/runs
curl -fsSL "https://sshid.io/${SSHID_HANDLE}" | sudo tee -a /home/"$SANDBOX_USER"/.ssh/authorized_keys
sudo chmod 700 /home/"$SANDBOX_USER"/.ssh
sudo chmod 600 /home/"$SANDBOX_USER"/.ssh/authorized_keys
sudo chown -R "$SANDBOX_USER":"$SANDBOX_USER" /home/"$SANDBOX_USER"
```

Optional key type: `https://sshid.io/${SSHID_HANDLE}/ED25519` or `/RSA`.

## 2. Docker/Podman primary run wrapper (preferred)

Create a host wrapper (example):

```bash
sudo tee /usr/local/bin/sshid-sandbox-run >/dev/null <<'EOF'
#!/bin/sh
SANDBOX_DIR=/home/sandbox-agent/runs
CMD="$*"
exec docker run --rm -i --network none \
  -v "$SANDBOX_DIR":/work -w /work \
  --user "$(id -u sandbox-agent):$(id -g sandbox-agent)" \
  alpine:latest sh -c "$CMD"
EOF
sudo chmod +x /usr/local/bin/sshid-sandbox-run
```

Agent or remote invoke:

```bash
ssh -o StrictHostKeyChecking=accept-new sandbox-agent@$HOST \
  "/usr/local/bin/sshid-sandbox-run 'echo hello from sandbox && uname -a'"
```

Replace alpine with any image that matches needed tools. Mount only the runs dir.

## 3. Optional sshd ForceCommand (extra restriction)

```bash
# In /etc/ssh/sshd_config or Match block:
Match User sandbox-agent
  ForceCommand /usr/local/bin/sshid-sandbox-run
  AllowTcpForwarding no
  X11Forwarding no
  AllowAgentForwarding no
```

Reload sshd after change.

## 4. Fallback restricted shell (no Docker)

```bash
# authorized_keys options line (or ForceCommand to rbash):
command="cd /home/sandbox-agent/runs && /bin/rbash -c \"$SSH_ORIGINAL_COMMAND\"",no-agent-forwarding,no-port-forwarding,no-X11-forwarding
```

Note: rbash is escape-prone; prefer containers.

## 5. Reachability for NAT / home PC

```bash
# Example on the PC (cloudflared):
cloudflared tunnel --url ssh://localhost:22
# Use the resulting public hostname as $HOST for the agent.
```

## 6. Rollback / cleanup

```bash
sudo userdel -r sandbox-agent 2>/dev/null || true
sudo rm -f /usr/local/bin/sshid-sandbox-run
# Edit authorized_keys to remove the provisioned lines if needed
docker system prune -f 2>/dev/null || true
```

## Compose

- Pre-flight connectivity: invoke `the-netsshark`.
- Orchestration: `myagents` / `godspeed-core`.
- Meta marketplace: `ds4cc`.

Claims limited to provision helper + isolation patterns. No claim of fully automated headless private-key use.

**Grok Build:** enable plugin then `the-sshid-sandbox: <task>`
**Codex:** `codex "use the-sshid-sandbox skill"`
**Kimi:** `/skill:the-sshid-sandbox-docs`
