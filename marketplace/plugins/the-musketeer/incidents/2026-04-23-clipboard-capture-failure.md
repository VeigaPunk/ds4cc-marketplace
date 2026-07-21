# Incident — 2026-04-23 — `grok` CLI clipboard-capture failure

**Severity:** high (musketeer agent axis blocked)
**Affected binary:** `grok` (this repo, line references below)
**Observed during:** `xbrd-zeitgeist-0423` multi-agent session, 3 musketeer teammates dispatched against the Grok web UI

---

## Summary

CDP transport to Windows Chrome Dev on `localhost:9222` is healthy. Grok's tab opens, the prompt reaches the contenteditable input, submit fires, and a response streams on screen. **The capture step fails** — `navigator.clipboard.writeText` stub never fires, and the eval block returns the fallback string `(clipboard not captured)`. On some runs the eval also throws a JS stack trace of the form `at <anonymous>:4:40 at <anonymous>:28:3`, suggesting an exception inside the injected script rather than just a missed selector.

Three musketeer queries affected in the same session:
- `ccs-musketeer-perf` (A1/A6 execve research) — 2 retries, both capture-failed
- `ccs-musketeer-protocol` (A2 red-team) — capture-failed on retry; worked around by delivering a source-only synthesis
- `ccs-musketeer-codex` (A7 mailbox.rs research) — capture-failed on retry; worked around by delivering scout-synthesis

Responses were visibly present in the Grok tab; the user had to fetch them manually by copying from the browser and pasting into the agent session. This defeats the entire point of the fire-and-fetch automation.

---

## What we know works (ruled out as cause)

- `curl -s http://localhost:9222/json/version` returns the expected Chrome 149.x metadata. CDP transport is fine.
- `agent-browser --cdp 9222 tab list` enumerates Grok / ChatGPT / NotebookLM tabs with full history visible. Auth (SuperGrok login) persists on the `C:\ChromeAutomation` profile.
- Prompt submission (`grok "<query>"`) opens the target tab, dismisses overlays, sets Expert mode, types the prompt, fires Enter, and shows the response streaming on screen. Confirmed visually.

**Rules out:** Chrome not running, port not bound, WSL→Windows localhost forwarding broken, auth lost, prompt not submitted.

---

## What appears to be broken (suspected root cause)

Grok has shifted its DOM since the selectors in `grok` were last verified. Two selectors are load-bearing and suspect:

| `grok` location | Selector | Purpose | Suspect? |
|---|---|---|---|
| `grok:103` | `button[aria-label="Copy"]` | `BEFORE_COUNT` snapshot of existing Copy buttons | Yes — if markup drifted, `btns.length > before` never becomes true and the loop ceiling's out |
| `grok:129` | `button[aria-label="Copy"]` | Polling for the NEW Copy button that appears post-response | Same as above |
| `grok:130` | `button[aria-label*="Stop" i]` | Streaming-done detection | Possible — if the stop-button label drifted, streaming never reads as "complete" |

The additional JS stack trace (`at <anonymous>:4:40 at <anonymous>:28:3`) points inside the injected `eval` block at `grok:119-141`. Line 4 of that block is:

```js
const original = navigator.clipboard.writeText.bind(navigator.clipboard);
```

If Grok has started hardening `navigator.clipboard` (e.g., setting the property to a non-configurable / frozen object, or gating it behind a permissions prompt that fails under CDP), the `.bind()` call would throw and the whole eval would exit before the capture could run. That's consistent with the observed two-location stack trace and the `(clipboard not captured)` fallback never being reached on the exception path.

---

## Concrete fix path

### Step 1 — Verify the current Copy-button markup

From a WSL shell, with Chrome Dev running and a grok.com chat tab open:

```bash
# List tabs, pick the grok.com one
agent-browser --cdp 9222 tab list

# Switch to the grok tab (replace t1 with the grok tab id from the list)
agent-browser --cdp 9222 tab t1

# Snapshot interactive elements on the current page
agent-browser --cdp 9222 snapshot -i | grep -iE 'copy|stop|button' | head -40

# Or dump the actual markup around the assistant message's action buttons
agent-browser --cdp 9222 eval "
  const assistantMessages = document.querySelectorAll('[data-message-author-role=\"assistant\"], [data-testid*=\"message\"], [class*=\"assistant\"]');
  const last = assistantMessages[assistantMessages.length - 1];
  if (!last) return 'no assistant message found';
  const actions = last.querySelectorAll('button');
  return Array.from(actions).map(b => ({
    ariaLabel: b.getAttribute('aria-label'),
    testid: b.getAttribute('data-testid'),
    text: b.textContent.slice(0, 30),
    cls: b.className.slice(0, 60)
  }));
"
```

Whatever comes back under `ariaLabel` / `testid` / `text` for the copy-to-clipboard button is the correct selector to use at `grok:103` and `grok:129`.

