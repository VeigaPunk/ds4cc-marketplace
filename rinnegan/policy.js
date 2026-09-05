(() => {
  "use strict";
  const SPECS = Object.freeze({
    "omp": Object.freeze({ kind: "host-cli", action: "COPY INSTALL" }),
  });
  const OMP_AUTHORITY = "https://github.com/can1357/oh-my-pi";
  const OMP_INSTALL = "curl -fsSL https://omp.sh/install | sh";
  globalThis.DS4CC_RINNEGAN_ADMIT = (record) => {
    if (!record || typeof record !== "object") return false;
    const spec = SPECS[record.n];
    if (!spec || record.kind !== spec.kind || record.action !== spec.action) return false;
    if (record.admitted !== true || record.rinnegan !== true || record.shipped !== true) return false;
    if (typeof record.c !== "string" || record.c.length === 0) return false;
    return record.provenance === OMP_AUTHORITY
      && record.bootstrap === "upstream-installer"
      && record.localCommand === "omp"
      && record.c === OMP_INSTALL;
  };
})();
