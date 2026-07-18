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
  repositoryUrl: string;
  install: {
    codex: string;
    copilot: string;
    claude: string;
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

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

export function loadCatalog(): CatalogPlugin[] {
  const marketplace = readJson<MarketplaceManifest>(resolve(marketplaceDir, "marketplace.json"));

  return marketplace.plugins.map((entry) => {
    const pluginDir = resolve(marketplaceDir, entry.source.path);
    const plugin = readJson<PluginManifest>(resolve(pluginDir, ".codex-plugin/plugin.json"));

    return {
      name: entry.name,
      displayName: plugin.interface.displayName,
      shortDescription: plugin.interface.shortDescription,
      category: entry.category,
      version: plugin.version,
      capabilities: plugin.interface.capabilities,
      repositoryUrl: `${repositoryUrl}/tree/main/marketplace/plugins/${entry.name}`,
      install: {
        codex: `codex plugin add ${entry.name}`,
        copilot: `copilot plugin install ${entry.name}@ds4cc`,
        claude: `claude plugin install ${entry.name}@ds4cc`,
      },
    };
  });
}
