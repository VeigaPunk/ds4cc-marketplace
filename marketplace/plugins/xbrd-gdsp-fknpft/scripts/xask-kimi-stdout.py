#!/usr/bin/env python3
"""Extract the model answer from kimi-code -p stdout+stderr chrome.

kimi 0.38.0 print-mode dumps thinking CoT, a version banner, and a
`To resume this session:` footer onto the same stream xask ingests.
That clogs <raw_output>. This filter keeps the assistant answer.

Overfit case (user DIRECT_P_OK capture): version + CoT bullet + answer
bullet + resume footer → `DIRECT_P_OK`.
"""
from __future__ import annotations

import re
import sys

RESUME_RE = re.compile(r"^To resume this session:\s*kimi\s+-r\s+", re.I)
VERSION_RE = re.compile(r"^kimi version\s+", re.I)
SCRIPT_RE = re.compile(r"^(Script started on |Script done on )")
COT_RE = re.compile(
    r"^(The user asks|The user typed|You're inside|You are in an interactive)",
    re.I,
)


def extract(raw: str) -> str:
    bullets: list[str] = []
    leftovers: list[str] = []
    for line in raw.splitlines():
        s = line.strip()
        if not s:
            continue
        if VERSION_RE.match(s) or RESUME_RE.match(s) or SCRIPT_RE.match(s):
            continue
        if s.startswith("===") or s.startswith("---"):
            continue
        if s.startswith("•"):
            body = s.lstrip("•").strip()
            if COT_RE.match(body):
                continue
            bullets.append(body)
            continue
        if COT_RE.match(s):
            continue
        leftovers.append(s)
    if bullets:
        return bullets[-1]
    if leftovers:
        return leftovers[-1]
    return ""


def main() -> None:
    raw = sys.stdin.read()
    ans = extract(raw)
    if not ans:
        print("xask-kimi-stdout: empty extract", file=sys.stderr)
        raise SystemExit(6)
    sys.stdout.write(ans)
    if not ans.endswith("\n"):
        sys.stdout.write("\n")


if __name__ == "__main__":
    main()
