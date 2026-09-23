/* games/chicken-invaders/packs.js — content packs over the shared shmup
 * skeleton (spec 06 §FORGE). `fowl` = CI2-era formula replica content
 * (player-facing title FOWL ASSAULT — original evocation, no InterAction
 * marks). `cluck` = CLUCK HORIZON, original IP courier riff.
 *
 * Wave tables authored per pack: 2 chapters × 6 waves + 1 boss each.
 * waveDef = { pattern, rows, cols, hp, eggEvery, type? }
 * enemyTypes: { name, speed, hp } — speed tints pattern rate, hp floors wdef.hp.
 */
globalThis.FOWL_PACKS = {
  fowl: {
    id: 'fowl',
    title: 'FOWL ASSAULT',
    sub: 'the flock strikes back — a golden-age chicken shmup',
    weapons: ['PEA SHOOTER', 'TWIN BOLT', 'TRI-SPREAD'],
    gift: 'GIFT', food: 'DRUMSTICK',
    ship: '#4dabf7', foe: '#ffd43b', foe2: '#ff8787', egg: '#fff3bf',
    bg0: '#0b0018', bg1: '#1a0b2e', accent: '#ff6b6b',
    shipHi: '#a5d8ff', bullet: '#8ce99a', belly: '#ffec99', beak: '#fd7e14', comb: '#e03131',
    neb1: '#5f3dc4', neb2: '#c2255c', planet: '#2f2b5c', ring: '#9775fa', giftCol: '#e599f7',
    jokes: null,
    enemyTypes: [
      { name: 'CHICKEN', speed: 1.0, hp: 2 },
      { name: 'CHICKEN SCOUT', speed: 1.15, hp: 2 },
      { name: 'CHICKEN ACE', speed: 0.9, hp: 3 },
    ],
    chapters: [
      { boss: { name: 'BIG HEN', hp: 70 },
        waves: [
          { pattern: 'straight', rows: 2, cols: 5, hp: 2, eggEvery: 3.0 },
          { pattern: 'straight', rows: 2, cols: 6, hp: 2, eggEvery: 2.6 },
          { pattern: 'swoop',    rows: 2, cols: 6, hp: 2, eggEvery: 2.4 },
          { pattern: 'straight', rows: 3, cols: 6, hp: 2, eggEvery: 2.2, type: 1 },
          { pattern: 'swoop',    rows: 2, cols: 7, hp: 2, eggEvery: 2.0 },
          { pattern: 'dive',     rows: 2, cols: 6, hp: 2, eggEvery: 2.2 },
        ] },
      { boss: { name: 'MOTHER HEN', hp: 110 },
        waves: [
          { pattern: 'dive',     rows: 2, cols: 6, hp: 3, eggEvery: 2.2 },
          { pattern: 'swoop',    rows: 3, cols: 6, hp: 3, eggEvery: 2.0 },
          { pattern: 'straight', rows: 3, cols: 7, hp: 3, eggEvery: 1.9, type: 2 },
          { pattern: 'dive',     rows: 2, cols: 7, hp: 3, eggEvery: 1.9 },
          { pattern: 'swoop',    rows: 3, cols: 7, hp: 3, eggEvery: 1.7, type: 1 },
          { pattern: 'dive',     rows: 2, cols: 6, hp: 3, eggEvery: 1.7, type: 2 },
        ] },
    ],
  },
  cluck: {
    id: 'cluck',
    title: 'CLUCK HORIZON',
    sub: 'courier vs the flock — original IP',
    weapons: ['SOUP LASER', 'SPATULA SPREAD', 'WHISK BARRAGE'],
    gift: 'CRATE', food: 'RATIONS',
    ship: '#20c997', foe: '#ffa94d', foe2: '#ffe066', egg: '#ffe8cc',
    bg0: '#001a1a', bg1: '#00332b', accent: '#20c997',
    shipHi: '#96f2d7', bullet: '#ffe066', belly: '#ffe8cc', beak: '#e8590c', comb: '#ffd43b',
    neb1: '#0b7285', neb2: '#087f5b', planet: '#3b4a48', ring: '#63e6be', giftCol: '#3fd9b2',
    jokes: [
      'Courier log: the flock took my route. Rude.',
      'Courier log: eggs again. Sending them the invoice.',
    ],
    enemyTypes: [
      { name: 'FLOCKBIRD', speed: 1.0, hp: 2 },
      { name: 'FLOCKBIRD GLIDER', speed: 1.15, hp: 2 },
      { name: 'FLOCKBIRD BRUISER', speed: 0.85, hp: 3 },
    ],
    chapters: [
      { boss: { name: 'MOTHER GOOSE', hp: 70 },
        waves: [
          { pattern: 'straight', rows: 2, cols: 5, hp: 2, eggEvery: 3.0 },
          { pattern: 'swoop',    rows: 2, cols: 5, hp: 2, eggEvery: 2.5 },
          { pattern: 'straight', rows: 2, cols: 6, hp: 2, eggEvery: 2.4, type: 1 },
          { pattern: 'dive',     rows: 2, cols: 5, hp: 2, eggEvery: 2.2 },
          { pattern: 'swoop',    rows: 2, cols: 6, hp: 2, eggEvery: 2.0, type: 1 },
          { pattern: 'dive',     rows: 2, cols: 6, hp: 3, eggEvery: 2.0 },
        ] },
      { boss: { name: 'ROOSTER REGENT', hp: 110 },
        waves: [
          { pattern: 'swoop',    rows: 2, cols: 7, hp: 3, eggEvery: 2.1 },
          { pattern: 'dive',     rows: 2, cols: 6, hp: 3, eggEvery: 2.0, type: 2 },
          { pattern: 'straight', rows: 3, cols: 6, hp: 3, eggEvery: 1.9 },
          { pattern: 'dive',     rows: 2, cols: 7, hp: 3, eggEvery: 1.8, type: 1 },
          { pattern: 'swoop',    rows: 3, cols: 7, hp: 3, eggEvery: 1.7 },
          { pattern: 'dive',     rows: 2, cols: 6, hp: 3, eggEvery: 1.6, type: 2 },
        ] },
    ],
  },
};
