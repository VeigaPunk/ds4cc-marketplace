import { readFile } from "node:fs/promises";
import path from "node:path";

export async function buildRinneganCatalog(root) {
  const [admission, installers] = await Promise.all([
    readFile(path.join(root, "rinnegan", "admission.json"), "utf8").then(JSON.parse),
    readFile(path.join(root, "rinnegan", "installers.json"), "utf8").then(JSON.parse),
  ]);
  const lean = admission.records[0];
  const installerDescriptions = {
    "b00mr-install": "Interactive installer for the full pack or selected public standalone agents, with explicit safety prompts and two consent gates.",
    "z00mr-install": "Noninteractive AIO full-pack installer for copy, paste, and watch operation.",
  };
  const records = [
    {
      n: lean.name,
      v: "local",
      cat: "agents",
      d: "One bounded remediation pass for needless weight and broken manifest, registry, installer, or path wiring.",
      c: lean.command,
      kind: lean.launcherKind,
      action: "COPY ONCE",
      admitted: lean.admitted,
      rinnegan: lean.rinnegan,
      shipped: lean.shipped,
      provenance: lean.source,
      digest: lean.sha256,
    },
    ...installers.records.map((record) => ({
      n: record.name,
      v: "main",
      cat: "installers",
      d: installerDescriptions[record.name],
      c: record.command,
      localCommand: record.localCommand,
      kind: record.kind,
      action: record.name === "b00mr-install" ? "COPY INTERACTIVE" : "COPY AIO",
      admitted: record.admitted,
      rinnegan: record.rinnegan,
      shipped: record.shipped,
      provenance: record.source,
      bootstrap: record.bootstrap,
    })),
  ];
  if (records.some((record) => record.admitted !== true || record.rinnegan !== true || record.shipped !== true)) {
    throw new Error("generated Rinnegan records must be positively admitted, flagged, and shipped");
  }
  return records;
}

export function serializeRinneganCatalog(records) {
  return `globalThis.DS4CC_RINNEGAN_CATALOG = Object.freeze(${JSON.stringify(records, null, 2)});\n`;
}
