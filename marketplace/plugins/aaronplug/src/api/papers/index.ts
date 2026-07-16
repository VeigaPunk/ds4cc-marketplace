// Papers cascade: arxiv → semantic-scholar → sci-hub (+ pdf2md).
//
// Tier strategy (mode=auto):
//   1. scihub      — HTML viewer → iframe/object src → PDF → markdown (primary — full text)
//   2. arxiv       — DOI → arxiv-id → e-print tarball → LaTeX source (STEM preprint fallback)
//   3. s2          — Semantic Scholar abstract + TLDR (metadata-only last resort)
// mode=<tier>      — force a single tier, skip cascade
//
// Return shape is uniform: PaperResult with `tier` naming which source won.

import { fetchArxiv } from "./arxiv";
import { fetchSemanticScholar } from "./semantic-scholar";
import { fetchScihub } from "./scihub";

export type PaperTier = "arxiv" | "s2" | "scihub";
export type PaperMode = "auto" | PaperTier;

export interface PaperResult {
  doi: string;
  tier: PaperTier;
  format: "latex" | "markdown" | "abstract";
  text: string;
  meta?: Record<string, unknown>;
}

const TIERS: Record<PaperTier, (doi: string) => Promise<PaperResult>> = {
  arxiv: fetchArxiv,
  s2: fetchSemanticScholar,
  scihub: fetchScihub,
};

export async function fetchPaper(doi: string, mode: PaperMode = "auto"): Promise<PaperResult> {
  const normalized = doi.replace(/^https?:\/\/(dx\.)?doi\.org\//i, "").trim();

  if (mode !== "auto") {
    return TIERS[mode](normalized);
  }

  const order: PaperTier[] = ["scihub", "arxiv", "s2"];
  const failures: Array<{ tier: PaperTier; error: string }> = [];

  for (const tier of order) {
    try {
      const result = await TIERS[tier](normalized);
      if (result.text && result.text.trim().length > 0) {
        if (failures.length > 0) {
          result.meta = { ...result.meta, tried: failures };
        }
        return result;
      }
      failures.push({ tier, error: "empty result" });
    } catch (error: unknown) {
      failures.push({
        tier,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  throw new Error(
    `All tiers failed for DOI ${normalized}: ${JSON.stringify(failures)}`
  );
}
