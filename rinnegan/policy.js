(() => {
  "use strict";
  const SPECS = Object.freeze({
    "omp": Object.freeze({ kind: "host-cli", action: "COPY INSTALL" }),
    "pubstomper": Object.freeze({ kind: "repo", action: "COPY CLONE" }),
  });
  const AUTHORITIES = Object.freeze({
    "omp": Object.freeze({
      provenance: "https://github.com/can1357/oh-my-pi",
      bootstrap: "upstream-installer",
      localCommand: "omp",
      c: "curl -fsSL https://omp.sh/install | sh",
    }),
    "pubstomper": Object.freeze({
      provenance: "https://github.com/VeigaPunk/pubstomper",
      bootstrap: "git-clone",
      localCommand: "bun check.mjs",
      c: "git clone https://github.com/VeigaPunk/pubstomper.git",
    }),
  });
  globalThis.DS4CC_RINNEGAN_ADMIT = (record) => {
    if (!record || typeof record !== "object") return false;
    const spec = SPECS[record.n];
    if (!spec || record.kind !== spec.kind || record.action !== spec.action) return false;
    if (record.admitted !== true || record.rinnegan !== true || record.shipped !== true) return false;
    if (typeof record.c !== "string" || record.c.length === 0) return false;
    const authority = AUTHORITIES[record.n];
    return !!authority
      && record.provenance === authority.provenance
      && record.bootstrap === authority.bootstrap
      && record.localCommand === authority.localCommand
      && record.c === authority.c;
  };
})();
