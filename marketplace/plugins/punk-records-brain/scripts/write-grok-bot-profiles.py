#!/usr/bin/env python3
"""Write pack agent files into live Grok Bot Descriptions.

Never change the viewport. window.resizeTo / CDP device-metrics desync
Hyprland tiles from CDP boxes and kill click automation on this host.

At the live tile (often 860×1408) the settings form is in the DOM after
Edit Profile, but omitted from the a11y snapshot. Detect and write via DOM.
"""
from __future__ import annotations

import json
import pathlib
import re
import subprocess
import sys
import time

CDP = ["agent-browser", "--session", "grokbot", "--cdp", "9333"]
ROOT = pathlib.Path(__file__).resolve().parents[1]
PACK = json.loads((ROOT / "templates/grok-bot-pack/pack.json").read_text())


def run(*args, input=None):
    r = subprocess.run([*CDP, *args], capture_output=True, text=True, input=input)
    return r.returncode, (r.stdout or "") + (r.stderr or "")


def snap():
    _, out = run("snapshot", "-i")
    if "tab_gone" in out or out.startswith("✗") or not out.strip():
        run("tab", "t1")
        time.sleep(0.2)
        _, out = run("snapshot", "-i")
    return out


def eval_js(script):
    return run("eval", "--stdin", input=script)[1].strip()


def parse_json(raw):
    if raw.startswith('"'):
        raw = json.loads(raw)
    return json.loads(raw) if isinstance(raw, str) else raw


def assert_viewport_sane():
    geo = parse_json(
        eval_js(
            "JSON.stringify({iw:innerWidth,ih:innerHeight,ow:outerWidth,oh:outerHeight})"
        )
    )
    iw, ih, ow, oh = int(geo["iw"]), int(geo["ih"]), int(geo["ow"]), int(geo["oh"])
    if (iw, ih) != (ow, oh):
        print(
            f"VIEWPORT_DESYNC inner={iw}x{ih} outer={ow}x{oh} — "
            "do not resizeTo. Restore the Hyprland tile or restart Grok Bot.",
            file=sys.stderr,
        )
        sys.exit(3)
    hy = subprocess.run(["hyprctl", "clients", "-j"], capture_output=True, text=True)
    if hy.returncode == 0:
        for c in json.loads(hy.stdout):
            if c.get("class") == "grok-bot":
                w, h = c["size"]
                if abs(w - iw) > 8 or abs(h - ih) > 8:
                    print(
                        f"VIEWPORT_DESYNC hypr={w}x{h} cdp={iw}x{ih} — "
                        "do not resizeTo; leave the compositor in charge.",
                        file=sys.stderr,
                    )
                    sys.exit(3)
                break
    print(f"VIEWPORT_OK {iw}x{ih}")


def form():
    return parse_json(
        eval_js(
            """(() => {
      const n=document.querySelector('[aria-label="Bot name"]');
      const t=document.querySelector('[aria-label="Bot title"]');
      const d=document.querySelector('[aria-label="Bot description"]');
      const v=d&&d.value||'';
      return JSON.stringify({
        has:!!n, n:n&&n.value, t:t&&t.value, dl:v.length,
        hasMark:v.includes('PUNK_MARK'),
        hasRecords:v.includes('punk-records'),
        hasSync:v.includes('SYNC-')
      });
    })()"""
        )
    )


def set_field(aria, value, proto):
    return eval_js(
        f"""(() => {{
      const el=document.querySelector('[aria-label="{aria}"]');
      if(!el) return 'NO';
      el.focus();
      if (el.select) el.select();
      Object.getOwnPropertyDescriptor({proto}.prototype,'value').set.call(el, {json.dumps(value)});
      el.dispatchEvent(new InputEvent('input',{{bubbles:true,inputType:'insertText'}}));
      el.dispatchEvent(new Event('change',{{bubbles:true}}));
      el.blur();
      return String((el.value||'').length);
    }})()"""
    )


def open_settings(name):
    f = form()
    if f.get("has") and f.get("n") == name:
        return True
    s = snap()
    if "menuitem" in s:
        run("press", "Escape")
        time.sleep(0.12)
        s = snap()
    rid = None
    for line in s.splitlines():
        m = re.search(r'button "([^"]+)"[^\n]*ref=(e\d+)', line)
        if m and m.group(1).split(",")[0].strip() == name:
            rid = m.group(2)
            break
    if not rid:
        print(f"  missing sidebar {name}", file=sys.stderr)
        return False
    _, box_txt = run("get", "box", f"@{rid}")
    nums = {
        k: float(m.group(1))
        for k in ("x", "y", "width", "height")
        if (m := re.search(rf"^{k}:\s+([0-9.]+)", box_txt, re.M))
    }
    if nums.get("width", 0) < 2:
        return False
    cx = int(nums["x"] + nums["width"] / 2)
    cy = int(nums["y"] + min(nums["height"] / 2, 20))
    run("mouse", "move", str(cx), str(cy))
    time.sleep(0.05)
    run("mouse", "down", "right")
    run("mouse", "up", "right")
    time.sleep(0.35)
    clicked = eval_js(
        """(() => {
      const items=[...document.querySelectorAll('[role="menuitem"],[data-radix-collection-item]')];
      const hit=items.find(el => (el.textContent||'').includes('Edit Profile'));
      if(!hit) return 'NO';
      hit.click();
      return 'OK';
    })()"""
    )
    if "OK" not in clicked:
        print(f"  no Edit Profile for {name}: {clicked}", file=sys.stderr)
        return False
    for _ in range(15):
        time.sleep(0.2)
        if form().get("has"):
            return True
    print(f"  form never mounted for {name}", file=sys.stderr)
    return False


def write_bot(bot):
    print(f"WRITE {bot['name']}", flush=True)
    if not open_settings(bot["name"]):
        return False
    body = (ROOT / bot["file"]).read_text()
    set_field("Bot name", bot["name"], "HTMLInputElement")
    set_field("Bot title", bot["title"], "HTMLInputElement")
    set_field("Bot description", body, "HTMLTextAreaElement")
    time.sleep(0.35)
    f = form()
    print(" ", f)
    return (
        f.get("n") == bot["name"]
        and f.get("dl", 0) >= 400
        and f.get("hasMark")
        and f.get("hasRecords")
        and f.get("hasSync")
    )


def main():
    _, probe = run("snapshot", "-i")
    if "tab_gone" in probe or probe.startswith("✗") or not probe.strip():
        run("tab", "t1")
    assert_viewport_sane()
    failed = [bot["name"] for bot in PACK["bots"] if not write_bot(bot)]
    if failed:
        print("FAILED", failed)
        sys.exit(1)
    print("PROFILES_OK", [b["name"] for b in PACK["bots"]])


if __name__ == "__main__":
    main()
