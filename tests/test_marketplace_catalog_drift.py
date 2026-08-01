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
    assert len(catalog) == 18
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
    entries = re.findall(r'{\s*n:\s*"([^"]+)"\s*,\s*v:\s*"([^"]+)"', block)
    return {name: version for name, version in entries}


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

    def test_index_orchestration_lanes_reflect_current_routing(self):
        text = (ROOT / "index.html").read_text(encoding="utf-8")
        self.assertNotIn("codex-titanium", text)
        self.assertNotIn("oh-my-openagent", text)
        ssot_path = ROOT / "marketplace/plugins/xbrd-gdsp-fknpft/commands/references/xbreed-shared.md"
        ssot_text = ssot_path.read_text(encoding="utf-8")

        section = re.search(r'<section id="lanes".*?</section>', text, re.S)
        self.assertIsNotNone(section, "missing orchestration lanes section")
        lanes = section.group(0)
        for stale in ("OpenCode lanes", "sisyphus", "HVM2", "libhvm"):
            self.assertNotIn(stale, lanes)
        for stale in ("HVM2", "libhvm"):
            self.assertNotIn(stale, ssot_text, f"{ssot_path} still contains stale transport marker: {stale}")

        declarations = re.search(r">Role declarations</h3>\s*<pre>(.*?)</pre>", lanes, re.S)
        self.assertIsNotNone(declarations, "missing role declarations block")
        routing = declarations.group(1)

        role_routes = {}
        for line in routing.splitlines():
            if not line.strip():
                continue
            role, value = line.split(None, 1)
            role_routes[role] = value.strip()

        def route_for(role: str, expected: str) -> None:
            self.assertIn(role, role_routes, f"missing route for {role}")
            self.assertEqual(role_routes[role], expected)

        route_for("the-judge", "fable 5 · xhigh")
        for role in (
            "the-planner", "the-scout", "the-reviewer", "the-labrat",
            "the-executor", "the-connector", "the-distiller", "the-simplifier",
            "the-revenger", "the-sentinel", "the-critic", "the-mutation-tester",
            "the-scribe",
        ):
            route_for(role, "sonnet · medium")
        route_for("the-netsshark", "host extension")

        gates = re.search(r">Execution gates</h3>\s*<pre>(.*?)</pre>", lanes, re.S)
        self.assertIsNotNone(gates, "missing execution gate block")
        gate_text = gates.group(1)
        gate_lines = [line.strip() for line in gate_text.splitlines() if line.strip()]
        compact = lambda value: " ".join(value.replace("&lt;", "<").replace("&gt;", ">").replace("&amp;", "&").replace("`", "").split())
        compact_ssot = compact(ssot_text)

        self.assertIn(compact("planner wwkd · native"), compact(" ".join(gate_lines)))
        self.assertIn(compact("scout / labrat / executor xask --spark --gs codex → gpt-5.4-mini"), compact(" ".join(gate_lines)))
        normalized_gates = compact(" ".join(gate_lines))
        critic_route = compact("critic Layer-0: heuer-planning → xask --gpt55 --gs -e low codex → gpt-5.6-sol")
        self.assertIn(critic_route, normalized_gates)
        self.assertLess(
            normalized_gates.index("Layer-0: heuer-planning"),
            normalized_gates.index("xask --gpt55 --gs -e low codex", normalized_gates.index("critic")),
        )
        self.assertIn(compact("revenger RECON xask --gpt55 --gs -e high codex → gpt-5.6-sol"), compact(" ".join(gate_lines)))
        self.assertIn(compact("connector xask --spark codex · no --gs"), compact(" ".join(gate_lines)))
        self.assertIn(compact("mutation: single / <=4 xask --spark --gs codex"), compact(" ".join(gate_lines)))
        self.assertIn(compact("mutation: >=5 / breadth xask --effort high --gs codex"), compact(" ".join(gate_lines)))
        self.assertIn(compact("distiller / simplifier / scribe native"), compact(" ".join(gate_lines)))

        compact_lanes = compact(lanes.replace("<code>", " ").replace("</code>", " "))
        required_hvm4_route_markers = (
            "xask gemma",
            "xbreed ask gemma",
            "gemma-hvm",
            "run.sh/run-hvm4.sh",
            "Bend 0.2.38 gen-hvm",
            "HVM4 4.0 control gate",
            "Ollama",
        )
        for segment in required_hvm4_route_markers:
            self.assertIn(compact(segment), compact_lanes, f"website route missing '{segment}'")
            self.assertIn(compact(segment), compact_ssot, f"packaged SSoT route missing '{segment}'")
        for route_text, label in ((compact_lanes, "website"), (compact_ssot, "packaged SSoT")):
            positions = [route_text.index(compact(segment)) for segment in required_hvm4_route_markers]
            self.assertEqual(positions, sorted(positions), f"{label} HVM4 route markers are out of order")
        for segment in (
            "Ollama/Gemma 4",
            "HVM4 controls routing only; tensor inference is not claimed to run in HVM4",
        ):
            self.assertIn(compact(segment), compact_lanes)
        self.assertNotIn("tensor inference runs in HVM4", compact_lanes)

    def test_index_referral_urls_and_disclosures(self):
        text = (ROOT / "index.html").read_text(encoding="utf-8")
        referral_links = [
            "https://www.kimi.com/activities/invite/share?scenario=invite&from=share_poster&invitation_code=W6NGNP",
            "https://opencode.ai/go?ref=GF5DFYD5MJ",
            "https://help.openai.com/en/articles/20001271-codex-referral-promotions",
        ]
        parser = AnchorCollector()
        parser.feed(text)
        hrefs = {anchor.get("href") for anchor in parser.anchors}
        self.assertTrue(set(referral_links).issubset(hrefs))

        for url in referral_links[:2]:
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
            "https://help.openai.com/en/articles/20001271-codex-referral-promotions",
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
