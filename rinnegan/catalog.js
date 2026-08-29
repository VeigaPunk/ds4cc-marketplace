globalThis.DS4CC_RINNEGAN_CATALOG = Object.freeze([
  {
    "n": "the-leanbuilder",
    "v": "local",
    "cat": "agents",
    "d": "One bounded remediation pass for needless weight and broken manifest, registry, installer, or path wiring.",
    "c": "myagents lean --run-id \"lean-$(date -u +%Y%m%d-%H%M%S)-$$\" --target \"$PWD\" --task \"remove needless weight and repair existing manifest registry installer and path wiring\"",
    "kind": "one-shot",
    "action": "COPY ONCE",
    "admitted": true,
    "rinnegan": true,
    "shipped": true,
    "provenance": "local-only",
    "digest": "7379541e4ccf7b5ae073fbe03683b1cce3fdffba5374b07da3155b1ada326f1c"
  },
  {
    "n": "b00mr-install",
    "v": "main",
    "cat": "installers",
    "d": "Interactive installer for the full pack or selected public standalone agents, with explicit safety prompts and two consent gates.",
    "c": "bash -c 'set -euo pipefail; d=\"$(mktemp -d)\"; trap \"rm -rf -- \\\"$d\\\"\" EXIT; git clone --depth 1 https://github.com/VeigaPunk/myagents.git \"$d/myagents\"; node \"$d/myagents/bin/b00mr-install.mjs\"'",
    "localCommand": "b00mr-install",
    "kind": "interactive-installer",
    "action": "COPY INTERACTIVE",
    "admitted": true,
    "rinnegan": true,
    "shipped": true,
    "provenance": "https://github.com/VeigaPunk/myagents",
    "bootstrap": "git-clone-default-branch"
  },
  {
    "n": "z00mr-install",
    "v": "main",
    "cat": "installers",
    "d": "Noninteractive AIO full-pack installer for copy, paste, and watch operation.",
    "c": "bash -c 'set -euo pipefail; d=\"$(mktemp -d)\"; trap \"rm -rf -- \\\"$d\\\"\" EXIT; git clone --depth 1 https://github.com/VeigaPunk/myagents.git \"$d/myagents\"; node \"$d/myagents/bin/z00mr-install.mjs\"'",
    "localCommand": "z00mr-install",
    "kind": "aio-installer",
    "action": "COPY AIO",
    "admitted": true,
    "rinnegan": true,
    "shipped": true,
    "provenance": "https://github.com/VeigaPunk/myagents",
    "bootstrap": "git-clone-default-branch"
  }
]);
