/* Level 3 — CHAOS WALTZ (evokes "Chaoz Fantasy"). bpm 132, bp=164px.
 * Syncopated off-beat doubles, triple spikes, tighter recovery windows. */
globalThis.IMPOSSIBLE_LEVELS.push(globalThis.ImpossibleFormat.level(
  { id: 3, name: 'CHAOS WALTZ', bpm: 132, accent: '#9b59d0', beats: 140, checkpoints: [35, 70, 105] },
  ({ s, g, k }) => {
    s(8); s(10.5); s(12); s(14.5);                // off-beat cadence
    s(16); s(16.5); s(19);
    g(21, 0.9); s(23.5);
    s(25); s(25.5); s(26);                        // first triple
    k(29, 90, 80); s(32);
    s(34); s(34.5); g(37, 0.85);
    s(39.5); s(42); s(42.5); s(45);
    k(47, 80, 95); k(50, 80, 95);
    s(53); s(53.5); s(55); s(55.5);
    g(58, 1.0); s(61);
    for (const b of [63, 64.5, 66, 67.5]) s(b);   // waltz 3/4 feel
    s(69); s(69.5); s(70);                        // tight triple
    k(73, 110, 65); s(75, 40); s(75.5);           // spike right after block
    g(78, 1.1);
    s(81); s(81.5); s(84); s(84.5); s(87); s(87.5);
    k(90, 70, 110);                               // tall block hop
    s(93); g(95, 0.9); s(97.5); s(97.9);          // jump-gap-jump-jump
    for (const b of [100, 101.5, 103, 104.5]) s(b);
    s(107); s(107.5); s(108);                     // triple
    k(110, 90, 85); k(113, 90, 85); s(116);
    g(118, 1.0); g(121, 1.0);
    s(124); s(124.5); s(127); s(127.5); s(130); s(130.5);
    k(133, 100, 75); s(136); s(136.5);            // outro push
  }));
