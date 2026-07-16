import { parseHTML } from "linkedom";
import type { PaperResult } from "./index";

const UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const MIRRORS = ["https://sci-hub.ru", "https://sci-hub.ee", "https://sci-hub.box"];

function resolvePdfUrl(raw: string, mirror: string): string {
  if (raw.startsWith("//")) return "https:" + raw;
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  return new URL(raw, mirror).href;
}

function stripFragment(url: string): string {
  const idx = url.indexOf("#");
  return idx === -1 ? url : url.slice(0, idx);
}

export async function fetchScihub(doi: string): Promise<PaperResult> {
  let mirror = "";
  let pdfUrl = "";

  for (const m of MIRRORS) {
    let res: Response;
    try {
      res = await fetch(`${m}/${doi}`, {
        headers: {
          "User-Agent": UA,
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
        signal: AbortSignal.timeout(15000),
        redirect: "follow",
      });
    } catch {
      continue;
    }

    if (!res.ok) continue;
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.startsWith("text/html")) continue;

    const html = await res.text();
    const { document } = parseHTML(html);

    const iframe = document.querySelector("iframe[src]");
    const obj = document.querySelector("object[data]");
    const raw = iframe?.getAttribute("src") ?? obj?.getAttribute("data");

    if (!raw) continue;

    pdfUrl = stripFragment(resolvePdfUrl(raw, m));
    mirror = m;
    break;
  }

  if (!pdfUrl) {
    throw new Error("scihub: no mirror resolved PDF URL");
  }

  const pdfRes = await fetch(pdfUrl, {
    headers: {
      "User-Agent": UA,
      "Referer": mirror,
      "Accept": "application/pdf,*/*;q=0.8",
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!pdfRes.ok) {
    throw new Error(`scihub: PDF fetch failed with status ${pdfRes.status}`);
  }

  const buf = await pdfRes.arrayBuffer();
  const pdfBuffer = Buffer.from(buf);

  const pdfCt = pdfRes.headers.get("content-type") ?? "";
  const magic = pdfBuffer.subarray(0, 4).toString("ascii");
  if (!pdfCt.includes("pdf") && magic !== "%PDF") {
    throw new Error("scihub: non-PDF response");
  }

  let markdown: string;
  try {
    const pdf2md = (await import("@opendocsg/pdf2md")).default;
    markdown = await pdf2md(pdfBuffer);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`scihub: pdf2md failure: ${msg}`);
  }

  return {
    doi,
    tier: "scihub",
    format: "markdown",
    text: markdown,
    meta: { mirror, pdfUrl, pdfBytes: pdfBuffer.length },
  };
}
