// Tier 1 — arxiv e-print fetch via DOI-to-arxiv-id resolution.
// Executor lane: implement this file.
//
// INTERFACE (must satisfy):
//   export async function fetchArxiv(doi: string): Promise<PaperResult>
//   - Must return { doi, tier: "arxiv", format: "latex", text, meta }
//   - text: the main .tex source (or concatenation if multi-file), extracted from the
//     gzip tarball returned by https://export.arxiv.org/e-print/<arxivId>
//   - Throws if the DOI is not in arxiv
//
// RESOLUTION STRATEGY (DOI → arxivId):
//   a. Query: https://export.arxiv.org/api/query?search_query=doi:<DOI>&max_results=1
//   b. Parse the Atom feed; extract `<id>` which contains the arxiv URL → strip to id.
//   c. If no entry, throw "not in arxiv".
//
// TARBALL HANDLING:
//   - GET https://export.arxiv.org/e-print/<arxivId> returns application/gzip (or tar).
//   - Use node `zlib.gunzipSync` + a small tar extractor (or bun-native if present) to
//     pull `.tex` files. If multiple .tex, prefer one named like main.tex / ms.tex / the
//     longest file. Concatenate as last resort.
//   - Do NOT add heavy tar libraries if avoidable — a 100-line parser is fine (tar is
//     a simple blocked format: 512-byte header + file body padded to 512).
//
// MARK USER-AGENT: "aaron/0.1 (https://github.com/VeigaPunk/aaronplug)".
// DO NOT hammer export.arxiv.org — one resolve, one fetch per call.

import { gunzipSync } from "node:zlib";
import type { PaperResult } from "./index";

const UA = "aaron/0.1 (+https://github.com/VeigaPunk/aaronplug)";

function extractArxivId(feedXml: string): string | null {
  // Match the entry <id> (not the feed-level <id>)
  const match = feedXml.match(/<entry>[\s\S]*?<id>\s*(http:\/\/arxiv\.org\/abs\/([^<\s]+))\s*<\/id>/i);
  if (!match) return null;
  // Strip trailing version like v5
  return match[2].replace(/v\d+$/, "");
}

function isTar(buf: Buffer): boolean {
  // tar magic at offset 257: "ustar\0" or "ustar "
  if (buf.length < 512) return false;
  const magic = buf.slice(257, 263).toString("ascii");
  return magic.startsWith("ustar");
}

interface TarEntry {
  name: string;
  content: Buffer;
}

function parseTar(buf: Buffer): TarEntry[] {
  const entries: TarEntry[] = [];
  let offset = 0;

  while (offset + 512 <= buf.length) {
    const header = buf.slice(offset, offset + 512);
    // End of archive: two consecutive zero blocks
    if (header.every((b) => b === 0)) break;

    const name = header.slice(0, 100).toString("utf8").replace(/\0.*$/, "");
    const sizeOctal = header.slice(124, 136).toString("ascii").replace(/\0.*$/, "").trim();
    const size = parseInt(sizeOctal, 8) || 0;
    const typeflag = header[156];

    offset += 512;

    // typeflag 0 or \0 = regular file
    if ((typeflag === 0 || typeflag === 48) && name && size > 0) {
      const content = buf.slice(offset, offset + size);
      entries.push({ name, content });
    }

    // Advance past content, rounded up to 512-byte boundary
    offset += Math.ceil(size / 512) * 512;
  }

  return entries;
}

function selectMainTex(entries: TarEntry[]): string {
  const texEntries = entries.filter((e) => e.name.toLowerCase().endsWith(".tex"));
  if (texEntries.length === 0) return "";
  if (texEntries.length === 1) return texEntries[0].content.toString("utf8");

  const preferred = texEntries.find((e) =>
    /^(main|ms|paper|manuscript)\.tex$/i.test(e.name.split("/").pop() ?? "")
  );
  if (preferred) return preferred.content.toString("utf8");

  // Fall back to largest .tex file
  texEntries.sort((a, b) => b.content.length - a.content.length);
  return texEntries[0].content.toString("utf8");
}

export async function fetchArxiv(doi: string): Promise<PaperResult> {
  // Step 1: resolve DOI → arxivId
  // Fast path: 10.48550/arXiv.<id> is arxiv's own DOI namespace
  let arxivId: string | null = null;
  const arxivDoi = doi.match(/^10\.48550\/arXiv\.(.+)$/i);
  if (arxivDoi) {
    arxivId = arxivDoi[1].replace(/v\d+$/, "");
  } else {
    const queryUrl = `https://export.arxiv.org/api/query?search_query=doi:${encodeURIComponent(doi)}&max_results=1`;
    const feedRes = await fetch(queryUrl, { headers: { "User-Agent": UA } });
    if (!feedRes.ok) {
      throw new Error(`arxiv: feed query failed (${feedRes.status})`);
    }
    const feedXml = await feedRes.text();

    if (!/<entry>/i.test(feedXml)) {
      throw new Error("arxiv: DOI not in arxiv");
    }

    arxivId = extractArxivId(feedXml);
    if (!arxivId) {
      throw new Error("arxiv: DOI not in arxiv");
    }
  }

  // Step 2: fetch e-print tarball
  const eprintUrl = `https://export.arxiv.org/e-print/${arxivId}`;
  const eprintRes = await fetch(eprintUrl, { headers: { "User-Agent": UA } });
  if (!eprintRes.ok) {
    throw new Error(`arxiv: e-print fetch failed (${eprintRes.status})`);
  }
  const arrayBuffer = await eprintRes.arrayBuffer();
  const rawBuf = Buffer.from(arrayBuffer);
  const tarballBytes = rawBuf.length;

  // Step 3: gunzip
  let decompressed: Buffer;
  try {
    decompressed = gunzipSync(rawBuf);
  } catch {
    // Already decompressed (raw tar or plain .tex)
    decompressed = rawBuf;
  }

  // Step 4: extract .tex
  let text: string;
  if (isTar(decompressed)) {
    const entries = parseTar(decompressed);
    text = selectMainTex(entries);
  } else {
    // Single gzipped .tex
    text = decompressed.toString("utf8");
  }

  if (!text.trim() || text.trimStart().startsWith("%PDF")) {
    throw new Error("arxiv: no LaTeX source available (PDF only)");
  }

  return {
    doi,
    tier: "arxiv",
    format: "latex",
    text,
    meta: { arxivId, tarballBytes },
  };
}
