import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export interface CatalogPlugin {
  name: string;
  displayName: string;
  shortDescription: string;
  category: string;
  version: string;
  capabilities: string[];
  components: string[];
  publisher: string;
  sourceUrl: string;
  reviewNotice: string;
  install: {
    codex: string;
  };
}

interface MarketplaceManifest {
  plugins: Array<{
    name: string;
    category: string;
    source: { path: string };
  }>;
}

interface PluginManifest {
  version: string;
  interface: {
    displayName: string;
    shortDescription: string;
    capabilities: string[];
  };
}

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const marketplaceDir = resolve(repositoryRoot, "marketplace");
const repositoryUrl = "https://github.com/VeigaPunk/ds4cc-marketplace";
export const REVIEWED_PLUGIN_ALLOWLIST = Object.freeze([
  "agent-wall",
  "ds4cc",
  "infinizoom",
  "myagents",
  "mycommands",
  "myskills",
]);
const reviewedPlugins = new Set(REVIEWED_PLUGIN_ALLOWLIST);

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

export function loadCatalog(): CatalogPlugin[] {
  const marketplace = readJson<MarketplaceManifest>(resolve(marketplaceDir, "marketplace.json"));

  return marketplace.plugins.filter((entry) => reviewedPlugins.has(entry.name)).map((entry) => {
    const pluginDir = resolve(marketplaceDir, entry.source.path);
    const plugin = readJson<PluginManifest>(resolve(pluginDir, ".codex-plugin/plugin.json"));

    return {
      name: entry.name,
      displayName: plugin.interface.displayName,
      shortDescription: plugin.interface.shortDescription,
      category: entry.category,
      version: plugin.version,
      capabilities: plugin.interface.capabilities,
      components: ["Codex plugin manifest", "Skill instructions"],
      publisher: "VeigaPunk",
      sourceUrl: `${repositoryUrl}/tree/main/marketplace/plugins/${entry.name}`,
      reviewNotice: "Review the source, license, and requested capabilities before install. This app never installs software.",
      install: {
        codex: `codex plugin add ${entry.name}@ds4cc`,
      },
    };
  });
}
