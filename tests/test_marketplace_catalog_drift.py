import json
import re
import unittest
from html.parser import HTMLParser
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]


class AnchorCollector(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.anchors: list[dict[str, str]] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag == "a":
            self.anchors.append({key: value or "" for key, value in attrs})


def canonical_plugin_versions(root: Path = ROOT) -> dict[str, str]:
    catalog = {}
    for path in sorted((root / "marketplace" / "plugins").glob("*/plugin.json")):
        manifest = json.loads(path.read_text(encoding="utf-8"))
        catalog[path.parent.name] = manifest["version"]
    assert len(catalog) == 20
    return catalog


def read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def list_map(entries) -> dict[str, str]:
    return {entry["id"] if "id" in entry else entry["name"]: entry.get("version", "") for entry in entries}


def source_path(entry: dict[str, Any]) -> str:
    source = entry.get("source", "")
    if isinstance(source, str):
        return source
    return source.get("path", source.get("source", ""))


def expected_path(name: str) -> str:
    return f"./marketplace/plugins/{name}"


def read_index_plugins(path: Path = ROOT / "index.html") -> dict[str, str]:
    text = path.read_text(encoding="utf-8")
    match = re.search(r"const\s+PLUGINS\s*=\s*\[(.*?)\];", text, re.S)
    assert match, "missing PLUGINS array"
    block = match.group(1)
    catalog = {}
    for chunk in re.findall(r"\{[^{}]+\}", block):
        if re.search(r'kind:\s*"page"', chunk):
            continue
        name = re.search(r'n:\s*"([^"]+)"', chunk)
        version = re.search(r'v:\s*"([^"]+)"', chunk)
        if name and version:
            catalog[name.group(1)] = version.group(1)
    return catalog


class MarketplaceCatalogDriftTests(unittest.TestCase):
    def setUp(self):
        self.canonical = canonical_plugin_versions()

    def assert_names(self, catalog_path: Path, items: dict[str, str], names_only: bool = False) -> None:
        self.assertEqual(sorted(items), sorted(self.canonical))
        self.assertEqual(len(items), len(self.canonical))
        if names_only:
            return
        for name, expected_version in self.canonical.items():
            self.assertEqual(
                items[name], expected_version, f"{catalog_path}: version drift for {name}"
            )

    def assert_host_descriptors(
        self,
        catalog_path: Path,
        entries: list[dict[str, Any]],
        key: str = "name",
    ) -> None:
        by_name = {entry.get("id", entry.get(key)): entry for entry in entries}
        self.assertEqual(sorted(by_name), sorted(self.canonical))
        self.assertEqual(len(by_name), len(self.canonical))
        for name, expected_version in self.canonical.items():
            entry = by_name[name]
            self.assertEqual(source_path(entry), expected_path(name), f"{catalog_path}: source path drift for {name}")
            if "version" in entry:
                self.assertEqual(entry["version"], expected_version, f"{catalog_path}: version drift for {name}")

    def test_kimi_catalog_names_and_versions(self):
        catalog = read_json(ROOT / ".kimi-plugin" / "marketplace.json")
        self.assert_names(ROOT / ".kimi-plugin/marketplace.json", list_map(catalog["plugins"]))

    def test_legacy_crush_catalog_is_absent(self):
        self.assertFalse((ROOT / ".crush-plugin" / "marketplace.json").exists())

    def test_grok_catalog_names_and_versions(self):
        catalog = read_json(ROOT / ".grok-plugin" / "marketplace.json")
        self.assert_names(ROOT / ".grok-plugin/marketplace.json", list_map(catalog["plugins"]))


    def test_codex_catalog_host_descriptors(self):
        catalog = read_json(ROOT / ".agents" / "plugins" / "marketplace.json")
        self.assert_host_descriptors(ROOT / ".agents/plugins/marketplace.json", catalog["plugins"])


    def test_codex_catalog_names(self):
        catalog = read_json(ROOT / ".agents" / "plugins" / "marketplace.json")
        self.assert_names(
            ROOT / ".agents/plugins/marketplace.json",
            list_map(catalog["plugins"]),
            names_only=True,
        )

    def test_index_catalog_names_and_versions(self):
        catalog = read_index_plugins()
        self.assert_names(
            ROOT / "index.html",
            catalog,
        )










    def test_index_referral_urls_and_disclosures(self):
        text = (ROOT / "index.html").read_text(encoding="utf-8")
        referral_links = [
            "https://www.kimi.com/activities/invite/share?scenario=invite&from=share_poster&invitation_code=W6NGNP",
            "https://opencode.ai/go?ref=GF5DFYD5MJ",
            "https://www.alibabacloud.com/campaign/benefits?referral_code=A927SY",
        ]
        parser = AnchorCollector()
        parser.feed(text)
        hrefs = {anchor.get("href") for anchor in parser.anchors}
        self.assertTrue(set(referral_links).issubset(hrefs))

        for url in referral_links:
            note = re.search(rf'<p class="note">(?:(?!</p>).)*href="{re.escape(url).replace("&", "&amp;")}"(?:(?!</p>).)*</p>', text, re.S)
            self.assertIsNotNone(note, f"missing adjacent disclosure for {url}")
            self.assertIn("DS4CC may receive a benefit if", note.group(0))
            self.assertRegex(note.group(0), r"(?i)eligibility.*offer vary")

        self.assertNotRegex(text, r'(?i)<a[^>]+href="[^"]*(?:grok|x\.ai)[^"]*"[^>]*>[^<]*(?:invite|referral)')

    def test_index_referral_links_have_target_blank_and_sponsored_rels(self):
        text = (ROOT / "index.html").read_text(encoding="utf-8")
        referral_links = [
            "https://www.kimi.com/activities/invite/share?scenario=invite&from=share_poster&invitation_code=W6NGNP",
            "https://opencode.ai/go?ref=GF5DFYD5MJ",
            "https://www.alibabacloud.com/campaign/benefits?referral_code=A927SY",
        ]

        parser = AnchorCollector()
        parser.feed(text)
        links = {anchor["href"]: anchor for anchor in parser.anchors if "href" in anchor}
        for url in referral_links:
            self.assertIn(url, links)
            self.assertEqual(links[url].get("target"), "_blank")
            rel_tokens = set(links[url].get("rel", "").split())
            self.assertTrue({"sponsored", "nofollow", "noopener"}.issubset(rel_tokens))

    def test_grok_plugin_index_names_and_versions(self):
        catalog = read_json(ROOT / ".grok-plugin" / "plugin-index.json")
        self.assert_names(
            ROOT / ".grok-plugin/plugin-index.json",
            {name: value["version"] for name, value in catalog["plugins"].items()},
        )


if __name__ == "__main__":
    unittest.main()
