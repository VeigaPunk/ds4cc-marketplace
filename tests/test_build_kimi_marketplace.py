import hashlib
import importlib.util
import json
import stat
import subprocess
import tempfile
import unittest
import zipfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts" / "build-kimi-marketplace.py"
SPEC = importlib.util.spec_from_file_location("build_kimi_marketplace", SCRIPT)
BUILDER = importlib.util.module_from_spec(SPEC)
assert SPEC.loader
SPEC.loader.exec_module(BUILDER)


class KimiMarketplaceTests(unittest.TestCase):
    def build(self, output: Path) -> subprocess.CompletedProcess:
        return subprocess.run(
            ["python3", str(SCRIPT), "--root", str(ROOT), "--output", str(output)],
            text=True,
            capture_output=True,
            check=True,
        )

    def test_builds_15_exact_deterministic_archives_and_catalog(self):
        with tempfile.TemporaryDirectory() as first_tmp, tempfile.TemporaryDirectory() as second_tmp:
            first = Path(first_tmp)
            second = Path(second_tmp)
            self.build(first)
            self.build(second)
            catalog = json.loads((first / "marketplace.json").read_text())
            self.assertEqual(catalog["version"], "1")
            self.assertEqual(len(catalog["plugins"]), 15)
            self.assertEqual(
                [entry["id"] for entry in catalog["plugins"]],
                sorted(entry["id"] for entry in catalog["plugins"]),
            )
            artifacts = sorted((first / "artifacts").glob("*.zip"))
            self.assertEqual(len(artifacts), 15)

            for entry in catalog["plugins"]:
                artifact = first / entry["source"][2:]
                twin = second / entry["source"][2:]
                self.assertTrue(artifact.is_file())
                self.assertEqual(artifact.read_bytes(), twin.read_bytes())
                self.assertEqual(
                    hashlib.sha256(artifact.read_bytes()).hexdigest(),
                    hashlib.sha256(twin.read_bytes()).hexdigest(),
                )
                manifest_path = ROOT / "marketplace" / "plugins" / entry["id"] / "kimi.plugin.json"
                manifest, expected_files = BUILDER.load_plugin(manifest_path)
                self.assertEqual(entry["version"], manifest["version"])
                self.assertEqual(entry["description"], manifest["description"])
                with zipfile.ZipFile(artifact) as archive:
                    self.assertEqual(archive.namelist(), sorted(expected_files))
                    self.assertIn("kimi.plugin.json", archive.namelist())
                    for info in archive.infolist():
                        self.assertEqual(info.date_time, BUILDER.FIXED_TIME)
                        self.assertEqual(info.compress_type, zipfile.ZIP_DEFLATED)
                        self.assertEqual(info.create_system, 3)
                        self.assertEqual((info.external_attr >> 16) & 0o177777, stat.S_IFREG | 0o644)
                    archived_manifest = json.loads(archive.read("kimi.plugin.json"))
                    self.assertEqual(archived_manifest["name"], entry["id"])
                    self.assertEqual(archived_manifest["version"], entry["version"])

    def test_root_manifest_supports_direct_repository_install(self):
        manifest, files = BUILDER.load_plugin(ROOT / "kimi.plugin.json")
        self.assertEqual(manifest["name"], "ds4cc-marketplace")
        self.assertEqual(
            manifest["skills"], "./marketplace/plugins/ds4cc/skills/"
        )
        self.assertIn(
            "marketplace/plugins/ds4cc/skills/ds4cc-docs/SKILL.md", files
        )

    def fixture(self, manifest_updates=None):
        temporary = tempfile.TemporaryDirectory()
        plugin = Path(temporary.name) / "safe-plugin"
        skill = plugin / "skills" / "safe-skill"
        skill.mkdir(parents=True)
        (skill / "SKILL.md").write_text(
            "---\nname: safe-skill\ndescription: Safe test skill.\n---\n"
        )
        manifest = {
            "name": "safe-plugin",
            "version": "1.2.3",
            "description": "Safe plugin",
            "skills": "./skills/",
        }
        if manifest_updates:
            manifest.update(manifest_updates)
        path = plugin / "kimi.plugin.json"
        path.write_text(json.dumps(manifest))
        return temporary, plugin, path

    def assert_rejected(self, updates, message):
        temporary, _, path = self.fixture(updates)
        with temporary:
            with self.assertRaisesRegex(BUILDER.ValidationError, message):
                BUILDER.load_plugin(path)

    def test_rejects_traversal(self):
        self.assert_rejected({"skills": "./../skills"}, "traversal")

    def test_rejects_unsupported_agents(self):
        self.assert_rejected({"agents": "./agents/"}, "agents are unsupported")

    def test_rejects_symlink(self):
        temporary, plugin, path = self.fixture()
        with temporary:
            (plugin / "skills" / "linked").symlink_to(plugin / "skills" / "safe-skill", target_is_directory=True)
            with self.assertRaisesRegex(BUILDER.ValidationError, "symlink"):
                BUILDER.load_plugin(path)

    def test_rejects_bad_name_version_mismatch_and_frontmatter(self):
        self.assert_rejected({"name": "Bad_Name"}, "invalid plugin name")
        self.assert_rejected({"version": "1.2"}, "semantic version")
        self.assert_rejected({"version": "1.2.3-01"}, "semantic version")
        self.assert_rejected({"name": "other-plugin"}, "does not match directory")
        temporary, plugin, path = self.fixture()
        with temporary:
            (plugin / "skills" / "safe-skill" / "SKILL.md").write_text(
                "---\nname: safe-skill\ndescription:\n---\n"
            )
            with self.assertRaisesRegex(BUILDER.ValidationError, "description is empty"):
                BUILDER.load_plugin(path)

    def test_check_validates_checked_in_catalog_without_artifacts(self):
        result = subprocess.run(
            ["python3", str(SCRIPT), "--root", str(ROOT), "--check"],
            text=True,
            capture_output=True,
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("validated 15", result.stdout)
        with tempfile.TemporaryDirectory() as temporary:
            output = Path(temporary)
            (output / "marketplace.json").write_bytes(
                (ROOT / ".kimi-plugin" / "marketplace.json").read_bytes()
            )
            before = sorted(path.relative_to(output) for path in output.rglob("*"))
            result = subprocess.run(
                [
                    "python3",
                    str(SCRIPT),
                    "--root",
                    str(ROOT),
                    "--output",
                    str(output),
                    "--check",
                ],
                text=True,
                capture_output=True,
            )
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertEqual(
                sorted(path.relative_to(output) for path in output.rglob("*")), before
            )


if __name__ == "__main__":
    unittest.main()
