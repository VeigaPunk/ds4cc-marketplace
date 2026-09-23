/* Level 4 — SKYWARD (evokes "Heaven"). bpm 140, bp=154px.
 * Verticality: tall block climbs, long gaps, sparse but demanding. */
globalThis.IMPOSSIBLE_LEVELS.push(globalThis.ImpossibleFormat.level(
  { id: 4, name: 'SKYWARD', bpm: 140, accent: '#3fa8d0', beats: 148, checkpoints: [37, 74, 111] },
  ({ s, g, k }) => {
    s(8); s(11); s(13); s(13.5);
    k(16, 90, 70); k(19, 90, 105);                // stair climb
    s(22.5); g(25, 1.05);
    s(28); s(28.5); s(31);
    k(33, 80, 115); s(36.5); s(36.9);             // tall block → double
    g(39, 1.15);                                  // long gap
    k(42, 70, 60); k(44.5, 70, 105); s(47.5);     // up the steps, spike on exit
    s(50); s(50.5); s(53); s(53.5);
    g(56, 1.2);                                   // widest gap so far (185px)
    s(59); k(61.5, 80, 100); s(65);
    for (const b of [67, 68.5, 70, 71.5]) s(b);
    k(74, 85, 90); k(77, 85, 115);                // high hop
    s(80.5); g(83, 1.0); s(86); s(86.5);
    s(89); s(89.5); s(90);                        // triple
    k(93, 75, 120);                               // tallest block
    s(96.5); s(99); s(99.5);
    g(102, 1.15); g(105, 0.9);
    for (const b of [108, 109.5, 111, 112.5]) s(b);
    s(115); s(115.5); k(118, 80, 100);
    s(121.5); g(124, 1.1); s(127); s(127.5);
    s(130); s(130.5); s(133); s(133.5);
    k(136, 95, 80); s(139); s(141); s(141.5);     // final push
  }));
