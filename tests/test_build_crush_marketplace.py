import importlib.util
import json
import subprocess
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts" / "build-crush-marketplace.py"
SPEC = importlib.util.spec_from_file_location("build_crush_marketplace", SCRIPT)
BUILDER = importlib.util.module_from_spec(SPEC)
assert SPEC.loader
SPEC.loader.exec_module(BUILDER)


class CrushMarketplaceTests(unittest.TestCase):
    def build(self, output: Path) -> subprocess.CompletedProcess:
        return subprocess.run(
            ["python3", str(SCRIPT), "--root", str(ROOT), "--output", str(output)],
            text=True,
            capture_output=True,
            check=True,
        )

    def test_builds_16_plugin_catalog(self):
        with tempfile.TemporaryDirectory() as tmp:
            output = Path(tmp)
            self.build(output)
            catalog = json.loads((output / "marketplace.json").read_text())
            self.assertEqual(catalog["name"], "ds4cc")
            self.assertEqual(catalog["owner"], {"name": "VeigaPunk"})
            self.assertEqual(catalog["metadata"]["version"], "0.2.0")
            self.assertEqual(len(catalog["plugins"]), 16)
            self.assertEqual(
                [entry["name"] for entry in catalog["plugins"]],
                sorted(entry["name"] for entry in catalog["plugins"]),
            )
            for entry in catalog["plugins"]:
                self.assertIn("skills", entry)
                self.assertTrue(entry["skills"].startswith("./"))
                plugin_dir = ROOT / "marketplace" / "plugins" / entry["name"]
                self.assertTrue(plugin_dir.is_dir())
                self.assertTrue((plugin_dir / "plugin.json").is_file())
                self.assertTrue((plugin_dir / entry["skills"]).is_dir())

    def test_deterministic_catalog(self):
        with tempfile.TemporaryDirectory() as first_tmp, tempfile.TemporaryDirectory() as second_tmp:
            first = Path(first_tmp)
            second = Path(second_tmp)
            self.build(first)
            self.build(second)
            self.assertEqual(
                (first / "marketplace.json").read_bytes(),
                (second / "marketplace.json").read_bytes(),
            )

    def test_check_validates_checked_in_catalog(self):
        result = subprocess.run(
            ["python3", str(SCRIPT), "--root", str(ROOT), "--check"],
            text=True,
            capture_output=True,
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("validated 16", result.stdout)

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
        path = plugin / "plugin.json"
        path.write_text(json.dumps(manifest))
        return temporary, plugin, path

    def assert_rejected(self, updates, message):
        temporary, _, path = self.fixture(updates)
        with temporary:
            with self.assertRaisesRegex(BUILDER.ValidationError, message):
                BUILDER.load_plugin(path)

    def test_rejects_traversal(self):
        self.assert_rejected({"skills": "./../skills"}, "traversal")

    def test_rejects_bad_name_version_and_missing_skills(self):
        self.assert_rejected({"name": "Bad_Name"}, "invalid plugin name")
        self.assert_rejected({"version": "1.2"}, "invalid semantic version")
        self.assert_rejected({"version": "1.2.3-01"}, "invalid semantic version")
        self.assert_rejected({"name": "other-plugin"}, "does not match directory")
        self.assert_rejected({"skills": "./missing/"}, "does not exist")

    def test_rejects_plugin_without_skills(self):
        temporary, plugin, path = self.fixture()
        with temporary:
            import shutil
            shutil.rmtree(plugin / "skills" / "safe-skill")
            with self.assertRaisesRegex(BUILDER.ValidationError, "no skills"):
                BUILDER.load_plugin(path)


if __name__ == "__main__":
    unittest.main()
