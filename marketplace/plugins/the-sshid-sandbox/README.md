# the-sshid-sandbox

DS4CC marketplace plugin: set up sandbox runs on your own PC through SSH, using Termius SSH ID for public-key provisioning.

## What it does

- Fetches public keys from `https://sshid.io/<HANDLE>` (Termius SSH ID) and installs them into a restricted sandbox account.
- Prefers **Docker/Podman** isolation (`--network none`, volume-mounted work dir, auto-remove).
- Falls back to a dedicated user + restricted shell / ForceCommand when containers are unavailable.
- Never stores or transmits private keys. Termius keeps device-bound keys on the client devices only.
- Supplies copy-paste commands for Grok Build, Codex, Kimi Code CLI, and OpenCode agents.

## Security posture

- Public keys only (sshid.io).
- Explicit gates: never grant unrestricted shells to agents.
- Docker primary path uses `--network none` and `--rm`.
- Rollback and cleanup commands are first-class.
- Authentication from the agent side is independent of Termius SSH ID (use a dedicated keypair, ssh-agent, or local execution).

## Quick start

See `skills/ssh-sandbox-docs/SKILL.md` for the full actionable command set.

```bash
# 1. Set your Termius handle
export SSHID_HANDLE=yourhandle

# 2. Provision (on the target host, for the sandbox user)
curl -fsSL "https://sshid.io/${SSHID_HANDLE}" >> /home/sandbox/.ssh/authorized_keys
chmod 600 /home/sandbox/.ssh/authorized_keys
```

Then follow the Docker sandbox or restricted-user paths in the skill.

## Compose

- Pre-flight connectivity / firewall / DNS: `the-netsshark`
- Orchestration: `myagents` / `godspeed-core`
- Marketplace meta: `ds4cc`

## License

MIT
