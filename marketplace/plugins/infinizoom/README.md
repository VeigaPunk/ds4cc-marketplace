# infinizoom

A procedural infinite-zoom world: one continuous camera track from a day-lit room,
into a MacBook Pro, through the M4 die, down standard-cell logic and a FinFET, into
the silicon lattice, an atom, its nucleus, a nucleon, a quark — ~17 decades of scale.
One bifurcation hovers above the MacBook: dive into the chassis (A) or into the
display (D), down to a single sub-pixel LED and its OLED stack, converging on the
same atomic tail.

Born from a one-shot prompt by [Taelin (@VictorTaelin)](https://x.com/VictorTaelin) — the spec was his, the ride is the model's.

## Run

```sh
bun run server     # builds src/main.ts and serves at http://localhost:3000
```

three.js is loaded in the browser from a CDN via an import map; everything else is
local (`wallpaper.jpg` is served from this directory — no external content).

## Controls

- **W / S** — ride deeper / back out
- **A / D** — choose a side at the bifurcation
- **mouse** — glance direction, full 360°

## Architecture

Mutable state is exactly: one float `t` (position along the track), one branch
bitstring, and raw input. Every frame is a pure function of `(t, branches, input,
wall-clock time)` — no scene graph, no stored world data.

- `src/core/ctx.ts` — local unit frames: each renderer works in its own ~unit-sized
  frame; `kid()` re-expresses the camera into child frames (doubles throughout; f32
  only inside instance buffers). The active chain's poses are substituted exactly, so
  precision never degrades near the camera.
- `src/core/track.ts` — the camera track, authored from the same layout constants
  that place the geometry (one source of truth). Exponential radial interpolation
  gives the constant-feel zoom; entry/exit poses guarantee continuity across levels.
- `src/core/pools.ts` — immediate-mode instanced pools; three.js is only a
  rasterizer. The green path line is a true GL line primitive.
- `src/core/screenimg.ts` — THE screen image function: wallpaper + procedural OS +
  playing video on one canvas; every display level (panel → pixels → sub-pixel LEDs)
  samples this same function.
- `src/render/<name>.ts` — one renderable per file. Adding a structure = one new
  render function + one call (and placement constant) in its parent. Adding a
  bifurcation = one more entry in a `dive` pair.

## Extending backward (t < 0)

Prepend levels: give `room` a parent (say `city`) whose layout constant places the
room, point the route root at it, and the track, HUD and green line follow — nothing
else changes.
