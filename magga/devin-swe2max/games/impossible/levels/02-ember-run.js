/* Level 2 — EMBER RUN (evokes "Fire Aura"). bpm 120, bp=180px.
 * Doubles become standard; gaps widen; first block-hops. */
globalThis.IMPOSSIBLE_LEVELS.push(globalThis.ImpossibleFormat.level(
  { id: 2, name: 'EMBER RUN', bpm: 120, accent: '#e05030', beats: 128, checkpoints: [32, 64, 96] },
  ({ s, g, k }) => {
    for (const b of [8, 10, 12]) s(b);            // every-2 warm-up
    s(15); s(15.5);                               // doubles start
    g(18, 0.9);
    for (const b of [20, 22]) s(b); s(24); s(24.5);
    k(27, 100, 70);
    s(30, 40); s(30.5); g(33, 0.85); s(35);
    s(37); s(37.5); s(40); s(40.5);               // double-doubles
    k(43, 80, 90); k(45.5, 80, 90);               // two block hops
    g(49, 1.0);                                   // full-beat gap (180px)
    for (const b of [52, 54, 56]) s(b);
    s(58); s(58.5); s(60); s(60.5);
    g(63, 0.9); s(65); s(65.5);
    k(68, 120, 60); s(71, 40); s(71.5);
    g(74, 1.0); g(77, 0.8);                       // gap pairs
    for (const b of [80, 81.5, 83]) s(b);
    s(85); s(85.5); s(87); s(87.5); s(89);        // triple-ish
    k(92, 90, 100); s(95.5);
    g(98, 1.0); s(100); s(100.5);
    for (const b of [103, 105, 107, 109]) s(b);
    s(111); s(111.5); k(114, 110, 70);
    s(118); s(118.5); g(121, 0.9); s(124);        // outro
  }));
