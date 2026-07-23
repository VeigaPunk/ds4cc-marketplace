#!/usr/bin/env python3
"""Validate and package the DS4CC marketplace for Kimi CLI 0.28.1."""

from __future__ import annotations

import argparse
import json
import os
import re
import stat
import sys
import zipfile
from pathlib import Path, PurePosixPath


EXPECTED_PLUGINS = 15
NAME_RE = re.compile(r"^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$")
SEMVER_RE = re.compile(
    r"^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)"
    r"(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?"
    r"(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$"
)
SUPPORTED_FIELDS = {
    "name",
    "version",
    "description",
    "author",
    "homepage",
    "repository",
    "license",
    "keywords",
    "skills",
    "commands",
    "interface",
}
INTERFACE_FIELDS = {
    "displayName",
    "shortDescription",
    "longDescription",
    "developerName",
    "websiteURL",
    "category",
    "capabilities",
}
FIXED_TIME = (1980, 1, 1, 0, 0, 0)


class ValidationError(ValueError):
    pass


def fail(message: str) -> None:
    raise ValidationError(message)


def read_json(path: Path) -> dict:
    if path.is_symlink():
        fail(f"symlink is not allowed: {path}")
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


def validate_string_list(value: object, label: str) -> None:
    if not isinstance(value, list) or any(
        not isinstance(item, str) or not item.strip() for item in value
    ):
        fail(f"{label} must be a list of nonempty strings")


def declared_root(plugin_dir: Path, value: object, label: str) -> Path:
    raw = nonempty_string(value, label)
    if not raw.startswith("./") or "\\" in raw:
        fail(f"{label} must be a safe ./ path")
    relative = PurePosixPath(raw[2:])
    if not relative.parts or any(part in {"", ".", ".."} for part in relative.parts):
        fail(f"{label} contains traversal or an empty component")
    root = plugin_dir.joinpath(*relative.parts)
    if root.is_symlink():
        fail(f"symlink is not allowed: {root}")
    if not root.is_dir():
        fail(f"declared {label} directory does not exist: {root}")
    return root


def frontmatter_value(lines: list[str], key: str) -> str | None:
    prefix = key + ":"
    for index, line in enumerate(lines):
        if not line.startswith(prefix):
            continue
        value = line[len(prefix) :].strip()
        if value in {">", "|", ">-", "|-", ">+", "|+"}:
            continuation = []
            for following in lines[index + 1 :]:
                if following and not following[0].isspace():
                    break
                if following.strip():
                    continuation.append(following.strip())
            return " ".join(continuation)
        return value.strip("\"'")
    return None


def validate_skill(path: Path) -> None:
    try:
        text = path.read_text(encoding="utf-8")
    except (OSError, UnicodeError) as error:
        fail(f"cannot read skill {path}: {error}")
    lines = text.splitlines()
    if not lines or lines[0].strip() != "---":
        fail(f"skill frontmatter is missing: {path}")
    try:
        end = next(i for i in range(1, len(lines)) if lines[i].strip() == "---")
    except StopIteration:
        fail(f"skill frontmatter is unterminated: {path}")
    header = lines[1:end]
    if not (frontmatter_value(header, "name") or "").strip():
        fail(f"skill frontmatter name is empty: {path}")
    if not (frontmatter_value(header, "description") or "").strip():
        fail(f"skill frontmatter description is empty: {path}")


def collect_root(plugin_dir: Path, root: Path, validate_skills: bool) -> dict[str, Path]:
    files: dict[str, Path] = {}
    for directory, dirnames, filenames in os.walk(root, followlinks=False):
        current = Path(directory)
        for name in dirnames:
            child = current / name
            if child.is_symlink():
                fail(f"symlink is not allowed: {child}")
        for name in filenames:
            child = current / name
            mode = child.lstat().st_mode
            if stat.S_ISLNK(mode):
                fail(f"symlink is not allowed: {child}")
            if not stat.S_ISREG(mode):
                fail(f"non-regular file is not allowed: {child}")
            archive_name = child.relative_to(plugin_dir).as_posix()
            if PurePosixPath(archive_name).is_absolute() or ".." in PurePosixPath(archive_name).parts:
                fail(f"unsafe archive path: {archive_name}")
            files[archive_name] = child
            if validate_skills and child.name == "SKILL.md":
                validate_skill(child)
    return files


