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
  name: string;
  version: string;
  interface: {
    displayName: string;
    shortDescription: string;
    category: string;
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
  "mycommands",
  "myskills",
]);
const reviewedPlugins = new Set(REVIEWED_PLUGIN_ALLOWLIST);

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

export function loadCatalog(): CatalogPlugin[] {
  const marketplace = readJson<MarketplaceManifest>(resolve(marketplaceDir, "marketplace.json"));

  const entries = marketplace.plugins.filter((entry) => reviewedPlugins.has(entry.name));
  if (entries.length !== REVIEWED_PLUGIN_ALLOWLIST.length || new Set(entries.map((entry) => entry.name)).size !== entries.length) {
    throw new Error("reviewed allowlist must map to exactly one marketplace entry per name");
  }
  return entries.map((entry) => {
    const expectedSource = `./plugins/${entry.name}`;
    if (entry.source.path !== expectedSource) throw new Error(`reviewed plugin ${entry.name} must use source ${expectedSource}`);
    const pluginDir = resolve(marketplaceDir, expectedSource);
    const plugin = readJson<PluginManifest>(resolve(pluginDir, ".codex-plugin/plugin.json"));
    if (plugin.name !== entry.name) throw new Error(`reviewed plugin ${entry.name} loaded a manifest for ${plugin.name}`);
    if (!plugin.version || !plugin.interface.displayName || !plugin.interface.category || plugin.interface.capabilities.length === 0 || plugin.interface.capabilities.some((capability) => !capability.trim())) {
      throw new Error(`reviewed plugin ${entry.name} has incomplete own-manifest metadata`);
    }
    if (entry.category !== plugin.interface.category) throw new Error(`reviewed plugin ${entry.name} category differs from its own manifest`);

    return {
      name: entry.name,
      displayName: plugin.interface.displayName,
      shortDescription: plugin.interface.shortDescription,
      category: plugin.interface.category,
      version: plugin.version,
      capabilities: plugin.interface.capabilities,
      components: ["Codex plugin manifest", "Skill instructions"],
      publisher: "VeigaPunk",
      sourceUrl: entry.name === "ds4cc"
        ? `${repositoryUrl}/tree/main/official/ds4cc`
        : `${repositoryUrl}/tree/main/marketplace/plugins/${entry.name}`,
      reviewNotice: "Optional install commands are copyable text only. Independently review the source, license, and capabilities before running one; this app never executes commands.",
      install: {
        codex: `codex plugin add ${entry.name}@ds4cc`,
      },
    };
  });
}
