/* games/burger-tycoon/engine.js — pure supply-chain economy sim, Node-safe.
 * BURGER BARON: four-pane management satire in the spirit of Molleindustria's
 * McDonald's Videogame (2006). Original title/branding — no McD marks.
 *
 * Causal chain: FARMLAND grows crops → herd grazes crops → FEEDLOT slaughters
 * cattle into patties → RESTAURANT sells patties for cash → overhead drains
 * cash → HQ board punishes stalls. Dirty toggles trade short-term gain for
 * backlash → reputation collapse. Lose on cash<=0 or rep<=0. No clean win —
 * the satire lives in that coupling; score is survival time + peak cash.
 *
 * Determinism: all randomness via st.rng (mulberry32) — validate.mjs replays.
 * Actions are data (ACTIONS) applied via apply() — never hidden mutation.
 */
(function (root) {
'use strict';

const PANES = ['FARMLAND', 'FEEDLOT', 'RESTAURANT', 'HQ'];
const PANE_KEY = ['farm', 'feed', 'rest', 'hq'];

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/* ---------- action table (data-driven; shared by shell UI + validator) ------
 * Each: { id, label, desc, dirty?, cost?, cd?, apply(st) → bool }
 * `cd` = seconds cooldown so click-spam can't break the economy. */
const ACTIONS = {
  farm: [
    { id: 'sow', icon: 'wheat', label: 'SOW SOY FIELD', desc: '+15 crops · $10',
      cost: 10, cd: 1.5, apply: st => { st.crops += 15; } },
    { id: 'cattle', icon: 'cow', label: 'BUY CATTLE', desc: '+5 head · $80',
      cost: 80, cd: 2, apply: st => { st.cattle += 5; } },
    { id: 'hands', icon: 'person', label: 'HIRE FARMHANDS', desc: 'crop rate +0.4 · $150',
      cost: 150, cd: 4, apply: st => { st.rates.crop += 0.4; } },
    { id: 'deforest', icon: 'dozer', dirty: 'deforest', label: 'DIRTY: BULLDOZE RAINFOREST',
      desc: '2.2x crop growth · +backlash', cd: 0.5,
      apply: st => { st.dirty.deforest ^= 1; } },
  ],
  feed: [
    { id: 'slaughter', icon: 'cleaver', label: 'EMERGENCY SLAUGHTER', desc: '-2 cattle → +4 patties',
      cd: 1, can: st => st.cattle >= 2, apply: st => { st.cattle -= 2; st.patties += 4; } },
    { id: 'line', icon: 'feedbag', label: 'SECOND LINE', desc: 'patty capacity +0.5 · $180',
      cost: 180, cd: 4, apply: st => { st.rates.patty += 0.5; } },
    { id: 'cheapFeed', icon: 'feedbag', dirty: 'cheapFeed', label: 'DIRTY: CHEAP FEED',
      desc: '1.8x patties · disease risk · +backlash', cd: 0.5,
      apply: st => { st.dirty.cheapFeed ^= 1; } },
  ],
  rest: [
    { id: 'promo', icon: 'mega', label: 'PROMO PUSH', desc: 'demand +0.3 · $40',
      cost: 40, cd: 2, apply: st => { st.demand = Math.min(3, st.demand + 0.3); } },
    { id: 'store', icon: 'burger', label: 'NEW STORE', desc: 'sell rate +0.4 · $250',
      cost: 250, cd: 4, apply: st => { st.rates.sell += 0.4; } },
    { id: 'cutCorners', icon: 'warn', dirty: 'cutCorners', label: 'DIRTY: CUT CORNERS',
      desc: '1.6x margin · +backlash', cd: 0.5,
      apply: st => { st.dirty.cutCorners ^= 1; } },
  ],
  hq: [
    { id: 'marketing', icon: 'megabadge', label: 'MARKETING CAMPAIGN', desc: 'demand +0.6 · $120',
      cost: 120, cd: 3, apply: st => { st.demand = Math.min(3, st.demand + 0.6); } },
    { id: 'pr', icon: 'spin', label: 'PR SPIN', desc: '-15 backlash · $100',
      cost: 100, cd: 3, apply: st => { st.backlash = Math.max(0, st.backlash - 15); } },
    { id: 'lobby', icon: 'tower', label: 'LOBBY FUND', desc: '-10 board pressure · $90',
      cost: 90, cd: 3, apply: st => { st.boardPressure = Math.max(0, st.boardPressure - 10); } },
    { id: 'bribe', icon: 'cash', dirty: 'bribe', label: 'DIRTY: BRIBE OFFICIALS',
      desc: '-25 backlash · $200 · -4 rep', cost: 200, cd: 5,
      apply: st => { st.backlash = Math.max(0, st.backlash - 25); st.rep -= 4; } },
  ],
};

function create(seed = 1) {
  const st = {
    rng: mulberry32(seed),
    t: 0, over: false, overWhy: '',
    cash: 500, rep: 70, backlash: 0,
    crops: 20, cattle: 10, patties: 10,
    demand: 1.0, boardPressure: 0, disease: 0,
    mediaT: 0, activistT: 0, milestoneIdx: 0,
    /* Balance: grazing must roughly sustain the slaughter draw or buying
     * cattle is a loss-leader and the whole chain bleeds to death. Herd
     * growth ~0.55/s ≈ consumption 0.5×pattyRate; margin 6.5 vs overhead
     * 4 + t/300 creep → profitable early, tightening arc. */
    rates: { crop: 1.2, herd: 0.55, patty: 0.9, sell: 1.0, profitPerBurger: 6.5, overhead: 4 },
    dirty: { deforest: 0, cheapFeed: 0, cutCorners: 0, bribe: 0 },
    lastProfit: 0,
    cooldowns: {},                    // actionId → seconds remaining
    stats: { peakCash: 500, burgersSold: 0, outbreaks: 0, dirtyTime: 0 },
    log: [],                          // ring buffer [{t, msg}]
    events: [],                       // drained by shell each frame → SFX
  };
  slog(st, 'Burger Baron opens its doors — four panes, one economy.');
  return st;
}

function slog(st, msg) {
  st.log.unshift({ t: +st.t.toFixed(1), msg });
  if (st.log.length > 40) st.log.length = 40;
}

function apply(st, paneKey, actionIdx) {
  if (st.over) return false;
  const a = ACTIONS[paneKey] && ACTIONS[paneKey][actionIdx];
  if (!a) return false;
  if ((st.cooldowns[a.id] || 0) > 0) return false;
  if (a.can && !a.can(st)) { slog(st, `${a.label}: not possible now`); return false; }
  if (a.cost && st.cash < a.cost) { slog(st, `${a.label}: can't afford ($${a.cost})`); st.events.push('deny'); return false; }
  if (a.cost) st.cash -= a.cost;
  a.apply(st);
  st.cooldowns[a.id] = a.cd || 1;
  slog(st, a.label);
  st.events.push(a.dirty ? 'dirty' : 'act');
  return true;
}

const MILESTONES = [120, 300, 600, 1200];       // seconds survived

function step(st, dt) {
  if (st.over) return;
  st.t += dt;
  for (const k in st.cooldowns) st.cooldowns[k] = Math.max(0, st.cooldowns[k] - dt);
  const d = st.dirty;

  // FARMLAND: crops grow (deforest multiplies); herd grazes crops and grows
  const cropRate = st.rates.crop * (d.deforest ? 2.2 : 1);
  st.crops += cropRate * dt;
  if (st.crops > 1 && st.cattle > 0) {
    const graze = Math.min(st.crops, st.rates.herd * dt * 2);
    st.crops -= graze; st.cattle += st.rates.herd * dt;
  }

  // FEEDLOT: slaughter cattle → patties (herd consumed); feed consumed too
  const capacity = st.rates.patty * (d.cheapFeed ? 1.8 : 1);
  const pattyRate = Math.min(st.cattle * 0.5, st.crops * 0.5, capacity);
  if (pattyRate > 0) {
    st.patties += pattyRate * dt;
    st.cattle -= pattyRate * 0.5 * dt;
    st.crops -= pattyRate * 0.5 * dt;
  }
  if (d.cheapFeed) st.disease += 0.6 * dt;
  else st.disease = Math.max(0, st.disease - 0.25 * dt);
  if (st.disease > 20) {
    st.disease = 0; st.cattle *= 0.5; st.rep -= 12; st.backlash += 15;
    st.stats.outbreaks++;
    slog(st, 'DISEASE OUTBREAK: herd culled, rep -12');
    st.events.push('outbreak');
  }

  // RESTAURANT: patties → cash at demand-limited rate
  const sellRate = Math.min(st.patties, st.rates.sell * st.demand * (d.cutCorners ? 1.5 : 1));
  if (sellRate > 0) {
    st.patties -= sellRate * dt;
    const margin = st.rates.profitPerBurger * (d.cutCorners ? 1.6 : 1);
    const earn = sellRate * margin * dt;
    st.cash += earn; st.lastProfit = sellRate * margin;
    st.stats.burgersSold += sellRate * dt;
  } else st.lastProfit = 0;

  // OVERHEAD: wages + rent always drain; grows slowly (expansion pressure)
  st.cash -= (st.rates.overhead + st.t / 300) * dt;

  // HQ: board pressure — rises when profit stalls; interventions cost cash
  const stall = st.lastProfit <= st.rates.overhead ? 1.4 : 0.4;
  st.boardPressure += stall * dt * (st.lastProfit > st.rates.overhead * 2 ? -1 : 1);
  st.boardPressure = Math.max(0, st.boardPressure);
  if (st.boardPressure > 100) {
    st.cash -= 60; st.boardPressure = 40;
    slog(st, 'BOARD INTERVENTION: emergency loan cost -$60');
    st.events.push('board');
  }

  // backlash dynamics: dirty toggles accrue; decays slowly when clean
  let bl = 0;
  if (d.deforest) bl += 1.2; if (d.cheapFeed) bl += 0.8; if (d.cutCorners) bl += 1.0;
  st.backlash += (bl - 0.35) * dt;
  st.backlash = Math.max(0, Math.min(100, st.backlash));
  if (bl > 0) st.stats.dirtyTime += dt;

  // event layer (accumulator + threshold):
  //  — sustained backlash >55 → activist protests (rep drain + headline)
  if (st.backlash > 55) {
    st.activistT += dt;
    if (st.activistT > 12) {
      st.activistT = 0; st.rep -= 5;
      slog(st, 'ACTIVIST PROTEST outside stores: rep -5');
      st.events.push('protest');
    }
  } else st.activistT = Math.max(0, st.activistT - dt);
  //  — all three dirty toggles at once → media exposé risk
  if (d.deforest && d.cheapFeed && d.cutCorners) {
    st.mediaT += dt;
    if (st.mediaT > 10 && st.rng() < 0.01) {
      st.mediaT = 0; st.backlash += 20; st.rep -= 8;
      slog(st, 'MEDIA EXPOSÉ: "THE FILTHY CHAIN" — backlash +20, rep -8');
      st.events.push('expose');
    }
  } else st.mediaT = 0;

  if (st.backlash > 60) st.rep -= 1.5 * dt;
  if (st.backlash > 85) st.rep -= 3 * dt;
  st.rep = Math.max(0, Math.min(100, st.rep));
  st.cash = Math.max(0, st.cash);
  if (st.cash > st.stats.peakCash) st.stats.peakCash = st.cash;

  // milestones → score beats (survival is the score)
  if (st.milestoneIdx < MILESTONES.length && st.t >= MILESTONES[st.milestoneIdx]) {
    st.milestoneIdx++;
    slog(st, `MILESTONE: ${MILESTONES[st.milestoneIdx - 1] / 60} minutes in business`);
    st.events.push('milestone');
  }

  if (st.rep <= 0) return gameOver(st, 'REPUTATION COLLAPSE — activists shut you down');
  if (st.cash <= 0) return gameOver(st, 'BANKRUPT — overhead + board ate the company');
}

function gameOver(st, why) {
  st.over = true; st.overWhy = why;
  slog(st, 'GAME OVER: ' + why);
  st.events.push('gameOver');
}

root.BurgerEngine = { PANES, PANE_KEY, ACTIONS, MILESTONES, create, step, apply, mulberry32 };
})(typeof globalThis !== 'undefined' ? globalThis : this);
