// Tier 2 — Semantic Scholar abstract + TLDR fetch.

import type { PaperResult } from "./index";

interface S2Author { name: string }
interface S2Tldr { text: string }
interface S2Response {
  title?: string;
  abstract?: string;
  tldr?: S2Tldr;
  authors?: S2Author[];
  year?: number;
  venue?: string;
  externalIds?: { CorpusId?: number };
}

export async function fetchSemanticScholar(doi: string): Promise<PaperResult> {
  const url = `https://api.semanticscholar.org/graph/v1/paper/DOI:${doi}?fields=title,abstract,tldr,authors.name,year,venue,externalIds`;
  const res = await fetch(url, {
    headers: {
      "Accept": "application/json",
      "User-Agent": "aaron/0.1 (+https://github.com/VeigaPunk/aaronplug)",
    },
  });

  if (res.status === 404) throw new Error("s2: DOI not in Semantic Scholar");

  const data: S2Response = await res.json();

  if (!data.title) throw new Error("s2: DOI not in Semantic Scholar");
  if (!data.abstract && !data.tldr?.text) throw new Error("s2: no abstract or TLDR available");

  const lines: string[] = [];
  lines.push(`Title: ${data.title}`);
  if (data.authors?.length) lines.push(`Authors: ${data.authors.map((a) => a.name).join(", ")}`);
  if (data.year != null) lines.push(`Year: ${data.year}`);
  if (data.venue) lines.push(`Venue: ${data.venue}`);
  if (data.tldr?.text) lines.push(`\nTLDR: ${data.tldr.text}`);
  if (data.abstract) lines.push(`\nAbstract: ${data.abstract}`);

  const text = lines.join("\n");

  return {
    doi,
    tier: "s2",
    format: "abstract",
    text,
    meta: {
      s2PaperId: data.externalIds?.CorpusId,
      venue: data.venue,
      year: data.year,
    },
  };
}
