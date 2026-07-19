#!/usr/bin/env python3
"""Build and verify the deterministic, single-plugin OpenAI submission archive."""

from pathlib import Path, PurePosixPath, PureWindowsPath
import stat
import zipfile

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "official" / "ds4cc"
OUTPUT = ROOT / "artifacts" / "ds4cc-openai-submission.zip"
REQUIRED = (
    "ds4cc/.codex-plugin/plugin.json",
    "ds4cc/LICENSE",
    "ds4cc/README.md",
    "ds4cc/assets/logo-512.png",
    "ds4cc/assets/logo.svg",
    "ds4cc/skills/ds4cc-marketplace/SKILL.md",
)
FIXED_TIME = (2026, 1, 1, 0, 0, 0)


def safe_name(name: str) -> bool:
    path = PurePosixPath(name)
    windows_path = PureWindowsPath(name)
    return bool(name) and "\x00" not in name and "\\" not in name and not path.is_absolute() and not windows_path.is_absolute() and not windows_path.drive and ".." not in path.parts and path.as_posix() == name


def source_files(source: Path = SOURCE) -> list[tuple[Path, str]]:
    if stat.S_ISLNK(source.lstat().st_mode):
        raise ValueError(f"refusing symbolic link source: {source}")
    files: list[tuple[Path, str]] = []
    for path in sorted(source.rglob("*"), key=lambda item: item.as_posix()):
        mode = path.lstat().st_mode
        if stat.S_ISLNK(mode):
            raise ValueError(f"refusing symbolic link: {path.relative_to(source)}")
        if path.is_dir():
            continue
        if not path.is_file():
            raise ValueError(f"refusing non-regular file: {path.relative_to(source)}")
        relative = path.relative_to(source).as_posix()
        archive_name = f"ds4cc/{relative}"
        if not safe_name(archive_name):
            raise ValueError(f"unsafe archive name: {archive_name}")
        files.append((path, archive_name))
    names = tuple(name for _, name in files)
    if names != REQUIRED:
        missing = sorted(set(REQUIRED) - set(names))
        extra = sorted(set(names) - set(REQUIRED))
        details = "; ".join(part for part in (f"missing: {', '.join(missing)}" if missing else "", f"extra: {', '.join(extra)}" if extra else "") if part)
        raise ValueError(f"unexpected submission content ({details})")
    return files


def verify_archive(output: Path, expected_names: tuple[str, ...]) -> None:
    with zipfile.ZipFile(output) as archive:
        names = archive.namelist()
        if names != list(expected_names) or len(names) != len(set(names)):
            raise ValueError("archive order, uniqueness, or contents differ from the exact manifest")
        if any(not safe_name(name) or not name.startswith("ds4cc/") for name in names):
            raise ValueError("archive contains an unsafe or out-of-scope path")
        for info in archive.infolist():
            mode = info.external_attr >> 16
            if info.date_time != FIXED_TIME:
                raise ValueError(f"archive entry has a non-deterministic timestamp: {info.filename}")
            if info.create_system != 3:
                raise ValueError(f"archive entry has a non-Unix platform: {info.filename}")
            if info.compress_type != zipfile.ZIP_DEFLATED:
                raise ValueError(f"archive entry is not ZIP_DEFLATED: {info.filename}")
            if info.is_dir() or not stat.S_ISREG(mode) or stat.S_IMODE(mode) != 0o644:
                raise ValueError(f"archive entry is not a regular mode-0644 file: {info.filename}")
            archive.read(info)


def build_archive(source: Path = SOURCE, output: Path = OUTPUT) -> None:
    files = source_files(source)
    output.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for path, name in files:
            info = zipfile.ZipInfo(name, FIXED_TIME)
            info.create_system = 3
            info.external_attr = (stat.S_IFREG | 0o644) << 16
            info.compress_type = zipfile.ZIP_DEFLATED
            archive.writestr(info, path.read_bytes(), compress_type=zipfile.ZIP_DEFLATED, compresslevel=9)
    verify_archive(output, REQUIRED)


def main() -> None:
    try:
        build_archive()
    except (OSError, ValueError, zipfile.BadZipFile) as error:
        raise SystemExit(str(error)) from error
    print(f"verified {len(REQUIRED)} files in {OUTPUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
