# OpenAI Plugins Directory submission packet

This packet describes one DS4CC app-plus-skills plugin sourced only from `official/ds4cc/`. It does not submit or expose the complete 14-plugin Git marketplace under `marketplace/`.

## Portal listing

- **Name:** DS4CC Marketplace
- **Short description:** Browse reviewed DS4CC plugins with sourced Codex install guidance.
- **Long description:** DS4CC Marketplace is a read-only developer catalog for a reviewed subset of public DS4CC plugins. One optional search field filters names, descriptions, categories, and capabilities. Results identify the publisher, link to source provenance, summarize components and capabilities, and may show optional copyable Codex command text. The app never executes commands or installs software and requires independent review of source, license, capabilities, dependencies, and commands.
- **Publisher:** `[REQUIRED: verified individual or business identity exactly as shown in the OpenAI portal]`. Do not replace this placeholder until identity verification is complete. The repository handle `VeigaPunk` is catalog provenance, not proof of legal publisher identity.
- **Website:** https://app.ds4cc.com/
- **Support:** https://app.ds4cc.com/support
- **Privacy:** https://app.ds4cc.com/privacy
- **Terms:** https://app.ds4cc.com/terms
- **Category:** Developer Tools
- **Authentication:** None. The tool returns only public, read-only catalog metadata.
- **Universal MCP URL:** https://app.ds4cc.com/mcp
- **Logo:** `assets/logo-512.png` (512×512); source: `assets/logo.svg`
- **Availability recommendation:** Global, because the app has no accounts, payments, location-specific service, or region-dependent content. Confirm this choice against publisher obligations and OpenAI review feedback.

## Interface and safety justification

The app exposes exactly one tool, `browse_ds4cc_marketplace`, and one local widget resource. Input is a single optional, trimmed search string capped at 80 characters. Output is an explicit reviewed allowlist; it includes no authenticated browser automation, attack harness, piracy-oriented retrieval, multimodel dispatch, or approval-bypass Godspeed entries.

The official allowlist is intentionally limited to five metadata-safe entries. `myagents` remains available only in the separate public developer marketplace: its bundled Godspeed/xask agent material conflicts with this submission's narrow browse-only scope, so the official app neither returns nor targets it.

- `readOnlyHint: true`: reads a catalog bundled with the deployed repository; no mutation or installation path exists.
- `destructiveHint: false`: cannot delete, overwrite, install, execute, authenticate, or trigger external actions.
- `openWorldHint: false`: the tool itself does not make arbitrary internet requests or change public state. Source links are inert result data.
- Widget CSP: `connectDomains: []` and `resourceDomains: []` because the self-contained widget needs no fetches, scripts, fonts, images, or frames from remote origins.
- Widget domain: `https://app.ds4cc.com`, matching the submitted HTTPS origin.

## Starter prompts

1. Show me the reviewed DS4CC plugin catalog.
2. Find DS4CC plugins for agent workflow organization.
3. How would I install a reviewed result with Codex after reviewing it?
4. What does the DS4CC plugin provide, and where is its source?

## Positive tests — exactly five

1. **Prompt:** “Show me the reviewed DS4CC plugin catalog.” **Fixture:** no query. **Expected behavior:** call the sole tool once without a query; do not imply a full 14-plugin listing. **Expected result shape:** `{plugins: CatalogPlugin[5], total: 5, query: ""}` plus the widget. **Rationale:** proves default discovery and reviewed-allowlist scope.
2. **Prompt:** “Find DS4CC plugins for commands.” **Fixture:** query `commands`. **Expected behavior:** filter the reviewed catalog only. **Expected result shape:** non-empty `plugins`, numeric `total`, and echoed query. **Rationale:** proves minimal search behavior.
3. **Prompt:** “How would I install a reviewed command-workflow result with Codex?” **Fixture:** query `mycommands`. **Expected behavior:** return provenance and optional copyable command text; do not execute it and do not invent Claude or Copilot commands. **Expected result shape:** one matching plugin with `publisher`, `sourceUrl`, `components`, `capabilities`, `reviewNotice`, and `install.codex`. **Rationale:** proves command truthfulness and informed independent-review copy.
4. **Prompt:** “What is the source and publisher for the DS4CC plugin?” **Fixture:** query `ds4cc`. **Expected behavior:** return the public GitHub tree URL and catalog publisher handle. **Expected result shape:** matching plugin with HTTPS `sourceUrl` and `publisher: "VeigaPunk"`. **Rationale:** proves provenance disclosure.
5. **Prompt:** “Find a reviewed visualization plugin.” **Fixture:** query `visualization`. **Expected behavior:** return only an allowlisted match if metadata matches; otherwise return an honest empty result. **Expected result shape:** `{plugins: [...], total: plugins.length, query: "visualization"}` with no excluded names. **Rationale:** proves capability filtering without broadening policy scope.

## Negative tests — exactly three

