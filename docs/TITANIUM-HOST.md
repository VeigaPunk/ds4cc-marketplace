# Titanium host resolve

Codex Titanium is a **host binary**, not a marketplace plugin. DS4CC plugins (including `sekhmet`) ship skills/docs only — they do not install `codex-titanium` or `codex`.

## Resolve order

```bash
CODEX_BIN=${CODEX_BIN:-$(command -v codex-titanium || command -v codex)}
```

1. `CODEX_BIN` if set  
2. `codex-titanium` on `PATH`  
3. `codex` on `PATH`

## L3 substrate

- Install swarm CLI: `cargo install --git https://github.com/VeigaPunk/xbrd-spark --locked`  
  → provides `sekhmet` and `xbrd-spark` on `PATH`.
- Optional plugin docs: `codex plugin add sekhmet@ds4cc --json` after registering this marketplace.
- Default spark model: `gpt-5.3-codex-spark` (`XBRD_SPARK_MODEL` overrides).

## Hardened binary (optional)

```bash
brew install VeigaPunk/tap/codex-titanium
install -Dm600 titanium/config.toml "${CODEX_HOME:-$HOME/.codex}/config.toml"
```

See also root README section **Titanium host resolve**.
