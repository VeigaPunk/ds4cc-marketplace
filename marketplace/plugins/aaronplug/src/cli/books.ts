// eslint-disable-next-line unicorn/prefer-node-protocol
import fs from "fs";
// eslint-disable-next-line unicorn/prefer-node-protocol
import os from "os";
// eslint-disable-next-line unicorn/prefer-node-protocol
import path from "path";
import meow from "meow";
import { getDocument } from "../api/data/document";
import { fetchConfig, findMirror } from "../api/data/config";
import { getAdapter } from "../api/adapters/index";
import { downloadFile } from "../api/data/download";
import { attempt } from "../utilities";
import { SEARCH_PAGE_SIZE } from "../settings";

async function initAdapter() {
  const config = await fetchConfig();
  const mirror = await findMirror(config.mirrors, (failed) => {
    process.stderr.write(`Mirror unavailable: ${failed}\n`);
  });
  if (!mirror) {
    process.stdout.write(JSON.stringify({ error: "No available mirrors" }) + "\n");
    process.exit(1);
  }
  return getAdapter(mirror.src, mirror.type);
}

async function search(query: string, format?: string, language?: string) {
  const adapter = await initAdapter();
  const searchUrl = adapter.getSearchURL(query, 1, SEARCH_PAGE_SIZE);
  const result = await attempt(() => getDocument(searchUrl));
  if (!result) {
    process.stdout.write(JSON.stringify({ error: "Search request failed" }) + "\n");
    process.exit(1);
  }

  const connectionError = adapter.detectConnectionError(result.document);
  if (connectionError) {
    process.stdout.write(JSON.stringify({ error: connectionError }) + "\n");
    process.exit(1);
  }

  const entries = adapter.parseEntries(result.document) || [];
  let results = entries.map((entry) => {
    const md5Match = entry.mirror.match(/md5=([a-fA-F0-9]{32})/i);
    return { ...entry, md5: md5Match ? md5Match[1] : null };
  });

  if (format && format !== "all") {
    results = results.filter(
      (entry) => entry.extension.toLowerCase() === format.toLowerCase()
    );
  }

  if (language && language !== "all") {
    results = results.filter(
      (entry) => entry.language.toLowerCase() === language.toLowerCase()
    );
  }

  process.stdout.write(JSON.stringify({ query, count: results.length, results }) + "\n");
}

async function get(md5: string, outputDir?: string) {
  const adapter = await initAdapter();
  const detailPageUrl = adapter.getDetailPageURL(md5);
  const detailResult = await attempt(() => getDocument(detailPageUrl));
  if (!detailResult) {
    process.stdout.write(JSON.stringify({ error: "Failed to fetch detail page", md5 }) + "\n");
    process.exit(1);
  }

  const downloadUrl = adapter.getMainDownloadURLFromDocument(detailResult.document);
  if (!downloadUrl) {
    process.stdout.write(JSON.stringify({ error: "Failed to resolve download URL", md5 }) + "\n");
    process.exit(1);
  }

  if (outputDir) {
    await fs.promises.mkdir(outputDir, { recursive: true });
  }

  const downloadStream = await fetch(downloadUrl);
  const result = await downloadFile({
    downloadStream,
    onStart: (filename, total) => {
      process.stderr.write(`Downloading: ${filename} (${total} bytes)\n`);
    },
    onData: () => {},
    outputDir,
  });

  process.stdout.write(JSON.stringify({
    md5,
    path: result.path,
    filename: result.filename,
    size: result.total,
  }) + "\n");
}

async function url(md5: string) {
  const adapter = await initAdapter();
  const detailPageUrl = adapter.getDetailPageURL(md5);
  const detailResult = await attempt(() => getDocument(detailPageUrl));
  if (!detailResult) {
    process.stdout.write(JSON.stringify({ error: "Failed to fetch detail page", md5 }) + "\n");
    return;
  }
  const downloadUrl = adapter.getMainDownloadURLFromDocument(detailResult.document);
  if (!downloadUrl) {
    process.stdout.write(JSON.stringify({ error: "Failed to resolve download URL", md5 }) + "\n");
    return;
  }
  process.stdout.write(JSON.stringify({ md5, url: downloadUrl }) + "\n");
}

async function batch(filePath: string, outputDir?: string) {
  const data = await fs.promises.readFile(filePath, "utf8");
  const md5List = data.split("\n").map((line) => line.trim()).filter(Boolean);
  const adapter = await initAdapter();

  if (outputDir) {
    await fs.promises.mkdir(outputDir, { recursive: true });
  }

  for (const md5 of md5List) {
    try {
      const detailPageUrl = adapter.getDetailPageURL(md5);
      const detailResult = await attempt(() => getDocument(detailPageUrl));
      if (!detailResult) {
        process.stdout.write(JSON.stringify({ error: "Failed to fetch detail page", md5 }) + "\n");
        continue;
      }

      const downloadUrl = adapter.getMainDownloadURLFromDocument(detailResult.document);
      if (!downloadUrl) {
        process.stdout.write(JSON.stringify({ error: "Failed to resolve download URL", md5 }) + "\n");
        continue;
      }

      const downloadStream = await fetch(downloadUrl);
      const result = await downloadFile({
        downloadStream,
        onStart: (filename, total) => {
          process.stderr.write(`Downloading: ${filename} (${total} bytes)\n`);
        },
        onData: () => {},
        outputDir,
      });

      process.stdout.write(JSON.stringify({
        md5,
        path: result.path,
        filename: result.filename,
        size: result.total,
      }) + "\n");
    } catch {
      process.stdout.write(JSON.stringify({ error: "Download failed", md5 }) + "\n");
    }
  }
}

// Programmatic entry points — also used by the MCP server.
export const booksApi = { search, get, url, batch };

export async function runBooks(argv: string[]): Promise<void> {
  const [sub, ...rest] = argv;
  const parsed = meow("", {
    argv: rest,
    importMeta: import.meta,
    flags: {
      format: { type: "string", shortFlag: "f", default: "epub" },
      language: { type: "string", shortFlag: "l", default: "english" },
      outputDir: { type: "string", shortFlag: "o", default: path.join(os.homedir(), "aaron-library") },
    },
  });

  switch (sub) {
    case "search": {
      const query = parsed.input.join(" ");
      if (query.length < 3) {
        process.stdout.write(JSON.stringify({ error: "Query must be at least 3 characters long" }) + "\n");
        return;
      }
      await search(query, parsed.flags.format, parsed.flags.language);
      return;
    }
    case "get":
    case "download": {
      const md5 = parsed.input[0];
      if (!md5) {
        process.stdout.write(JSON.stringify({ error: "md5 required" }) + "\n");
        return;
      }
      await get(md5, parsed.flags.outputDir);
      return;
    }
    case "url": {
      const md5 = parsed.input[0];
      if (!md5) {
        process.stdout.write(JSON.stringify({ error: "md5 required" }) + "\n");
        return;
      }
      await url(md5);
      return;
    }
    case "batch":
    case "bulk": {
      const file = parsed.input[0];
      if (!file) {
        process.stdout.write(JSON.stringify({ error: "md5-list file required" }) + "\n");
        return;
      }
      await batch(file, parsed.flags.outputDir);
      return;
    }
    default: {
      process.stdout.write(JSON.stringify({ error: `unknown books subcommand: ${sub ?? "(none)"}` }) + "\n");
      process.exit(1);
    }
  }
}
