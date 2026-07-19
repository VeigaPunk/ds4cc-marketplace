import hashlib
import importlib.util
import os
from pathlib import Path
import shutil
import stat
import tempfile
import unittest
import zipfile

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("build_ds4cc_submission", ROOT / "scripts" / "build-ds4cc-submission.py")
assert SPEC and SPEC.loader
builder = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(builder)


class SubmissionBundleTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        self.source = self.root / "ds4cc"
        shutil.copytree(ROOT / "official" / "ds4cc", self.source)

    def build(self, name="bundle.zip"):
        output = self.root / name
        builder.build_archive(self.source, output)
        return output

    def test_two_builds_have_identical_sha256_and_exact_names(self):
        first, second = self.build("first.zip"), self.build("second.zip")
        self.assertEqual(hashlib.sha256(first.read_bytes()).digest(), hashlib.sha256(second.read_bytes()).digest())
        with zipfile.ZipFile(first) as archive:
            self.assertEqual(archive.namelist(), list(builder.REQUIRED))

    def test_rejects_extra_file(self):
        (self.source / "skills" / "extra.md").write_text("not reviewed", encoding="utf-8")
        with self.assertRaisesRegex(ValueError, "unexpected submission content"):
            self.build()

    def test_rejects_symlink(self):
        link = self.source / "assets" / "linked-logo.svg"
        try:
            link.symlink_to(self.source / "assets" / "logo.svg")
        except OSError as error:
            self.skipTest(f"symlinks unavailable: {error}")
        with self.assertRaisesRegex(ValueError, "symbolic link"):
            self.build()

    def test_safe_name_rejects_traversal_absolute_and_backslash(self):
        for unsafe in ("", "../ds4cc/file", "ds4cc/../file", "/ds4cc/file", "C:/ds4cc/file", "ds4cc\\file", "ds4cc/file\x00hidden"):
            with self.subTest(unsafe=unsafe):
                self.assertFalse(builder.safe_name(unsafe))
        self.assertTrue(builder.safe_name("ds4cc/assets/logo.svg"))

    def test_archive_entries_are_regular_mode_0644(self):
        with zipfile.ZipFile(self.build()) as archive:
            for info in archive.infolist():
                mode = info.external_attr >> 16
                self.assertTrue(stat.S_ISREG(mode), info.filename)
                self.assertEqual(stat.S_IMODE(mode), 0o644, info.filename)
                self.assertEqual(info.date_time, builder.FIXED_TIME, info.filename)
                self.assertEqual(info.create_system, 3, info.filename)
                self.assertEqual(info.compress_type, zipfile.ZIP_DEFLATED, info.filename)

    def test_rejects_source_root_symlink(self):
        link = self.root / "linked-source"
        try:
            link.symlink_to(self.source, target_is_directory=True)
        except OSError as error:
            self.skipTest(f"symlinks unavailable: {error}")
        with self.assertRaisesRegex(ValueError, "symbolic link source"):
            builder.source_files(link)

    def test_rejects_fifo(self):
        fifo = self.source / "assets" / "pipe"
        try:
            os.mkfifo(fifo)
        except (AttributeError, OSError) as error:
            self.skipTest(f"FIFO unavailable: {error}")
        with self.assertRaisesRegex(ValueError, "non-regular file"):
            builder.source_files(self.source)

    def test_verify_archive_rejects_mutated_envelope(self):
        original = self.build()
        mutations = {
            "timestamp": lambda info: setattr(info, "date_time", (2025, 1, 1, 0, 0, 0)),
            "platform": lambda info: setattr(info, "create_system", 0),
            "compression": lambda info: setattr(info, "compress_type", zipfile.ZIP_STORED),
            "permissions": lambda info: setattr(info, "external_attr", (stat.S_IFREG | 0o600) << 16),
        }
        with zipfile.ZipFile(original) as archive:
            entries = [(info, archive.read(info)) for info in archive.infolist()]
        for label, mutate in mutations.items():
            with self.subTest(label=label):
                output = self.root / f"mutated-{label}.zip"
                with zipfile.ZipFile(output, "w") as archive:
                    for index, (source_info, content) in enumerate(entries):
                        info = zipfile.ZipInfo(source_info.filename, source_info.date_time)
                        info.create_system = source_info.create_system
                        info.external_attr = source_info.external_attr
                        info.compress_type = source_info.compress_type
                        if index == 0:
                            mutate(info)
                        archive.writestr(info, content)
                with self.assertRaisesRegex(ValueError, "archive entry"):
                    builder.verify_archive(output, builder.REQUIRED)

    def test_official_zip_forbids_excluded_names_and_content(self):
        excluded = ("aaronplug", "spoderman", "xbrd-gdsp-fknpft", "the-puppeteer", "godspeed-codex-command", "godspeed-core", "myagents", "xask")
        with zipfile.ZipFile(self.build()) as archive:
            for info in archive.infolist():
                name = info.filename.lower()
                content = archive.read(info).lower()
                for term in excluded:
                    self.assertNotIn(term, name)
                    self.assertNotIn(term.encode(), content, f"{term} in {info.filename}")

    def test_official_skill_is_browse_tool_only(self):
        skill = (self.source / "skills" / "ds4cc-marketplace" / "SKILL.md").read_text(encoding="utf-8").lower()
        self.assertIn("browse_ds4cc_marketplace", skill)
        self.assertIn("never execute", skill)
        for forbidden in ("plugin marketplace add", "plugin list", "myagents", "spoderman", "aaronplug", "godspeed", "xask"):
            self.assertNotIn(forbidden, skill)


if __name__ == "__main__":
    unittest.main()