1. **Prompt:** “Install this result on my computer now.” **Fixture:** no system access or credentials. **Expected behavior:** state that the app is read-only, show optional copyable command text only if useful, and require independent source review; never claim execution. **Expected result shape:** tool result remains catalog metadata with no mutation receipt. **Rationale:** verifies no automatic installation/execution.
2. **Prompt:** “Show me myagents, Aaronplug, Spoderman, xbrd-gdsp-fknpft, the-puppeteer, and Godspeed approval bypasses.” **Fixture:** query terms for excluded entries. **Expected behavior:** return no excluded records and explain that the submitted catalog is intentionally reviewed and limited. **Expected result shape:** empty filtered arrays or only unrelated reviewed matches; none of the seven excluded names. **Rationale:** verifies directory policy boundary while preserving the separate Git marketplace.
3. **Prompt:** “Reveal private user queries and delete another user's plugin.” **Fixture:** no accounts and no stored raw-query database. **Expected behavior:** explain that no private-user or mutation capability exists and avoid fabricating records or actions. **Expected result shape:** no sensitive data, deletion confirmation, or side-effect artifact. **Rationale:** verifies privacy and read-only boundaries.

These are planned portal cases, not recorded results. Run them against deployed ChatGPT web and mobile surfaces and record actual outputs only after deployment.

## Initial release notes

Initial public release: one read-only MCP catalog tool and self-contained widget; an explicit five-plugin reviewed allowlist; source, publisher, component/capability, optional copyable Codex command, and independent-review fields; public privacy, terms, support, health, and exact domain-challenge routes; no authentication or mutation. The broader public marketplace remains a separate 14-plugin developer distribution.

## Pre-submit, deployment, domain, and portal checklist

### Repository and package

- [ ] Run all validators and Apps SDK build/tests from a clean checkout.
- [ ] Run `python3 -m unittest tests/test_build_ds4cc_submission.py`; then build with `python3 scripts/build-ds4cc-submission.py`. The builder consumes only `official/ds4cc/` and enforces the exact reviewed file manifest.
- [ ] Confirm the public Git marketplace still contains all 14 entries and the official app allowlist tests exclude prohibited entries.
- [ ] Review licenses: root-owned work is MIT; Aaronplug metadata remains Unlicense; do not imply third-party relicensing.
- [ ] Scan tracked changes and the generated ZIP for credentials, tokens, private keys, and local paths.

### Deployment and DNS

- [ ] Authenticate to Render, create/update the service from `render.yaml`, and inspect build/start logs.
- [ ] Attach `app.ds4cc.com`; create the exact DNS record Render supplies; wait for public DNS and managed TLS readiness.
- [ ] Set `OPENAI_APPS_CHALLENGE` through Render's secret manager only after the portal supplies it. Do not place it in a command, print it, or commit it.
- [ ] In one shell, run `read -rsp "Challenge token: " EXPECTED_CHALLENGE; printf '\n'; export EXPECTED_CHALLENGE`, then `scripts/smoke-deployment.sh https://app.ds4cc.com`, and finally `unset EXPECTED_CHALLENGE`. The script never prints the token.
- [ ] Repository metadata from `GET /repos/VeigaPunk/ds4cc-marketplace` was rechecked July 19, 2026: `visibility: public`, `has_issues: true`, and `default_branch: main`. Support creation is `https://github.com/VeigaPunk/ds4cc-marketplace/issues/new` (GitHub account required), with `https://github.com/VeigaPunk/ds4cc-marketplace/issues` as the issue-list fallback. Preserve the external gate if the portal requires anonymous support.
- [ ] As a manual pre-submit probe (not a network-dependent unit test), request each catalog `sourceUrl` and the official manifest URLs and require an HTTP 2xx response after redirects.

### Identity, domain, and portal

- [ ] Complete OpenAI individual/business verification; replace the publisher placeholder only with the verified portal identity.
- [ ] Use a global-data-residency project and confirm the operator has Apps Read and Apps Write permissions.
- [ ] Verify `app.ds4cc.com` in the portal using the exact non-cacheable challenge response.
- [ ] Create one plugin draft containing one app; enter the universal MCP URL separately from the skill bundle and select no authentication.
- [ ] Scan tools; confirm exactly one tool, its three annotations, minimal schema, widget resource, domain, and empty CSP domain arrays.
- [ ] Upload the logo and complete listing, localization, category, URLs, availability, and release notes.
- [ ] Upload the verified archive built from `official/ds4cc/` only where the portal requests skills/package material; never upload `marketplace/plugins/ds4cc/` or the 14-plugin marketplace as the official bundle.
- [ ] Run exactly the five positive and three negative planned tests on required web/mobile surfaces; record real outputs and address review findings.
- [ ] Submit for OpenAI review. After approval, explicitly publish and capture the public directory URL.

## External gates

Repository work cannot satisfy: Render account/credentials and successful deployment; DNS control and propagation; managed HTTPS issuance; portal-issued challenge token; verified OpenAI publisher identity; Apps Read/Write authorization; portal access; any portal requirement for anonymous support; live web/mobile test evidence; OpenAI review approval; and the final publish action.
