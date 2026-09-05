# Changelog

## Unreleased

### Changed
- **Rinnegan wall is omp-only:** the standalone CLI cards (`the-leanbuilder`, `b00mr-install`, `z00mr-install`) are off the rinnegan catalog; the sole wall entry is now **omp** (Oh My Pi, `curl -fsSL https://omp.sh/install | sh`, authority `github.com/can1357/oh-my-pi`). `rinnegan/policy.js` admits exactly that record and fails closed on anything else. Rinnegan mode also hides `05 Optional ChatGPT companion` (`#app`) and `04 Install — Few Good CLIs™` (`#install`); normal mode is unchanged.


- **PATH `xask` ChatGPT default** is sekhmet / `codex-titanium` / `service_tier=fast` (`gpt-5.3-codex-spark`). Bare `xask cdx` auto-sparks. Opt-in stock remains `--substrate stock` / `--gpt55` / `--model-id`. Daybreak and `gpt-5.4-mini` still reject `fast`.

- **kimi.ai TLD:** family adapter default is now `https://www.kimi.ai/` (`kimiraikkoner` / marketplace `the-kimiraikoner`, plus `musketeer-chrome` landing tab). Allowlist is `kimi.ai` (canonical), `kimi.com` (legacy signed-in tabs), and `moonshot.cn`. Spoof hosts such as `kimi.ai.evil.example` stay rejected.

### Added

- **mise killed** as Node manager (`docs/ANTI-PATTERNS.md` + `bloat.html`): polyglot PATH occupancy / shim religion. Substitute: **fnm** (praise **multishell**: `fnm env` / `fnm exec`).

- **omegaG standalone path** on the domain: [`ds4cc.com/omegag/`](https://ds4cc.com/omegag/) — full product site (controller mapper, formerly DS4CC), nav + footer + research-note card. Mirrors `vgpnk-holdings-llc/omegaG` `website/`. Also live on [Vercel](https://omegag.vercel.app/) and [GitHub Pages](https://veigapunk.github.io/omegag-site/).

- **§ Referrals** (`#referrals` on ds4cc.com): first-class referral section with Model Studio/Alibaba **featured** (`A927SY`), plus Kimi + OpenCode cards; nav + footer link into it; disclosures keep `sponsored nofollow`.
- **§ Model Studio public-good** (`#modelstudio` on ds4cc.com): Singapore console + OpenAI-compat notes + benefits referral `A927SY` (sponsored/nofollow), framed as shared agent-stack wiring rather than a product pitch.
- Footer referral disclosure for [Alibaba Cloud benefits campaign](https://www.alibabacloud.com/campaign/benefits?referral_code=A927SY) (`referral_code=A927SY`), same sponsored/nofollow pattern as Kimi and OpenCode.

- Literary frame on bloat: Fonseca / DFW *The Suffering Channel* → Nous×Honcho as copromancy collab.

- **Copromancy** (real term) genre label on `bloat.html` + ANTI-PATTERNS for memorymancer stacks.

- **OpenClaw** hard-no + **Hermes unsalvageable** (~$200 DigitalOcean salvage failed) on `bloat.html` + ANTI-PATTERNS.

- **`docs/MCP-STANCE.md`**: operator SSoT — **Exa is the only MCP that proved its worth**; other general web MCPs treated as bloat/lag/snake oil until proven; research → Exa, live UI → burner Chrome agent-browser. Wired into README, GROK_PASTE, and grok-cli-config comments.
- **`docs/ANTI-PATTERNS.md`**: dual of curation — explicit *what not to use* with status/why/use-instead/reopen. Flagship entry: **Honcho** (killed as stack memory; SQLite instead), plus MCP zoo, TinyFish-as-research, general-purpose/explore, client-side capability patching. Linked from CURATION, README, GROK_PASTE.
- **Exa separate tab** `exa.html` — product praise, **not** Titanium MCP. Hero: Titanium = no MCP.
- **Bloat tab** `bloat.html` — Honcho (worst suck), Hermes/Nous (emoji bloatware, Workspace keys, duo-queue memory, gsync/rclone sludge).
- ANTI-PATTERNS + GROK_PASTE aligned: L3 no MCP; Hermes/Honcho kills.

## 0.3.0 — 2026-07-23

### Changed

- Renamed the network auditor plugin to `the-netsshark` across catalogs, website copy, docs, and tests.
- Removed legacy Crush catalog support and refreshed the public docs for Grok Build, Codex, Kimi Code CLI, and OpenCode.
- Bumped the `ds4cc` meta-plugin to `0.3.0` and refreshed the published marketplace catalogs.
