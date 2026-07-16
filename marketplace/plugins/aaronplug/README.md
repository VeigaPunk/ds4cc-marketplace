# aaron

**Download almost any research paper or ""public domain"" book straight from your terminal — just ask for it in plain English.**

You talk to your AI assistant (Claude Code, Codex, Gemini CLI). It runs `aaron` for you. The paper or book lands on your disk. No browser, no account, no sign-up.

---

## What it feels like

You type this to your terminal AI:

> "grab me the Attention Is All You Need paper"

> "download Moby Dick as an epub"

> "find me Tolstoy's War and Peace"

…and the file shows up. That's the whole idea.

---

## Install (once)

You need [Bun](https://bun.sh). Then:

```bash
git clone https://github.com/VeigaPunk/aaronplug
cd aaronplug
bun install
bun run build
bun link          # puts the `aaron` command on your PATH
```

That's it. Now any AI in your terminal can use it, because `aaron` is just a normal command.

---

## Using it yourself (optional)

You don't have to — asking your AI is the point — but the raw commands are simple:

**Books**

```bash
aaron books search "moby dick"        # find it
aaron books get <id>                  # download it → ~/aaron-library
```

**Papers** (give it a DOI or arXiv id)

```bash
aaron papers fetch 10.1038/nature12373
```

Books download to `~/aaron-library` by default. Add `-o ./somewhere` to change that.

---

## Why it works with any AI

`aaron` prints clean JSON and nothing else. Ask, it fetches, it hands the result back to your assistant to read. Because it's a plain command on your PATH, **no setup is needed inside Claude Code, Codex, or Gemini** — they can already run shell commands.

Example, the way an AI calls it under the hood:

```bash
aaron books search "darwin origin of species"
aaron papers fetch 10.48550/arXiv.1706.03762
```

---

## Where it looks

- **Books** → the `lib*` mirror network.
- **Papers** → tries `arxiv` → `sci-hub` → Semantic Scholar, in that order, and returns the first hit (full text when it can, abstract as a last resort).

---

## The fine print

Unlicense — public domain. Do whatever you want with it.

Use it for what your local law allows. This is a convenience wrapper around sources that already exist on the open internet; you're responsible for how you use it.

<sub>Named for Aaron Swartz. Forked from `epubdomain-downloader` by Omercan Balandi — the TUI was stripped out and paper-fetching + JSON output added so any model can drive it.</sub>
