// The ONE screen image function. Every level of the display — full panel, pixel
// tiles, single pixels, sub-pixel LED brightness — samples this same canvas, so
// content never changes across zoom. Redrawn every frame (pure in wall-clock time).
export const SW = 1024, SH = 666;
export const VIDEO = { x: 560, y: 356, w: 408, h: 272 };            // the playing video window
export const DIVE_PX = { x: VIDEO.x + 204, y: VIDEO.y + 160 };      // dive target: a pixel inside the video

export const screenCanvas = document.createElement("canvas");
screenCanvas.width = SW; screenCanvas.height = SH;
const g = screenCanvas.getContext("2d", { willReadFrequently: true })!;

const wall = new Image();
wall.src = "/wallpaper.jpg"; // local file only — never fetched from an external server

const hash = (n: number) => { let x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

const win = (x: number, y: number, w: number, h: number, title: string, body: string) => {
  g.save();
  g.shadowColor = "rgba(0,0,0,.45)"; g.shadowBlur = 18; g.shadowOffsetY = 6;
  g.fillStyle = body; g.beginPath(); g.roundRect(x, y, w, h, 9); g.fill();
  g.shadowColor = "transparent";
  g.fillStyle = "rgba(58,58,64,.98)"; g.beginPath(); g.roundRect(x, y, w, 26, [9, 9, 0, 0]); g.fill();
  const dots = ["#ff5f57", "#febc2e", "#28c840"];
  dots.forEach((c, i) => { g.fillStyle = c; g.beginPath(); g.arc(x + 16 + i * 18, y + 13, 5.5, 0, 7); g.fill(); });
  g.fillStyle = "rgba(235,235,240,.85)"; g.font = "600 12px system-ui"; g.textAlign = "center";
  g.fillText(title, x + w / 2, y + 17); g.textAlign = "left";
  g.restore();
};

export const drawScreen = (time: number) => {
  // desktop: the real local wallpaper photo
  if (wall.complete && wall.naturalWidth) g.drawImage(wall, 0, 0, SW, SH);
  else { const gr = g.createLinearGradient(0, 0, 0, SH); gr.addColorStop(0, "#1b2c54"); gr.addColorStop(1, "#c96a3a"); g.fillStyle = gr; g.fillRect(0, 0, SW, SH); }

  // ---- code editor ----
  win(38, 56, 440, 336, "infinizoom — main.ts", "#1e2129");
  g.font = "12px ui-monospace, monospace";
  for (let i = 0; i < 22; i++) {
    const y = 100 + i * 13.5, r = hash(i * 7 + 1);
    g.fillStyle = "#5a6478"; g.fillText(String(i + 1).padStart(2), 50, y);
    let x = 78 + (i % 5) * 16;
    const n = 2 + Math.floor(r * 4);
    for (let j = 0; j < n; j++) {
      const w = 22 + hash(i * 13 + j * 5) * 58;
      g.fillStyle = ["#c678dd", "#61afef", "#98c379", "#e5c07b", "#abb2bf"][Math.floor(hash(i * 3 + j) * 5)];
      g.fillRect(x, y - 9, w, 9); x += w + 9;
    }
  }
  // ---- file browser ----
  win(96, 268, 356, 240, "Finder — render", "#22252d");
  g.fillStyle = "#1a1d24"; g.fillRect(96, 294, 92, 214);
  ["Recents", "Desktop", "render", "core", "assets"].forEach((s, i) => { g.fillStyle = i === 2 ? "#61afef" : "#8a93a6"; g.font = "11px system-ui"; g.fillText(s, 108, 314 + i * 20); });
  const names = ["room", "desk", "macbook", "die", "pcore", "alu", "finfet", "atom", "quark"];
  for (let i = 0; i < 9; i++) {
    const fx = 206 + (i % 4) * 62, fy = 310 + Math.floor(i / 4) * 62;
    g.fillStyle = "#5b9bd5"; g.beginPath(); g.roundRect(fx, fy, 40, 30, 4); g.fill();
    g.fillStyle = "#7fb6e8"; g.fillRect(fx, fy - 4, 16, 6);
    g.fillStyle = "#aeb6c4"; g.font = "10px system-ui"; g.textAlign = "center"; g.fillText(names[i] + ".ts", fx + 20, fy + 44); g.textAlign = "left";
  }
  // ---- terminal ----
  win(496, 84, 420, 244, "bun run server — zsh", "rgba(18,20,24,.96)");
  g.font = "12px ui-monospace, monospace";
  const lines = ["$ bun run server", "infinizoom built (312 kB)", "infinizoom riding at :3000", "[track] 26 levels · 17 decades", "[pools] 45k boxes · 60 fps", "$ "];
  lines.forEach((s, i) => { g.fillStyle = s.startsWith("$") ? "#7ee787" : "#9aa5b1"; g.fillText(s, 512, 132 + i * 17); });
  if (time % 1 < 0.55) { g.fillStyle = "#7ee787"; g.fillRect(529, 132 + 5 * 17 - 10, 8, 13); } // blinking cursor
  // ---- video window: visibly playing, full frame rate ----
  win(VIDEO.x - 8, VIDEO.y - 34, VIDEO.w + 16, VIDEO.h + 42, "aurora.mov ▸", "#101014");
  const { x, y, w, h } = VIDEO;
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
  g.fillStyle = "#03040a"; g.fillRect(x, y, w, h);
  for (let i = 0; i < 3; i++) {
    const cx = x + w * (0.5 + 0.34 * Math.sin(time * (0.7 + i * 0.23) + i * 2.1));
    const cy = y + h * (0.5 + 0.3 * Math.cos(time * (0.5 + i * 0.31) + i * 1.7));
    const gr = g.createRadialGradient(cx, cy, 6, cx, cy, 120);
    const hue = (time * 40 + i * 120) % 360;
    gr.addColorStop(0, `hsla(${hue},95%,60%,.95)`); gr.addColorStop(1, "hsla(0,0%,0%,0)");
    g.fillStyle = gr; g.fillRect(x, y, w, h);
  }
  g.strokeStyle = `hsl(${(time * 90) % 360},100%,70%)`; g.lineWidth = 3; g.beginPath();
  for (let i = 0; i <= 40; i++) { const px = x + (w * i) / 40, py = y + h * (0.5 + 0.28 * Math.sin(i * 0.5 + time * 3.1)); i ? g.lineTo(px, py) : g.moveTo(px, py); }
  g.stroke(); g.restore();
  g.fillStyle = "rgba(255,255,255,.75)"; g.fillRect(x + 8, y + h - 14, w - 90, 3);
  g.fillStyle = "#fff"; g.fillRect(x + 8 + ((time * 13) % (w - 90)), y + h - 17, 3, 9);
  // ---- menu bar ----
  g.fillStyle = "rgba(28,30,36,.72)"; g.fillRect(0, 0, SW, 24);
  g.fillStyle = "#e8e8ec"; g.font = "600 13px system-ui"; g.fillText("", 14, 17);
  g.font = "13px system-ui";
  ["Finder", "File", "Edit", "View", "Go", "Window", "Help"].forEach((s, i) => g.fillText(s, 42 + i * 54, 17));
  const d = new Date();
  g.textAlign = "right";
  g.fillText(`${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`, SW - 14, 17);
  g.fillText("◨ ☰", SW - 64, 17); g.textAlign = "left";
  // ---- dock ----
  const dw = 470, dx = (SW - dw) / 2, dy = SH - 54;
  g.fillStyle = "rgba(40,42,50,.55)"; g.beginPath(); g.roundRect(dx, dy, dw, 46, 14); g.fill();
  const icons = ["#3b82f6", "#0ea5e9", "#38bdf8", "#ef4444", "#eab308", "#22c55e", "#a855f7", "#14b8a6", "#1f2937", "#6b7280"];
  icons.forEach((c, i) => {
    const ix = dx + 12 + i * 45;
    g.fillStyle = c; g.beginPath(); g.roundRect(ix, dy + 6, 34, 34, 8); g.fill();
    g.fillStyle = "rgba(255,255,255,.85)"; g.font = "700 15px system-ui"; g.textAlign = "center";
    g.fillText(["☺", "⎈", "✉", "▶", "♪", "⌗", ">_", "☁", "⌫", "⚙"][i], ix + 17, dy + 29); g.textAlign = "left";
  });

  frameData = null; // invalidate the per-frame pixel cache
};

// per-frame lazy pixel sampler — frame-local memo of a pure function of time
let frameData: ImageData | null = null;
export const samplePixel = (x: number, y: number): [number, number, number] => {
  if (!frameData) frameData = g.getImageData(0, 0, SW, SH);
  const xi = Math.min(SW - 1, Math.max(0, Math.round(x))), yi = Math.min(SH - 1, Math.max(0, Math.round(y)));
  const i = (yi * SW + xi) * 4, d = frameData.data;
  return [d[i] / 255, d[i + 1] / 255, d[i + 2] / 255];
};