### Step 2 — Update selectors in `grok`

Two lines to patch (assuming the new selector is, e.g., `button[aria-label="Copy response"]` or `button[data-testid="copy-button"]`):

```diff
-BEFORE_COUNT=$(agent-browser --cdp "$CDP_PORT" eval \
-  'document.querySelectorAll("button[aria-label=\"Copy\"]").length' 2>&1 \
+BEFORE_COUNT=$(agent-browser --cdp "$CDP_PORT" eval \
+  'document.querySelectorAll("<NEW_SELECTOR>").length' 2>&1 \
   | grep -v "^✓\|^✗" | tr -d '"')
```

And the matching update inside the eval block at `grok:129`. The streaming-detection selector at `grok:130` (`button[aria-label*="Stop" i]`) should also be re-verified while you're in there.

### Step 3 — Add a DOM-text fallback for capture

Currently the capture path is **clipboard-only** — if `navigator.clipboard.writeText` is hardened or the click() can't trigger the copy, we lose the response even when it's visually present in the DOM.

Add a fallback: after the stable-for-800ms completion check passes, if `captured` is still null, read the assistant's last message directly from the DOM:

```js
// inside grok:119-141 eval block, replace the existing `return captured || '(clipboard not captured)';` with:
if (captured) {
  return captured;
}
// fallback: read DOM directly
const msgs = document.querySelectorAll('<ASSISTANT_MESSAGE_SELECTOR>');
const lastMsg = msgs[msgs.length - 1];
if (lastMsg) {
  return lastMsg.innerText;  // or .textContent depending on formatting needs
}
return '(clipboard not captured; DOM fallback also empty)';
```

The assistant-message selector needs verification via the same snapshot approach as Step 1. This fallback survives clipboard API hardening entirely.

### Step 4 — Wrap the `navigator.clipboard.writeText.bind()` call in a try/catch

The JS stack trace at `<anonymous>:4` suggests the `.bind()` itself is throwing under some condition. Defensive wrap:

```js
let original = null;
try {
  original = navigator.clipboard.writeText.bind(navigator.clipboard);
} catch (e) {
  // clipboard API unavailable — fall through, DOM fallback in Step 3 will catch response
}
if (original) {
  navigator.clipboard.writeText = async (t) => { captured = t; return original(t); };
}
```

With Step 3's DOM fallback in place, clipboard-unavailable is no longer a terminal failure.

### Step 5 — Add a `grok --doctor` subcommand (prevention)

Preventive: `grok --doctor` runs a self-check that:
1. Verifies CDP reachability on `$CDP_PORT`
2. Confirms a grok.com tab is accessible
3. Snapshots the current Copy-button selector and compares against the hardcoded one in the script — emits a stderr warning if they diverge
4. Optionally fires a tiny test query (`grok --doctor "1+1=?"`) and verifies end-to-end capture

Cheap to implement (extends the existing CDP-reach check at `grok:40-43`), and catches selector drift on a schedule rather than at the worst possible moment.

---

## Workaround (until fix lands)

1. User leaves Grok tab open after the failed call.
2. Manually copies the response body.
3. Pastes into the agent conversation as a relayed teammate message (as was done for this session's 5 responses).

This is slow and defeats the automation premise but keeps the musketeer axis producing material while the fix is queued.

---

## Out of scope for this incident

- **Chrome CDP launch** — the `powershell.exe -NoProfile -Command "Start-Process 'C:\Program Files\Google\Chrome Dev\Application\chrome.exe' -ArgumentList @('--remote-debugging-port=9222','--user-data-dir=C:\ChromeAutomation','--no-first-run')"` pattern works reliably (verified this session). Not affected by this incident.
- **OAuth / SuperGrok session persistence** — the `C:\ChromeAutomation` profile retains Grok login state across launches. Not affected.
- **`--follow-up` flag behavior** — not tested in this incident; likely has the same selector dependencies and would fail identically.

---

## Suggested PR structure

One PR, two commits:

1. **`fix(grok): update Copy-button selectors for current Grok DOM (2026-04-23)`** — Steps 1-2 applied, minimum viable fix. Ships the selector patch.
2. **`feat(grok): DOM-text fallback + clipboard-bind try/catch`** — Steps 3-4. Hardens against future clipboard-API hardening and selector drift by Grok.

Step 5 (`grok --doctor`) is a separate feature PR — nice-to-have, not blocking.

---

## Testing before close

- Fire `grok "hello, one-line reply please"` — expect a captured one-line response back on stdout.
- Fire `grok --follow-up "another line"` — expect continuity + capture.
- Temporarily break the selector (change `button[aria-label="Copy"]` to `button[aria-label="WRONG"]`) and re-run — expect the DOM fallback (Step 3) to return the response anyway, proving the fallback works.
- Revert the break, confirm clipboard path still works.
