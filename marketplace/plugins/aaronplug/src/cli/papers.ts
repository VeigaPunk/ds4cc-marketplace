import meow from "meow";
import { fetchPaper, type PaperMode } from "../api/papers/index";

export async function runPapers(argv: string[]): Promise<void> {
  const [sub, ...rest] = argv;
  const parsed = meow("", {
    argv: rest,
    importMeta: import.meta,
    flags: {
      mode: { type: "string", shortFlag: "m", default: "auto" },
    },
  });

  switch (sub) {
    case "fetch": {
      const doi = parsed.input[0];
      if (!doi) {
        process.stdout.write(JSON.stringify({ error: "DOI required" }) + "\n");
        process.exit(1);
      }
      const mode = parsed.flags.mode as PaperMode;
      const result = await fetchPaper(doi, mode);
      process.stdout.write(JSON.stringify(result) + "\n");
      return;
    }
    default: {
      process.stdout.write(JSON.stringify({ error: `unknown papers subcommand: ${sub ?? "(none)"}` }) + "\n");
      process.exit(1);
    }
  }
}
