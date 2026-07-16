import { runBooks } from "./cli/books";
import { runPapers } from "./cli/papers";
import { printHelp } from "./cli/help";

async function main() {
  const [, , cmd, ...rest] = process.argv;

  switch (cmd) {
    case "books": {
      await runBooks(rest);
      return;
    }
    case "papers": {
      await runPapers(rest);
      return;
    }
    case "-h":
    case "--help":
    case "help":
    case undefined: {
      printHelp();
      return;
    }
    default: {
      process.stderr.write(`aaron: unknown command "${cmd}"\n`);
      printHelp();
      process.exit(1);
    }
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stdout.write(JSON.stringify({ error: message }) + "\n");
  process.exit(1);
});
