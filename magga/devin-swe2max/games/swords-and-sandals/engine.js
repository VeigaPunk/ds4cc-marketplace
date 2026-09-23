/* games/swords-and-sandals/engine.js — pure gladiator-RPG sim, Node-safe.
 * DUST & STEEL: ARENA OF CHAMPIONS — a remake of Swords & Sandals 2:
 * Emperor's Reign (2007). Turn-gated menu combat, gear treadmill,
 * 8-stat gladiator, rage/magic/ranged kit, 13-bout ladder to the Emperor.
 *
 * Combat constants descend from prototypes/swords-and-sandals.html — the
 * dossier marks the original tables un-captured, so these are authored
 * ("declared guesses" carried forward and tuned by validate.mjs).
 *
 * Determinism: st.rng (mulberry32). Shell feeds dt; enemy telegraph is a
 * timed phase so real-time presentation and validation share one code path.
 * All state lives on the returned `st` — serializable via save()/restore().
 */
(function (root) {
'use strict';

/* ---------- declared-guess combat constants (tuned by validator) ---------- */
const BASE_HIT = 0.74, HIT_MIN = 0.45, HIT_MAX = 0.96;
const CRIT_P = 0.10, CRIT_MUL = 1.55, DMG_VAR = 0.25;
const HEAVY_MUL = 1.7, HEAVY_HIT = -0.10, HEAVY_COST = 28;
const RAGE_MUL = 2.5, RAGE_COST = 55;
const STAM_REGEN = 12, TAUNT_STAM = 18, TAUNT_RAGE = 28;
const RAGE_DEALT = 14, RAGE_TAKEN = 18;
const ENEMY_TELL = 0.65;               // seconds of telegraph before enemy acts
const DEFEAT_GOLD_LOSS = 0.10;
const XP_NEXT = l => 60 + (l - 1) * 75;   // xp to go from l to l+1

/* ---------- stats ---------- */
// STR damage · AGI dodge/hit · ATK accuracy · DEF damage soak · VIT hp
// CHA shop discount+taunt · STA stamina pool · MAG mana/spell power
const STATS = ['str', 'agi', 'atk', 'def', 'vit', 'cha', 'sta', 'mag'];
const BASE_STAT = 2, CREATE_POINTS = 14, CREATE_CAP = 8, LEVEL_POINTS = 3;

const maxHp = g => 40 + g.stats.vit * 6 + (g.level - 1) * 5;
const maxSta = g => 40 + g.stats.sta * 5;
const maxMana = g => 20 + g.stats.mag * 5;
const discount = g => Math.min(0.30, g.stats.cha * 0.02);

/* ---------- items ---------- */
const WEAPONS = [
  { id: 'rusty',    name: 'Rusty Gladius',     dmg: 8,  price: 0,    lvl: 1 },
  { id: 'legion',   name: 'Legionnaire Sword', dmg: 14, price: 130,  lvl: 2 },
  { id: 'cleaver',  name: 'War Cleaver',       dmg: 20, price: 280,  lvl: 3 },
  { id: 'waraxe',   name: 'Dire War Axe',      dmg: 27, price: 520,  lvl: 5 },
  { id: 'fang',     name: 'Serpent Fang',      dmg: 34, price: 900,  lvl: 7 },
  { id: 'maul',     name: 'Ossified Maul',     dmg: 42, price: 1500, lvl: 9 },
  { id: 'doom',     name: 'Doombringer',       dmg: 52, price: 2400, lvl: 11 },
  { id: 'empedge',  name: "Usurper's Edge",    dmg: 64, price: 3800, lvl: 13 },
];
const BOWS = [
  { id: 'sling',  name: 'Peltast Sling',  dmg: 10, ammo: 8,  price: 90,  lvl: 2 },
  { id: 'bow',    name: 'Recurve Bow',    dmg: 16, ammo: 8,  price: 260, lvl: 4 },
  { id: 'xbows',  name: 'Scorpion Bolts', dmg: 24, ammo: 10, price: 600, lvl: 7 },
];
// armor slots: helm / chest / shield / legs — each tier set priced separately
const ARMOR = {
  helm:   [ { id: 'bare', name: 'Bare Brow',        def: 0, price: 0,    lvl: 1 },
            { id: 'leath', name: 'Leather Cap',     def: 1, price: 80,   lvl: 1 },
            { id: 'iron', name: 'Iron Galea',       def: 2, price: 220,  lvl: 3 },
            { id: 'crest', name: 'Crested Helm',    def: 3, price: 500,  lvl: 6 },
            { id: 'crown', name: 'Laurel Crown',    def: 5, price: 1100, lvl: 9 } ],
  chest:  [ { id: 'rags', name: 'Cloth Rags',       def: 0, price: 0,    lvl: 1 },
            { id: 'hide', name: 'Leather Hide',     def: 2, price: 120,  lvl: 1 },
            { id: 'mail', name: 'Ring Mail',        def: 4, price: 320,  lvl: 4 },
            { id: 'plate', name: 'Legion Plate',    def: 6, price: 800,  lvl: 7 },
            { id: 'champ', name: 'Champion Plate',  def: 9, price: 1800, lvl: 10 } ],
  shield: [ { id: 'none', name: 'No Shield',        def: 0, price: 0,    lvl: 1 },
            { id: 'buck', name: 'Wooden Buckler',   def: 1, price: 70,   lvl: 1 },
            { id: 'scut', name: 'Scutum',           def: 3, price: 260,  lvl: 4 },
            { id: 'tow', name: 'Tower Shield',      def: 5, price: 700,  lvl: 7 },
            { id: 'aegis', name: 'Gilded Aegis',    def: 7, price: 1500, lvl: 10 } ],
  legs:   [ { id: 'sand', name: 'Sandals',          def: 0, price: 0,    lvl: 1 },
            { id: 'wrap', name: 'Leg Wraps',        def: 1, price: 60,   lvl: 1 },
            { id: 'grea', name: 'Bronze Greaves',   def: 2, price: 200,  lvl: 3 },
            { id: 'ocre', name: 'Ocreae Plate',     def: 4, price: 550,  lvl: 6 },
            { id: 'wing', name: 'Winged Greaves',   def: 6, price: 1300, lvl: 9 } ],
};
const POTIONS = [
  { id: 'heal',   name: 'Blood Vial',     heal: 45,  price: 40,  lvl: 1 },
  { id: 'stam',   name: 'Boar Tonic',     stam: 50,  price: 30,  lvl: 1 },
  { id: 'rage',   name: 'Bile of Mars',   rage: 60,  price: 60,  lvl: 3 },
  { id: 'elixir', name: 'Panacea',        heal: 110, price: 140, lvl: 6 },
];
const MAX_POTIONS = 4;
const SPELLS = [
  { id: 'ember',  name: 'Ember Dart',  mana: 14, price: 200,  lvl: 2, kind: 'dmg' },
  { id: 'mend',   name: 'Mend Flesh',  mana: 18, price: 240,  lvl: 3, kind: 'heal' },
  { id: 'chant',  name: 'War Chant',   mana: 10, price: 160,  lvl: 2, kind: 'rage' },
  { id: 'frost',  name: 'Frostbite',   mana: 16, price: 320,  lvl: 5, kind: 'sap' },
  { id: 'doom',   name: 'Doombrand',   mana: 28, price: 700,  lvl: 8, kind: 'dmgBig' },
];

/* ---------- the ladder — 13 bouts, champions marked, Emperor last ---------- */
// stats mirror player fields; ai hints shape the priority list.
const ROSTER = [
  { name: 'BRUTUS THE FEEBLE',   title: 'arena fodder',        lvl: 1,
    stats: { str: 3, agi: 3, atk: 3, def: 0, vit: 4, cha: 0, sta: 4, mag: 0 },
    weapon: 0, armor: { helm: 0, chest: 0, shield: 0, legs: 0 }, gold: 110, xp: 45, ai: {} },
  { name: 'CASSIUS NINE-LIVES',  title: 'the survivor',        lvl: 2,
    stats: { str: 5, agi: 6, atk: 4, def: 1, vit: 5, cha: 0, sta: 5, mag: 0 },
    weapon: 1, armor: { helm: 1, chest: 1, shield: 1, legs: 1 }, gold: 170, xp: 70, ai: {} },
  { name: 'GAIUS THE WALL',      title: 'the immovable',       lvl: 3,
    stats: { str: 7, agi: 3, atk: 4, def: 4, vit: 8, cha: 0, sta: 6, mag: 0 },
    weapon: 1, armor: { helm: 1, chest: 1, shield: 2, legs: 1 }, gold: 250, xp: 95, ai: {} },
  { name: 'SWIFT MARCELLA',      title: 'the viper',           lvl: 4, champion: true,
    stats: { str: 7, agi: 10, atk: 7, def: 2, vit: 6, cha: 2, sta: 7, mag: 0 },
    weapon: 2, armor: { helm: 1, chest: 1, shield: 1, legs: 2 }, gold: 400, xp: 150, ai: { bow: 0 } },
  { name: 'OLGRUM THE HORN',     title: 'pit ogre',            lvl: 5,
    stats: { str: 11, agi: 3, atk: 5, def: 3, vit: 10, cha: 0, sta: 8, mag: 0 },
    weapon: 2, armor: { helm: 2, chest: 2, shield: 0, legs: 1 }, gold: 500, xp: 190, ai: { heavy: 0.4 } },
  { name: 'SISTER MERCY',        title: 'flagellant of the pit', lvl: 6,
    stats: { str: 7, agi: 6, atk: 6, def: 3, vit: 8, cha: 4, sta: 8, mag: 6 },
    weapon: 2, armor: { helm: 2, chest: 2, shield: 2, legs: 2 }, gold: 610, xp: 230,
    ai: { spells: ['mend', 'chant'] } },
  { name: 'THE QUIET GOTH',      title: 'says nothing',        lvl: 7,
    stats: { str: 11, agi: 8, atk: 8, def: 4, vit: 10, cha: 0, sta: 10, mag: 0 },
    weapon: 3, armor: { helm: 2, chest: 2, shield: 2, legs: 2 }, gold: 760, xp: 280, ai: { bow: 1 } },
  { name: 'DUKE OF RUIN',        title: 'champion of Ostia',   lvl: 8, champion: true,
    stats: { str: 12, agi: 8, atk: 9, def: 5, vit: 12, cha: 2, sta: 11, mag: 0 },
    weapon: 4, armor: { helm: 3, chest: 3, shield: 3, legs: 2 }, gold: 1010, xp: 380, ai: { bow: 1, heavy: 0.35 } },
  { name: 'HEXED HELVA',         title: 'the witch-marked',    lvl: 9,
    stats: { str: 8, agi: 9, atk: 9, def: 5, vit: 11, cha: 3, sta: 10, mag: 10 },
    weapon: 4, armor: { helm: 3, chest: 3, shield: 2, legs: 3 }, gold: 1170, xp: 440,
    ai: { spells: ['ember', 'frost', 'mend'] } },
  { name: 'KRAG TWICE-DROWNED',  title: 'the tide-dead',       lvl: 10,
    stats: { str: 15, agi: 7, atk: 10, def: 6, vit: 14, cha: 0, sta: 12, mag: 0 },
    weapon: 5, armor: { helm: 3, chest: 3, shield: 3, legs: 3 }, gold: 1400, xp: 520, ai: { heavy: 0.45 } },
  { name: 'VESTA SHADOWCROWN',   title: 'champion of Memphis', lvl: 11, champion: true,
    stats: { str: 12, agi: 12, atk: 12, def: 7, vit: 13, cha: 5, sta: 13, mag: 8 },
    weapon: 5, armor: { helm: 4, chest: 4, shield: 3, legs: 4 }, gold: 1710, xp: 640,
    ai: { bow: 2, spells: ['frost', 'chant'] } },
  { name: 'THE BEAST OF GADES',  title: 'unbroken',            lvl: 12,
    stats: { str: 17, agi: 10, atk: 12, def: 7, vit: 16, cha: 0, sta: 14, mag: 0 },
    weapon: 6, armor: { helm: 4, chest: 4, shield: 4, legs: 4 }, gold: 2160, xp: 780, ai: { heavy: 0.5 } },
  { name: 'EMPEROR VARUS',       title: 'the Undying Sovereign', lvl: 14, champion: true, emperor: true,
    stats: { str: 16, agi: 12, atk: 14, def: 8, vit: 20, cha: 6, sta: 16, mag: 10 },
    weapon: 7, armor: { helm: 4, chest: 4, shield: 4, legs: 4 }, gold: 4500, xp: 1500,
    ai: { bow: 2, spells: ['ember', 'mend', 'doom'], heavy: 0.35 } },
];

const SKINS = ['#e8b88a', '#c98a5a', '#8a5a3a', '#5a3a24', '#d4a574', '#a8b0b8'];
const HAIRS = ['#2a1c10', '#111', '#5a3a1a', '#8a2a1a', '#d8d8d8', 'none'];
const NAMES = ['MAXIMUS', 'SPARTAX', 'CRIXA', 'FLAMMA', 'VERUS', 'TIGRIS', 'OKKO', 'DRAKO'];

/* ---------- create ---------- */
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

function newGladiator(name, look, stats) {
  return {
    name: (name || 'NAMELESS').toUpperCase().slice(0, 14),
    look,                                    // {skin, hair, beard}
    stats: { ...stats }, level: 1, xp: 0, statPts: 0,
    gold: 110, potions: { heal: 1, stam: 0, rage: 0, elixir: 0 },
    weapon: 0, ownedW: [0],
    armor: { helm: 0, chest: 0, shield: 0, legs: 0 },
    ownedA: { helm: [0], chest: [0], shield: [0], legs: [0] },
    bow: -1, ownedB: [], spells: [],
    nextOpp: 0, champion: false, wins: 0, losses: 0,
  };
}

function create(seed = 1) {
  return {
    rng: mulberry32(seed), scene: 'hub',     // hub | fight | levelup | champion
    glad: null,                              // set via enroll()
    fight: null, events: [], t: 0,
  };
}
function enroll(st, name, look, stats) { st.glad = newGladiator(name, look, stats); st.events.push('enroll'); }

function xpAward(st, xp) {
  const g = st.glad;
  g.xp += xp;
  let ups = 0;
  while (g.xp >= XP_NEXT(g.level)) { g.xp -= XP_NEXT(g.level); g.level++; g.statPts += LEVEL_POINTS; ups++; }
  return ups;
}

/* ---------- shop ---------- */
const price = (g, p) => Math.max(1, Math.round(p * (1 - discount(g))));
function buy(st, kind, key, idx) {
  const g = st.glad;
  if (kind === 'weapon') {
    const it = WEAPONS[idx];
    if (!it || g.level < it.lvl || g.ownedW.includes(idx) || g.gold < price(g, it.price)) return false;
    g.gold -= price(g, it.price); g.ownedW.push(idx); g.weapon = idx;
    st.events.push('buy'); return true;
  }
  if (kind === 'armor') {
    const it = ARMOR[key]?.[idx];
    if (!it || g.level < it.lvl || g.ownedA[key].includes(idx) || g.gold < price(g, it.price)) return false;
    g.gold -= price(g, it.price); g.ownedA[key].push(idx); g.armor[key] = idx;
    st.events.push('buy'); return true;
  }
  if (kind === 'bow') {
    const it = BOWS[idx];
    if (!it || g.level < it.lvl || g.ownedB.includes(idx) || g.gold < price(g, it.price)) return false;
    g.gold -= price(g, it.price); g.ownedB.push(idx); g.bow = idx;
    st.events.push('buy'); return true;
  }
  if (kind === 'potion') {
    const it = POTIONS[idx];
    const total = Object.values(g.potions).reduce((a, b) => a + b, 0);
    if (!it || g.level < it.lvl || total >= MAX_POTIONS || g.gold < price(g, it.price)) return false;
    g.gold -= price(g, it.price); g.potions[it.id]++;
    st.events.push('buy'); return true;
  }
  if (kind === 'spell') {
    const it = SPELLS.find(s => s.id === key);
    if (!it || g.level < it.lvl || g.spells.includes(key) || g.gold < price(g, it.price)) return false;
    g.gold -= price(g, it.price); g.spells.push(key);
    st.events.push('buy'); return true;
  }
  return false;
}
const equip = (g, kind, key, idx) => {
  if (kind === 'weapon' && g.ownedW.includes(idx)) { g.weapon = idx; return true; }
  if (kind === 'armor' && g.ownedA[key].includes(idx)) { g.armor[key] = idx; return true; }
  if (kind === 'bow' && g.ownedB.includes(idx)) { g.bow = idx; return true; }
  return false;
};

/* ---------- derived combat values ---------- */
function pDef(g) {
  return g.stats.def + ARMOR.helm[g.armor.helm].def + ARMOR.chest[g.armor.chest].def +
         ARMOR.shield[g.armor.shield].def + ARMOR.legs[g.armor.legs].def;
}
const eDefOf = o => o.stats.def +
  ARMOR.helm[o.armor.helm].def + ARMOR.chest[o.armor.chest].def +
  ARMOR.shield[o.armor.shield].def + ARMOR.legs[o.armor.legs].def;

function hitChance(rng, a, d, mod) {
  return clamp(BASE_HIT + (a - d) * 0.03 + mod, HIT_MIN, HIT_MAX);
}
function rollDmg(rng, str, wdmg, def, mul) {
  const base = (wdmg + str * 2) * mul;
  const v = base * (1 - DMG_VAR / 2 + rng() * DMG_VAR);
  return Math.max(1, Math.round(v - def));
}

/* ---------- fight ---------- */
function startFight(st) {
  const g = st.glad;
  const o = ROSTER[g.nextOpp];
  if (!o) return false;
  st.scene = 'fight';
  st.fight = {
    opp: o,
    php: maxHp(g), ehp: 40 + o.stats.vit * 6 + (o.lvl - 1) * 5,
    pstam: maxSta(g), estam: 40 + o.stats.sta * 5,
    pmana: maxMana(g), emana: 20 + o.stats.mag * 5,
    prage: 0, pAmmo: g.bow >= 0 ? BOWS[g.bow].ammo : 0,
    phase: 'player', tell: 0, turn: 1, done: false, won: false,
    oppPotion: true, frostBite: 0, chantOn: false,
    log: [`${o.name} — ${o.title} — steps into the dust.`],
  };
  st.events.push('fightStart');
  return true;
}
const flog = (f, m) => { f.log.push(m); if (f.log.length > 7) f.log.shift(); };

function legalActions(st) {
  const g = st.glad, f = st.fight;
  if (!f || f.phase !== 'player' || f.done) return [];
  const acts = ['attack', 'taunt', 'hold'];
  if (f.pstam >= HEAVY_COST) acts.push('heavy');
  if (f.prage >= RAGE_COST) acts.push('rage');
  if (g.potions.heal > 0 || g.potions.stam > 0 || g.potions.rage > 0 || g.potions.elixir > 0) acts.push('potion');
  if (g.spells.length && f.pmana >= 10) acts.push('cast');
  if (f.pAmmo > 0) acts.push('bow');
  return acts;
}

function hurtPlayer(st, dmg, tag) {
  const f = st.fight, g = st.glad;
  f.php -= dmg;
  f.prage = clamp(f.prage + RAGE_TAKEN, 0, 100);
  flog(f, tag || `You take ${dmg}.`);
}

function playerStrike(st, mul, mod, label) {
  const g = st.glad, f = st.fight, o = f.opp;
  const hc = hitChance(st.rng, g.stats.agi + g.stats.atk, o.stats.agi * 1.4, mod);
  if (st.rng() < hc) {
    const crit = st.rng() < CRIT_P;
    const d = rollDmg(st.rng, g.stats.str, WEAPONS[g.weapon].dmg, eDefOf(o), mul * (crit ? CRIT_MUL : 1));
    f.ehp -= d;
    f.prage = clamp(f.prage + RAGE_DEALT, 0, 100);
    flog(f, `${g.name} ${crit ? 'CRITS ' : ''}${label || 'hits'} ${o.name} for ${d}`);
    st.events.push(crit ? 'crit' : 'hit');
    return d;
  }
  flog(f, `${g.name} ${label === 'HEAVY' ? 'heavy swing ' : ''}misses!`);
  st.events.push('miss');
  return 0;
}

function playerAct(st, act, arg) {
  const f = st.fight, g = st.glad;
  if (!f || f.phase !== 'player' || f.done) return false;
  let acted = true;
  switch (act) {
    case 'attack': playerStrike(st, 1, 0); break;
    case 'heavy':
      if (f.pstam < HEAVY_COST) return false;
      f.pstam -= HEAVY_COST;
      playerStrike(st, HEAVY_MUL, HEAVY_HIT, 'lands a HEAVY BLOW on');
      break;
    case 'rage':
      if (f.prage < RAGE_COST) return false;
      f.prage -= RAGE_COST;
      { // always connects — the roar of the crowd made manifest
        const d = rollDmg(st.rng, g.stats.str, WEAPONS[g.weapon].dmg, eDefOf(f.opp), RAGE_MUL);
        f.ehp -= d; flog(f, `${g.name} unleashes RAGE for ${d}!`);
        st.events.push('rageHit');
      }
      break;
    case 'potion': {
      const it = POTIONS.find(p => p.id === arg) || POTIONS[0];
      if (!g.potions[it.id]) return false;
      g.potions[it.id]--;
      if (it.heal) { f.php = Math.min(maxHp(g), f.php + it.heal); flog(f, `${g.name} quaffs ${it.name} (+${it.heal})`); }
      if (it.stam) { f.pstam = Math.min(maxSta(g), f.pstam + it.stam); flog(f, `${g.name} gulps ${it.name} (+${it.stam} stamina)`); }
      if (it.rage) { f.prage = clamp(f.prage + it.rage, 0, 100); flog(f, `${g.name} burns with ${it.name} (+${it.rage} rage)`); }
      st.events.push('potion');
      break;
    }
    case 'cast': {
      const sp = SPELLS.find(s => s.id === arg);
      if (!sp || !g.spells.includes(sp.id) || f.pmana < sp.mana) return false;
      f.pmana -= sp.mana;
      if (sp.kind === 'dmg' || sp.kind === 'dmgBig') {
        const mul = sp.kind === 'dmgBig' ? 4.5 : 3;
        const pierce = sp.kind === 'dmgBig' ? 0 : eDefOf(f.opp) * 0.5;
        const d = Math.max(1, Math.round(g.stats.mag * mul + g.level * 2 - pierce));
        f.ehp -= d; flog(f, `${g.name} casts ${sp.name} — ${d} damage!`);
      } else if (sp.kind === 'heal') {
        const h = g.stats.mag * 4 + g.level * 3;
        f.php = Math.min(maxHp(g), f.php + h); flog(f, `${g.name} casts Mend Flesh (+${h})`);
      } else if (sp.kind === 'rage') {
        f.prage = clamp(f.prage + 40, 0, 100); flog(f, `${g.name} bellows the War Chant (+40 rage)`);
      } else if (sp.kind === 'sap') {
        f.estam = Math.max(0, f.estam - 30); f.frostBite = 1;
        flog(f, `Frostbite saps ${f.opp.name} (-30 stamina, dulled aim)`);
      }
      st.events.push('cast');
      break;
    }
    case 'bow': {
      if (f.pAmmo <= 0) return false;
      f.pAmmo--;
      const bow = BOWS[g.bow];
      const hc = hitChance(st.rng, g.stats.agi + g.stats.atk, f.opp.stats.agi, 0.05);
      if (st.rng() < hc) {
        const d = Math.max(1, Math.round((bow.dmg + g.stats.atk) * (1 - DMG_VAR / 2 + st.rng() * DMG_VAR) - eDefOf(f.opp) * 0.4));
        f.ehp -= d; flog(f, `${g.name}'s ${bow.name} strikes for ${d}`);
        st.events.push('hit');
      } else { flog(f, `The shot goes wide!`); st.events.push('miss'); }
      break;
    }
    case 'taunt': {
      const bonus = 4 + g.stats.cha;
      f.pstam = Math.min(maxSta(g), f.pstam + TAUNT_STAM);
      f.prage = clamp(f.prage + TAUNT_RAGE + bonus, 0, 100);
      flog(f, `${g.name} taunts the crowd (+${TAUNT_STAM} stamina, +${TAUNT_RAGE + bonus} rage)`);
      st.events.push('taunt');
      break;
    }
    case 'hold': flog(f, `${g.name} holds, catching breath.`); st.events.push('hold'); break;
    default: return false;
  }
  if (!acted) return false;
  f.pstam = Math.min(maxSta(g), f.pstam + STAM_REGEN);
  if (f.ehp <= 0) { endFight(st, true); return true; }
  f.phase = 'enemy'; f.tell = ENEMY_TELL;
  return true;
}

/* ---------- enemy AI — priority list (prototype carry-forward) ---------- */
function enemyAct(st) {
  const f = st.fight, o = f.opp, g = st.glad;
  if (!f || f.done) return;
  const ai = o.ai || {};
  const hitMod = f.frostBite ? -0.15 : 0; f.frostBite = 0;

  const eStrike = (mul, mod, label) => {
    const hc = hitChance(st.rng, o.stats.agi + o.stats.atk, g.stats.agi + g.stats.def * 0.4, mod + hitMod);
    if (st.rng() < hc) {
      const crit = st.rng() < CRIT_P;
      const d = rollDmg(st.rng, o.stats.str, WEAPONS[o.weapon].dmg, pDef(g), mul * (crit ? CRIT_MUL : 1));
      f.php -= d; flog(f, `${o.name} ${crit ? 'CRITS ' : ''}${label || 'hits'} you for ${d}`);
      st.events.push(crit ? 'eCrit' : 'eHit');
      return d;
    }
    flog(f, `${o.name} ${label === 'HEAVY' ? 'heavy swing ' : ''}misses!`);
    st.events.push('eMiss');
    return 0;
  };

  // 1. heal once when bloodied
  const oMax = 40 + o.stats.vit * 6 + (o.lvl - 1) * 5;
  if (f.ehp < oMax * 0.35 && f.oppPotion) {
    f.oppPotion = false;
    f.ehp = Math.min(oMax, f.ehp + 45);
    flog(f, `${o.name} drinks a vile potion (+45)`);
    st.events.push('ePotion');
  }
  // 2. cast a known spell when mana allows
  else if (ai.spells && ai.spells.length) {
    const pick = ai.spells.find(id => {
      const sp = SPELLS.find(s => s.id === id);
      return sp && f.emana >= sp.mana && !(sp.kind === 'heal' && f.ehp > oMax * 0.7) &&
             !(sp.kind === 'rage' && f.chantOn);
    });
    if (pick) {
      const sp = SPELLS.find(s => s.id === pick);
      f.emana -= sp.mana;
      if (sp.kind === 'heal') { const h = o.stats.mag * 4 + o.lvl * 3; f.ehp = Math.min(oMax, f.ehp + h); flog(f, `${o.name} mends flesh (+${h})`); }
      else if (sp.kind === 'rage') { f.chantOn = true; flog(f, `${o.name} bellows a war chant`); }
      else if (sp.kind === 'sap') { f.pstam = Math.max(0, f.pstam - 30); flog(f, `Frostbite numbs your arms (-30 stamina)`); }
      else {
        const d = Math.max(1, Math.round(o.stats.mag * (sp.kind === 'dmgBig' ? 4.5 : 3) + o.lvl * 2 - pDef(g) * 0.4));
        hurtPlayer(st, d, `${o.name} casts ${sp.name} — ${d} damage!`);
      }
      st.events.push('eCast');
    } else eStrike(1, 0);
  }
  // 3. bow volley if armed
  else if (ai.bow !== undefined && st.rng() < 0.3) {
    const hc = hitChance(st.rng, o.stats.agi + o.stats.atk, g.stats.agi, 0.05 + hitMod);
    if (st.rng() < hc) {
      const d = Math.max(1, Math.round((BOWS[ai.bow].dmg + o.stats.atk) * (1 - DMG_VAR / 2 + st.rng() * DMG_VAR) - pDef(g) * 0.4));
      hurtPlayer(st, d, `${o.name}'s ${BOWS[ai.bow].name} strikes for ${d}`);
    } else { flog(f, `${o.name}'s shot goes wide`); st.events.push('eMiss'); }
  }
  // 4. heavy when flush
  else if (f.estam >= HEAVY_COST && (f.ehp < oMax * 0.5 || st.rng() < (ai.heavy || 0.22))) {
    f.estam -= HEAVY_COST;
    eStrike(HEAVY_MUL, HEAVY_HIT, 'HEAVY');
  }
  else eStrike(1, 0);

  f.estam = Math.min(60 + o.stats.sta * 4, f.estam + STAM_REGEN);
  f.emana += 4;
  if (f.php <= 0) { endFight(st, false); return; }
  f.phase = 'player'; f.turn++;
}

function endFight(st, won) {
  const f = st.fight, g = st.glad;
  f.done = true; f.won = won;
  if (won) {
    const o = f.opp;
    g.gold += o.gold;
    g.wins++;
    const ups = xpAward(st, o.xp);
    g.nextOpp++;
    flog(f, `VICTORY! +${o.gold} gold, +${o.xp} xp${ups ? ` — LEVEL UP! +${LEVEL_POINTS} stat pts` : ''}`);
    st.events.push(o.emperor ? 'emperorDown' : 'victory');
    if (o.emperor) { g.champion = true; st.events.push('champion'); }
  } else {
    const loss = Math.round(g.gold * DEFEAT_GOLD_LOSS);
    g.gold -= loss; g.losses++;
    flog(f, `DEFEAT. The crowd bays. -${loss} gold.`);
    st.events.push('defeat');
  }
}

/* tick drives the enemy telegraph; real-time shell and validator share it */
function tick(st, dt) {
  st.t += dt;
  const f = st.fight;
  if (st.scene === 'fight' && f && !f.done && f.phase === 'enemy') {
    f.tell -= dt;
    if (f.tell <= 0) enemyAct(st);
  }
}
function leaveFight(st) {
  if (st.fight && st.fight.done) {
    st.fight = null;
    st.scene = st.glad.champion ? 'champion' : 'hub';
    return true;
  }
  return false;
}

/* ---------- save blob ---------- */
function save(g) {
  return JSON.stringify({ v: 1, glad: g });
}
function restore(st, blob) {
  try {
    const d = JSON.parse(blob);
    if (d && d.glad && d.glad.stats) { st.glad = d.glad; return true; }
  } catch (e) {}
  return false;
}

const SAS = {
  STATS, BASE_STAT, CREATE_POINTS, CREATE_CAP, LEVEL_POINTS,
  WEAPONS, BOWS, ARMOR, POTIONS, SPELLS, ROSTER, SKINS, HAIRS, NAMES,
  HEAVY_COST, RAGE_COST, XP_NEXT, MAX_POTIONS,
  maxHp, maxSta, maxMana, discount, price, pDef, eDefOf,
  create, enroll, buy, equip, startFight, playerAct, legalActions, tick, leaveFight,
  save, restore, hitChance, rollDmg,
};
if (typeof module !== 'undefined' && module.exports) module.exports = SAS;
root.SASENGINE = SAS;
})(typeof globalThis !== 'undefined' ? globalThis : this);
