(() => {
  "use strict";
  const SPECS = Object.freeze({
    "the-leanbuilder": Object.freeze({ kind: "one-shot", action: "COPY ONCE" }),
    "b00mr-install": Object.freeze({ kind: "interactive-installer", action: "COPY INTERACTIVE" }),
    "z00mr-install": Object.freeze({ kind: "aio-installer", action: "COPY AIO" }),
  });
  const INSTALLER_AUTHORITY = "https://github.com/VeigaPunk/myagents";
  const installerCommand = (name) =>
    `bash -c 'set -euo pipefail; d="$(mktemp -d)"; trap "rm -rf -- \\"$d\\"" EXIT; git clone --depth 1 https://github.com/VeigaPunk/myagents.git "$d/myagents"; node "$d/myagents/bin/${name}.mjs"'`;
  globalThis.DS4CC_RINNEGAN_ADMIT = (record) => {
    if (!record || typeof record !== "object") return false;
    const spec = SPECS[record.n];
    if (!spec || record.kind !== spec.kind || record.action !== spec.action) return false;
    if (record.admitted !== true || record.rinnegan !== true || record.shipped !== true) return false;
    if (typeof record.c !== "string" || record.c.length === 0) return false;
    if (record.n === "the-leanbuilder") {
      return record.provenance === "local-only" && /^[a-f0-9]{64}$/.test(record.digest);
    }
    return record.provenance === INSTALLER_AUTHORITY
      && record.bootstrap === "git-clone-default-branch"
      && record.localCommand === record.n
      && record.c === installerCommand(record.n);
  };
})();
