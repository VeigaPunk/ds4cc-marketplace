#!/usr/bin/env python3
"""Build and verify the deterministic, single-plugin OpenAI submission archive."""

from pathlib import Path, PurePosixPath
import stat
import zipfile

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "marketplace" / "plugins" / "ds4cc"
OUTPUT = ROOT / "artifacts" / "ds4cc-openai-submission.zip"
REQUIRED = {
    "ds4cc/.codex-plugin/plugin.json",
    "ds4cc/LICENSE",
    "ds4cc/README.md",
    "ds4cc/skills/ds4cc-docs/SKILL.md",
    "ds4cc/assets/logo.svg",
    "ds4cc/assets/logo-512.png",
}
ALLOWED_ROOTS = {".codex-plugin", "assets", "skills", "LICENSE", "README.md"}
FIXED_TIME = (2026, 1, 1, 0, 0, 0)


def safe_name(name: str) -> bool:
    path = PurePosixPath(name)
    return bool(name) and not path.is_absolute() and "\\" not in name and ".." not in path.parts


def source_files() -> list[tuple[Path, str]]:
    files: list[tuple[Path, str]] = []
    for path in sorted(SOURCE.rglob("*"), key=lambda item: item.as_posix()):
        mode = path.lstat().st_mode
        if stat.S_ISLNK(mode):
            raise SystemExit(f"refusing symbolic link: {path.relative_to(ROOT)}")
        if path.is_dir():
            continue
        if not path.is_file():
            raise SystemExit(f"refusing non-regular file: {path.relative_to(ROOT)}")
        relative = path.relative_to(SOURCE).as_posix()
        if relative.split("/", 1)[0] not in ALLOWED_ROOTS:
            raise SystemExit(f"unexpected submission content: {relative}")
        archive_name = f"ds4cc/{relative}"
        if not safe_name(archive_name):
            raise SystemExit(f"unsafe archive name: {archive_name}")
        files.append((path, archive_name))
    names = {name for _, name in files}
    missing = REQUIRED - names
    if missing:
        raise SystemExit(f"missing required submission files: {', '.join(sorted(missing))}")
    return files


def verify_archive(expected_names: list[str]) -> None:
    with zipfile.ZipFile(OUTPUT) as archive:
        names = archive.namelist()
        if names != expected_names or len(names) != len(set(names)):
            raise SystemExit("archive order, uniqueness, or contents differ from the source plan")
        if any(not safe_name(name) or not name.startswith("ds4cc/") for name in names):
            raise SystemExit("archive contains an unsafe or out-of-scope path")
        if REQUIRED - set(names):
            raise SystemExit("archive does not contain all required files")
        for info in archive.infolist():
            if info.is_dir() or (info.external_attr >> 16) & 0o170000 not in (0, stat.S_IFREG):
                raise SystemExit(f"archive contains a non-regular entry: {info.filename}")
            archive.read(info)


def main() -> None:
    files = source_files()
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(OUTPUT, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for path, name in files:
            info = zipfile.ZipInfo(name, FIXED_TIME)
            info.create_system = 3
            info.external_attr = (stat.S_IFREG | 0o644) << 16
            info.compress_type = zipfile.ZIP_DEFLATED
            archive.writestr(info, path.read_bytes(), compress_type=zipfile.ZIP_DEFLATED, compresslevel=9)
    verify_archive([name for _, name in files])
    print(f"verified {len(files)} files in {OUTPUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