def load_plugin(manifest_path: Path) -> tuple[dict, dict[str, Path]]:
    plugin_dir = manifest_path.parent
    if plugin_dir.is_symlink():
        fail(f"symlink is not allowed: {plugin_dir}")
    manifest = read_json(manifest_path)
    if "agents" in manifest:
        fail(f"agents are unsupported by Kimi CLI 0.28.1: {manifest_path}")
    unsupported = sorted(set(manifest) - SUPPORTED_FIELDS)
    if unsupported:
        fail(f"unsupported manifest fields in {manifest_path}: {', '.join(unsupported)}")

    name = nonempty_string(manifest.get("name"), "name")
    if not NAME_RE.fullmatch(name):
        fail(f"invalid plugin name: {name}")
    if name != plugin_dir.name:
        fail(f"manifest name {name!r} does not match directory {plugin_dir.name!r}")
    version = nonempty_string(manifest.get("version"), f"{name}.version")
    version_match = SEMVER_RE.fullmatch(version)
    if not version_match or any(
        part.isdigit() and len(part) > 1 and part.startswith("0")
        for part in (version_match.group(4).split(".") if version_match and version_match.group(4) else [])
    ):
        fail(f"invalid semantic version for {name}: {version}")
    nonempty_string(manifest.get("description"), f"{name}.description")

    for field in ("homepage", "repository", "license"):
        if field in manifest:
            nonempty_string(manifest[field], f"{name}.{field}")
    if "keywords" in manifest:
        validate_string_list(manifest["keywords"], f"{name}.keywords")
    if "author" in manifest:
        author = manifest["author"]
        if isinstance(author, str):
            nonempty_string(author, f"{name}.author")
        elif isinstance(author, dict):
            nonempty_string(author.get("name"), f"{name}.author.name")
            extra = set(author) - {"name", "email", "url"}
            if extra:
                fail(f"unsupported author fields for {name}: {', '.join(sorted(extra))}")
            for field in ("email", "url"):
                if field in author:
                    nonempty_string(author[field], f"{name}.author.{field}")
        else:
            fail(f"{name}.author must be a string or object")
    interface = manifest.get("interface", {})
    if not isinstance(interface, dict):
        fail(f"{name}.interface must be an object")
    extra_interface = set(interface) - INTERFACE_FIELDS
    if extra_interface:
        fail(f"unsupported interface fields for {name}: {', '.join(sorted(extra_interface))}")
    for field, value in interface.items():
        if field == "capabilities":
            validate_string_list(value, f"{name}.interface.capabilities")
        else:
            nonempty_string(value, f"{name}.interface.{field}")

    files: dict[str, Path] = {"kimi.plugin.json": manifest_path}
    for field in ("skills", "commands"):
        if field in manifest:
            root = declared_root(plugin_dir, manifest[field], f"{name}.{field}")
            files.update(collect_root(plugin_dir, root, field == "skills"))
    return manifest, files


def discover(root: Path) -> list[tuple[dict, dict[str, Path]]]:
    plugin_root = root / "marketplace" / "plugins"
    manifests = sorted(plugin_root.glob("*/kimi.plugin.json"))
    if len(manifests) != EXPECTED_PLUGINS:
        fail(f"expected {EXPECTED_PLUGINS} Kimi manifests, found {len(manifests)}")
    plugins = [load_plugin(path) for path in manifests]
    names = [plugin[0]["name"] for plugin in plugins]
    if len(names) != len(set(names)):
        fail("duplicate plugin names")
    return sorted(plugins, key=lambda item: item[0]["name"])


def catalog_for(plugins: list[tuple[dict, dict[str, Path]]]) -> dict:
    entries = []
    for manifest, _ in plugins:
        name = manifest["name"]
        interface = manifest.get("interface", {})
        entry = {
            "id": name,
            "displayName": interface.get("displayName", name),
            "version": manifest["version"],
            "description": manifest["description"],
        }
        if "homepage" in manifest:
            entry["homepage"] = manifest["homepage"]
        if "keywords" in manifest:
            entry["keywords"] = manifest["keywords"]
        entry["source"] = f"./artifacts/{name}-{manifest['version']}.zip"
        entries.append(entry)
    return {"version": "1", "plugins": entries}


def catalog_bytes(catalog: dict) -> bytes:
    return (json.dumps(catalog, indent=2, ensure_ascii=True) + "\n").encode("ascii")


def write_zip(destination: Path, files: dict[str, Path]) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(
        destination, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9
    ) as archive:
        for name in sorted(files):
            source = files[name]
            mode = source.lstat().st_mode
            if not stat.S_ISREG(mode) or stat.S_ISLNK(mode):
                fail(f"archive input is not a regular file: {source}")
            info = zipfile.ZipInfo(name, FIXED_TIME)
            info.create_system = 3
            info.external_attr = (stat.S_IFREG | 0o644) << 16
            info.compress_type = zipfile.ZIP_DEFLATED
            archive.writestr(info, source.read_bytes(), compress_type=zipfile.ZIP_DEFLATED, compresslevel=9)


def check_catalog(path: Path, expected: dict) -> None:
    actual = read_json(path)
    if actual != expected:
        fail(f"checked-in Kimi catalog is stale: {path}")


def run(root: Path, output: Path, check: bool) -> None:
    plugins = discover(root)
    catalog = catalog_for(plugins)
    catalog_path = output / "marketplace.json"
    if check:
        check_catalog(catalog_path, catalog)
        return
    artifacts = output / "artifacts"
    artifacts.mkdir(parents=True, exist_ok=True)
    expected_names = set()
    for manifest, files in plugins:
        filename = f"{manifest['name']}-{manifest['version']}.zip"
        expected_names.add(filename)
        write_zip(artifacts / filename, files)
    for existing in artifacts.glob("*.zip"):
        if existing.name not in expected_names:
            existing.unlink()
    catalog_path.write_bytes(catalog_bytes(catalog))
    for entry in catalog["plugins"]:
        source = output / entry["source"][2:]
        if not source.is_file():
            fail(f"catalog source was not produced: {source}")


def main() -> int:
    default_root = Path(__file__).resolve().parents[1]
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=default_root)
    parser.add_argument("--output", type=Path)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    root = args.root.resolve()
    output = (args.output or root / ".kimi-plugin").resolve()
    try:
        run(root, output, args.check)
    except ValidationError as error:
        print(f"error: {error}", file=sys.stderr)
        return 1
    action = "validated" if args.check else "built"
    print(f"{action} {EXPECTED_PLUGINS} Kimi plugins")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
