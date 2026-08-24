#!/usr/bin/env python3
"""Overfit + mutants for xask-kimi-stdout extract. No live model."""
from __future__ import annotations

import importlib.util
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
spec = importlib.util.spec_from_file_location(
    "xask_kimi_stdout", ROOT / "scripts" / "xask-kimi-stdout.py"
)
mod = importlib.util.module_from_spec(spec)
assert spec.loader is not None
spec.loader.exec_module(mod)
extract = mod.extract

USER_CAPTURE = """kimi version 0.38.0
• The user asks to reply with exactly: DIRECT_P_OK. Do so.

• DIRECT_P_OK

To resume this session: kimi -r session_3e04c198-2473-4352-98d1-ad1cb25a5510
"""

SCRIPT_WRAP = """Script started on 2026-08-23 23:30:46-03:00 [COMMAND="kimi -m kimi-code/k3 -p \\"Reply with exactly: DIRECT_P_OK\\"" <not executed on terminal>]
kimi version 0.38.0
• The user asks to reply with exactly: DIRECT_P_OK. Do so.

• DIRECT_P_OK

To resume this session: kimi -r session_3e04c198-2473-4352-98d1-ad1cb25a5510

Script done on 2026-08-23 23:30:57-03:00 [COMMAND_EXIT_CODE="0"]
"""


def assert_ok(name: str, raw: str, want: str) -> None:
    got = extract(raw)
    if got != want:
        raise SystemExit(f"FAIL {name}: got {got!r} want {want!r}")
    if "The user asks" in got or "To resume this session" in got:
        raise SystemExit(f"FAIL {name}: CoT/chrome leaked: {got!r}")
    print(f"OK {name}")


def main() -> None:
    assert_ok("overfit-user-capture", USER_CAPTURE, "DIRECT_P_OK")
    assert_ok("mutant-script-wrap", SCRIPT_WRAP, "DIRECT_P_OK")
    assert_ok(
        "mutant-no-bullet",
        "kimi version 0.38.0\nDIRECT_P_OK\nTo resume this session: kimi -r session_x\n",
        "DIRECT_P_OK",
    )
    # empty extract after stripping CoT-only is a miss — must not invent the answer
    got = extract(
        "kimi version 0.38.0\n• The user asks to reply with exactly: DIRECT_P_OK. Do so.\n"
    )
    if got != "":
        raise SystemExit(f"FAIL mutant-only-cot: expected empty, got {got!r}")
    print("OK mutant-only-cot")
    print("PASS: xask-kimi-stdout extract")


if __name__ == "__main__":
    main()
