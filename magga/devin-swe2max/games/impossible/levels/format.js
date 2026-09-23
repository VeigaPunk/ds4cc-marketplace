/* games/impossible/levels/format.js — level authoring helpers.
 * Levels are authored on a BEAT GRID: positions in beats, widths/heights in px.
 * bp = px per beat at level bpm (cube runs 360px/s, so bpm sets the spacing
 * the music bed reinforces). Every hazard position = n * bp → jumps land on
 * the beat by construction.
 *
 *   s(beat, w=40)            spike  — kills on overlap (triangle band)
 *   g(beat, wBeats)          gap    — missing floor, w in beats
 *   k(beat, wPx, hPx)        block  — land on top, side/front contact kills
 *
 * Feasibility envelope (JUMP_V=880, GRAV=2600, SPEED=360):
 *   flat arc ≈ 244px → gaps ≤ ~210px, spike clusters ≤ ~230px
 *   apex ≈ 149px     → blocks ≤ ~135px are landable (with margin: ≤120)
 */
globalThis.IMPOSSIBLE_LEVELS = globalThis.IMPOSSIBLE_LEVELS || [];
globalThis.ImpossibleFormat = {
  level(def, build) {
    const bp = 360 * 60 / def.bpm;
    const rows = [];
    const s = (b, w = 40) => rows.push(['spike', Math.round(b * bp), w]);
    const g = (b, w) => rows.push(['gap', Math.round(b * bp), Math.round(w * bp)]);
    const k = (b, w, h) => rows.push(['block', Math.round(b * bp), w, h]);
    build({ s, g, k, bp });
    return {
      id: def.id, name: def.name, bpm: def.bpm, accent: def.accent, rows,
      end: Math.round(def.beats * bp),
      checkpoints: (def.checkpoints || []).map(b => Math.round(b * bp)),
    };
  },
};
