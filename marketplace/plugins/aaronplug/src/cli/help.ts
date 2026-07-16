const HELP = `
aaron — model-callable fetcher for books (lib*) and papers (sci*/arxiv/s2)

USAGE
  aaron <command> [options]

COMMANDS
  books search <query> [--format <ext>]       Search lib* mirrors (JSON to stdout)
  books get <md5> [--output-dir <path>]       Download one book by MD5
  books batch <md5-list-file> [--output-dir]  Download many books from file
  books url <md5>                             Resolve direct download URL only

  papers fetch <doi> [--mode <tier>]          Fetch paper text (markdown/latex/abstract)
                                              mode: auto | arxiv | s2 | scihub (default: auto)

  help                                        Show this message

OUTPUT
  stdout: JSON (for scripts and agents)
  stderr: progress, warnings, errors

EXAMPLES
  aaron books search "tolstoy war and peace"
  aaron books get 1234567890abcdef1234567890abcdef -o ./downloads
  aaron papers fetch 10.1038/nature12373
`;

export function printHelp(): void {
  process.stdout.write(HELP);
}
