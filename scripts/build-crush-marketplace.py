#!/usr/bin/env python3
"""Build the DS4CC marketplace catalog for Crush CLI.

Crush discovers skills from directories listed in crush.json options.skills_paths.
Each DS4CC plugin already exposes its skills under marketplace/plugins/<name>/skills/.
This script emits a .crush-plugin/marketplace.json catalog that points to those skill
roots and validates the underlying plugin manifests.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

EXPECTED_PLUGINS = 16
NAME_RE = re.compile(r"^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$")
SEMVER_RE = re.compile(
    r"^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)"
    r"(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?"
    r"(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$"
)


class ValidationError(ValueError):
    pass


def fail(message: str) -> None:
    raise ValidationError(message)


def read_json(path: Path) -> dict:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, UnicodeError, json.JSONDecodeError) as error:
        fail(f"cannot read JSON {path}: {error}")
    if not isinstance(value, dict):
        fail(f"JSON object required: {path}")
    return value


def nonempty_string(value: object, label: str) -> str:
    if not isinstance(value, str) or not value.strip():
        fail(f"{label} must be a nonempty string")
    return value


def validate_semver(value: str, label: str) -> None:
    match = SEMVER_RE.fullmatch(value)
    if not match:
        fail(f"invalid semantic version for {label}: {value}")
    if match.group(4):
        for part in match.group(4).split("."):
            if part.isdigit() and len(part) > 1 and part.startswith("0"):
                fail(f"invalid semantic version for {label}: {value}")


def declared_root(plugin_dir: Path, value: object, label: str) -> Path:
    raw = nonempty_string(value, label)
    if not raw.startswith("./") or "\\" in raw:
        fail(f"{label} must be a safe ./ path")
    relative = Path(raw[2:])
    if not relative.parts or any(part in {"", ".", ".."} for part in relative.parts):
        fail(f"{label} contains traversal or an empty component")
    root = plugin_dir / relative
    if not root.is_dir():
        fail(f"declared {label} directory does not exist: {root}")
    return root


def load_plugin(manifest_path: Path) -> dict:
    plugin_dir = manifest_path.parent
    manifest = read_json(manifest_path)

    name = nonempty_string(manifest.get("name"), "name")
    if not NAME_RE.fullmatch(name):
        fail(f"invalid plugin name: {name}")
    if name != plugin_dir.name:
        fail(f"manifest name {name!r} does not match directory {plugin_dir.name!r}")

    version = nonempty_string(manifest.get("version"), f"{name}.version")
    validate_semver(version, name)
    description = nonempty_string(manifest.get("description"), f"{name}.description")

    author = manifest.get("author", {})
    if isinstance(author, str):
        author_name = author
    elif isinstance(author, dict):
        author_name = author.get("name", "VeigaPunk")
    else:
        author_name = "VeigaPunk"

    homepage = manifest.get("homepage")
    if homepage is not None:
        nonempty_string(homepage, f"{name}.homepage")

    skills_root = declared_root(plugin_dir, manifest.get("skills"), f"{name}.skills")
    skills = sorted(
        skill_dir.name
        for skill_dir in skills_root.iterdir()
        if skill_dir.is_dir() and (skill_dir / "SKILL.md").is_file()
    )
    if not skills:
        fail(f"plugin {name} has no skills under {skills_root}")

    return {
        "name": name,
        "version": version,
        "description": description,
        "author": {"name": author_name},
        "homepage": homepage,
        "skills": raw_skills_path(manifest.get("skills")),
        "skills_provided": skills,
    }


def raw_skills_path(value: object) -> str:
    raw = nonempty_string(value, "skills")
    return raw


def discover(root: Path) -> list[dict]:
    plugin_root = root / "marketplace" / "plugins"
    manifests = sorted(plugin_root.glob("*/plugin.json"))
    if len(manifests) != EXPECTED_PLUGINS:
        fail(f"expected {EXPECTED_PLUGINS} plugin manifests, found {len(manifests)}")
    plugins = [load_plugin(path) for path in manifests]
    names = [plugin["name"] for plugin in plugins]
    if len(names) != len(set(names)):
        fail("duplicate plugin names")
    return sorted(plugins, key=lambda item: item["name"])


def catalog_for(plugins: list[dict]) -> dict:
    entries = []
    for plugin in plugins:
        entry = {
            "name": plugin["name"],
            "version": plugin["version"],
            "description": plugin["description"],
            "source": {
                "type": "local",
                "path": f"./marketplace/plugins/{plugin['name']}",
            },
            "skills": plugin["skills"],
            "author": plugin["author"],
        }
        if plugin.get("homepage"):
            entry["homepage"] = plugin["homepage"]
        entries.append(entry)
    return {
        "name": "ds4cc",
        "owner": {"name": "VeigaPunk"},
        "metadata": {
            "description": "DS4CC plugins packaged as Crush CLI skills.",
            "version": "0.2.0",
        },
        "plugins": entries,
    }


def catalog_bytes(catalog: dict) -> bytes:
    return (json.dumps(catalog, indent=2, ensure_ascii=True) + "\n").encode("ascii")


def run(root: Path, output: Path, check: bool) -> None:
    plugins = discover(root)
    catalog = catalog_for(plugins)
    catalog_path = output / "marketplace.json"
    if check:
        actual = read_json(catalog_path)
        if actual != catalog:
            fail(f"checked-in Crush catalog is stale: {catalog_path}")
        return
    output.mkdir(parents=True, exist_ok=True)
    catalog_path.write_bytes(catalog_bytes(catalog))


def main() -> int:
    default_root = Path(__file__).resolve().parents[1]
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=default_root)
    parser.add_argument("--output", type=Path)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    root = args.root.resolve()
    output = (args.output or root / ".crush-plugin").resolve()
    try:
        run(root, output, args.check)
    except ValidationError as error:
        print(f"error: {error}", file=sys.stderr)
        return 1
    action = "validated" if args.check else "built"
    print(f"{action} {EXPECTED_PLUGINS} Crush plugins")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
