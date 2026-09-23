/* Level 1 — FIRST LIGHT (evokes "Original"). bpm 100, bp=216px.
 * Onboarding: single spikes on the beat, one gap, first low blocks. */
globalThis.IMPOSSIBLE_LEVELS.push(globalThis.ImpossibleFormat.level(
  { id: 1, name: 'FIRST LIGHT', bpm: 100, accent: '#f08c00', beats: 112, checkpoints: [28, 56, 84] },
  ({ s, g, k }) => {
    // intro: 8 beats flat, then singles on the beat
    for (const b of [8, 12, 16, 20]) s(b);
    g(24, 0.75);                                  // first gap
    for (const b of [28, 31, 34]) s(b);           // quickening singles
    s(38); s(38.5);                               // first double
    k(42, 110, 60);                               // first block (land on top)
    for (const b of [46, 50, 54]) s(b);
    g(57, 0.8);
    for (const b of [60, 62, 64]) s(b);           // every-2-beats
    s(67); s(67.5);
    k(70, 90, 80); s(74);
    g(77, 0.75); s(80);
    for (const b of [83, 85, 87]) s(b);
    s(90); s(90.5); s(94); s(94.5);               // paired doubles
    k(98, 120, 55); s(102);
    g(105, 0.85); s(107); s(110);                 // outro
  }));
