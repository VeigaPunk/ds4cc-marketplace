import hashlib
import json
import re
import subprocess
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
AUTHORITY = ROOT.parent / "myagents"
INSTALLER_AUTHORITY = "https://github.com/VeigaPunk/myagents"


def installer_command(name: str) -> str:
    return f"""bash -c 'set -euo pipefail; d="$(mktemp -d)"; trap "rm -rf -- \\"$d\\"" EXIT; git clone --depth 1 https://github.com/VeigaPunk/myagents.git "$d/myagents"; node "$d/myagents/bin/{name}.mjs"'"""


def index_source() -> str:
    return (ROOT / "index.html").read_text(encoding="utf-8")


def plugin_chunks() -> list[str]:
    match = re.search(r"const\s+PLUGINS\s*=\s*\[(.*?)\];", index_source(), re.S)
    assert match
    return re.findall(r"\{[^{}]+\}", match.group(1))


def generated_catalog() -> list[dict]:
    source = (ROOT / "rinnegan" / "catalog.js").read_text(encoding="utf-8")
    prefix = "globalThis.DS4CC_RINNEGAN_CATALOG = Object.freeze("
    assert source.startswith(prefix) and source.endswith(");\n")
    return json.loads(source[len(prefix):-3])


class RinneganCatalogTests(unittest.TestCase):
    def test_ordinary_archive_remains_the_exact_19_plugin_catalog(self):
        chunks = plugin_chunks()
        ordinary = [chunk for chunk in chunks if not re.search(r'kind:\s*"page"', chunk)]
        self.assertEqual(len(ordinary), 19)
        self.assertNotIn("the-leanbuilder", "".join(chunks))
        self.assertNotIn("b00mr-install", "".join(chunks))
        self.assertNotIn("z00mr-install", "".join(chunks))

    def test_rinnegan_ordinary_records_are_explicitly_positive_and_page_free(self):
        flagged = {
            re.search(r'n:\s*"([^"]+)"', chunk).group(1)
            for chunk in plugin_chunks()
            if re.search(r"rinnegan:\s*true", chunk) and not re.search(r'kind:\s*"page"', chunk)
        }
        self.assertEqual(flagged, {
            "aaronplug", "ds4cc", "godspeed-core", "heuer-planning", "myagents",
            "punk-records-brain", "the-almanacker", "the-kimiraikoner", "the-musketeer",
            "the-netsshark", "the-puppeteer", "sekhmet", "xbrd-gdsp-fknpft",
        })
        self.assertNotIn("RINNEGAN_HIDE", index_source())
        self.assertIn("record.kind !== \"page\" && record.rinnegan === true", index_source())

    def test_generated_local_records_are_positive_fixed_and_digest_bound(self):
        records = generated_catalog()
        self.assertEqual([record["n"] for record in records], ["the-leanbuilder", "b00mr-install", "z00mr-install"])
        for record in records:
            self.assertIs(record["admitted"], True)
            self.assertIs(record["rinnegan"], True)
            self.assertIs(record["shipped"], True)
        lean = records[0]
        self.assertEqual(lean["provenance"], "local-only")
        card = (AUTHORITY / "rinnegan" / "the-leanbuilder.md").read_bytes()
        self.assertEqual(lean["digest"], hashlib.sha256(card).hexdigest())
        self.assertEqual(lean["action"], "COPY ONCE")
        self.assertEqual(lean["c"], 'myagents lean --run-id "lean-$(date -u +%Y%m%d-%H%M%S)-$$" --target "$PWD" --task "remove needless weight and repair existing manifest registry installer and path wiring"')
        for record in records[1:]:
            self.assertEqual(record["provenance"], INSTALLER_AUTHORITY)
            self.assertEqual(record["bootstrap"], "git-clone-default-branch")
            self.assertEqual(record["localCommand"], record["n"])
            self.assertEqual(record["c"], installer_command(record["n"]))

    def test_unknown_and_unflagged_generated_records_fail_closed(self):
        policy = ROOT / "rinnegan" / "policy.js"
        probe = f"""
const fs = require('node:fs');
const vm = require('node:vm');
const context = {{}};
vm.createContext(context);
vm.runInContext(fs.readFileSync({json.dumps(str(policy))}, 'utf8'), context);
const base = {{n:'the-leanbuilder',kind:'one-shot',action:'COPY ONCE',admitted:true,rinnegan:true,shipped:true,provenance:'local-only',c:'myagents lean',digest:'{'a' * 64}'}};
const results = [context.DS4CC_RINNEGAN_ADMIT(base), context.DS4CC_RINNEGAN_ADMIT({{...base,n:'unknown'}}), context.DS4CC_RINNEGAN_ADMIT({{...base,rinnegan:false}}), context.DS4CC_RINNEGAN_ADMIT({{...base,admitted:undefined}})];
process.stdout.write(JSON.stringify(results));
"""
        result = subprocess.run(["node", "-e", probe], check=True, capture_output=True, text=True)
        self.assertEqual(json.loads(result.stdout), [True, False, False, False])

    def test_leanbuilder_is_absent_from_standard_agent_and_host_surfaces(self):
        standard = [ROOT / ".agents", ROOT / ".grok-plugin", ROOT / ".kimi-plugin"]
        for directory in standard:
            for path in directory.rglob("*"):
                if path.is_file():
                    self.assertNotIn("the-leanbuilder", path.read_text(encoding="utf-8", errors="ignore"), str(path))
        standard_agents = ROOT / "marketplace" / "plugins" / "myagents" / "agents"
        self.assertFalse((standard_agents / "the-leanbuilder.agent.md").exists())
        self.assertNotIn("the-leanbuilder", "\n".join(path.read_text(encoding="utf-8") for path in standard_agents.glob("*.agent.md")))
        self.assertNotIn("the-leanbuilder", "\n".join(plugin_chunks()))

    def test_standalone_authority_is_mandatory_and_packaged_mirror_is_exact(self):
        canonical = sorted(AUTHORITY.glob("the-*.md"))
        packaged = ROOT / "marketplace" / "plugins" / "myagents" / "agents"
        self.assertEqual(len(canonical), 16)
        for card in canonical:
            self.assertEqual(card.read_bytes(), (packaged / f"{card.stem}.agent.md").read_bytes())
        validator = (ROOT / "scripts" / "validate-agent-payloads.mjs").read_text(encoding="utf-8")
        self.assertIn("mandatory standalone canonical authority ../myagents is missing", validator)
        self.assertNotIn("if (await exists(canonicalDir))", validator)

    def test_non_global_distribution_catalog_has_full_pack_and_16_agent_bundles(self):
        root = ROOT / "rinnegan" / "distributions"
        catalog = json.loads((root / "catalog.json").read_text(encoding="utf-8"))
        self.assertEqual(catalog["schema"], "ds4cc.myagents-distributions.v1")
        self.assertEqual(catalog["authority"], "https://github.com/VeigaPunk/myagents")
        self.assertIs(catalog["fullPack"]["leanbuilder"]["discoverableAsAgent"], False)
        self.assertEqual(len(catalog["standaloneAgents"]), 16)
        for record in catalog["standaloneAgents"]:
            bundle = root / record["source"]
            self.assertEqual(record["sha256"], hashlib.sha256(bundle.read_bytes()).hexdigest())
            self.assertEqual(record["installCommand"], installer_command("b00mr-install"))
        self.assertEqual(
            catalog["fullPack"]["installerCommands"],
            [
                {"name": "b00mr-install", "kind": "interactive-installer", "command": installer_command("b00mr-install")},
                {"name": "z00mr-install", "kind": "aio-installer", "command": installer_command("z00mr-install")},
            ],
        )
        self.assertFalse((root / "full-pack" / "the-leanbuilder.md").exists())
        self.assertTrue((root / "full-pack" / "rinnegan" / "the-leanbuilder.md").is_file())

    def test_wall_local_actions_are_copy_only_and_never_browser_execution(self):
        text = index_source()
        self.assertIn('<script src="./rinnegan/catalog.js"></script>', text)
        self.assertIn('<script src="./rinnegan/policy.js"></script>', text)
        self.assertIn('data-copy="${esc(p.c)}"', text)
        self.assertIn('${esc(p.provenance)} · standalone authority', text)
        self.assertIn("const isStandalone = RINNEGAN_STANDALONE.includes(p)", text)
        wall_sources = "\n".join(
            path.read_text(encoding="utf-8")
            for path in (ROOT / "rinnegan").glob("*")
            if path.is_file()
        )
        self.assertNotRegex(wall_sources, r"child_process|spawn\(|exec\(")


if __name__ == "__main__":
    unittest.main()
