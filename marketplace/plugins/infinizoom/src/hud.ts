// DOM HUD: current level name + physical scale, and the fork chevrons.
const nameEl = document.querySelector<HTMLElement>("#hud .name")!;
const scaleEl = document.querySelector<HTMLElement>("#hud .scale")!;
const chevL = document.getElementById("chevL")!;
const chevR = document.getElementById("chevR")!;

const UNITS: [number, string][] = [[1, "m"], [1e-3, "mm"], [1e-6, "µm"], [1e-9, "nm"], [1e-12, "pm"], [1e-15, "fm"], [1e-18, "am"]];
export const fmtSize = (m: number) => {
  for (const [u, s] of UNITS) if (m >= u * 0.9995 || u === 1e-18) {
    const v = m / u;
    return `${v >= 100 ? v.toFixed(0) : v >= 10 ? v.toFixed(1) : v.toFixed(2)} ${s} across`;
  }
  return "";
};

export const setHud = (name: string, sizeM: number) => {
  if (nameEl.textContent !== name) nameEl.textContent = name;
  scaleEl.textContent = fmtSize(sizeM);
};

export const setFork = (visible: boolean, sel: number) => {
  chevL.classList.toggle("show", visible);
  chevR.classList.toggle("show", visible);
  chevL.classList.toggle("on", visible && sel === 0);
  chevR.classList.toggle("on", visible && sel === 1);
};
