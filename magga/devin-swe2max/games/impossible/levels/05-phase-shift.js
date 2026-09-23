/* Level 5 — PHASE SHIFT (evokes "Phazd"). bpm 150, bp=144px.
 * The gauntlet: dense syncopation, everything combined, minimal recovery. */
globalThis.IMPOSSIBLE_LEVELS.push(globalThis.ImpossibleFormat.level(
  { id: 5, name: 'PHASE SHIFT', bpm: 150, accent: '#d03f6f', beats: 160, checkpoints: [40, 80, 120] },
  ({ s, g, k }) => {
    s(8); s(10); s(11.5); s(13);                  // off-beat opener
    s(15); s(15.5); s(17); s(17.5);
    g(20, 1.1); s(22.5);
    k(24, 80, 85); s(26.5); s(26.9);
    s(29); s(29.5); s(30);                        // triple
    g(32, 1.0); g(34.5, 0.9);
    s(37); s(37.5); s(39.5); s(39.9); s(40.4);    // double, syncopated pair
    k(43, 75, 100); s(45.5);
    s(47); s(48.5); s(50); s(51.5);               // every-1.5
    k(54, 70, 115); g(56.5, 1.1);
    s(59); s(59.5); s(60);                        // triple
    s(62.5); s(64); s(64.5); s(66.5);             // phase weave
    k(69, 85, 90); s(72); s(72.5);
    g(75, 1.15); s(77.5); s(77.9); s(78.3);       // triple landing
    s(81); s(81.5); k(84, 80, 105);
    s(87); s(88.5); s(88.9);                      // gallop
    for (const b of [91, 92.5, 94, 95.5]) s(b);
    s(97); s(97.5); s(98); s(100.5);
    g(103, 1.2);                                  // wide gap (173px)
    k(106, 75, 120); s(109); s(109.5);
    s(111.5); s(113); s(114.5); s(116);           // relentless singles
    s(117); s(117.5); s(117.9);                   // triple
    k(120.5, 70, 95); s(123);
    g(125, 1.0); s(127); s(127.5); s(129);
    s(131); s(131.5); s(132);                     // triple
    s(134.5); s(136); s(137.5); s(139);
    k(141.5, 80, 110); s(144); s(144.5);
    s(146); s(146.5); s(147); g(149.5, 1.0);      // triple→gap
    s(152); s(152.5); s(154); s(154.5); s(156);   // last stand
    k(158, 90, 70);                               // finish platform
  }));
