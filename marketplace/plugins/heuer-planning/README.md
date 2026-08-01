# heuer-planning

Standalone marketplace plugin for the **heuer-planning** skill (source:
[VeigaPunk/myskills/heuer-planning](https://github.com/VeigaPunk/myskills/tree/main/heuer-planning)).

Structured brainstorming and planning grounded in Richard J. Heuer Jr.–inspired
analytic techniques (ACH, key assumptions check, devil's advocacy, pre-mortem,
indicators).

## Install

```bash
# From the DS4CC marketplace (Grok)
grok plugin marketplace add VeigaPunk/ds4cc-marketplace
grok plugin install heuer-planning --trust
grok plugin enable heuer-planning

# Codex
codex plugin marketplace add VeigaPunk/ds4cc-marketplace
codex plugin add heuer-planning@ds4cc --json
```

## Use

Load the skill when you want rigorous co-planning — not wired into other plugins
by default.

```text
Skill(skill="heuer-planning")
```

## Layout

```
skills/heuer-planning/SKILL.md
skills/heuer-planning/references/heuer-blocks.md
```

## License

MIT (see marketplace root LICENSE).
