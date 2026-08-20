# Titanium host resolve

Codex Titanium is a **host binary**, not a marketplace plugin. DS4CC plugins (including `sekhmet`) ship skills/docs only — they do not install `codex-titanium` or `codex`.

## Resolve order

Sekhmet / xbrd-spark:

1. `CODEX_BIN` if set (operator pin; no stub-skip)  
2. `codex-titanium` on `PATH`  
3. non-stub `codex` on `PATH` — **omarchy npx `@openai/codex` stub is skipped**

**Never** symlink titanium as `codex` on this host. Keep the names distinct so the stub-skip path stays honest.

```bash
# preferred
export CODEX_BIN="$(command -v codex-titanium)"
# or rely on PATH: codex-titanium first
```

**`xask`** on `PATH` is a thin `sekhmet run --direct` shim (flag-compat), not a second Titanium binary.

## L3 substrate

- Install swarm CLI: `cargo install --git https://github.com/VeigaPunk/xbrd-spark --locked`  
  → provides `sekhmet` and `xbrd-spark` on `PATH`.
- Optional plugin docs: `codex plugin add sekhmet@ds4cc --json` after registering this marketplace.
- **Crate defaults:** model **`gpt-5.6-luna`** · effort **`low`** · `service_tier=fast` · fallback **none** · swarm **`-j 64`**  
  (`XBRD_SPARK_MODEL` / `XBRD_SPARK_FALLBACK_MODEL` / `XBRD_SPARK_SERVICE_TIER` / `XBRD_SPARK_JOBS`).

## Hardened binary (optional)

```bash
brew install VeigaPunk/tap/codex-titanium
install -Dm600 titanium/config.toml "${CODEX_HOME:-$HOME/.codex}/config.toml"
```

**Warning:** the brew formula may also **install-symlink `codex` → titanium**. Do **not** accept that symlink on this host — keep `codex-titanium` as the Titanium name and leave any omarchy `codex` stub alone (sekhmet skips it).

See also root README section **Titanium host resolve**.
