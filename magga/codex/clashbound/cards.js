/* Clashbound — card pool (44 cards) + 3 heroes. Original designs; HS is a mechanics
   reference only — no copied text. Global: CB.cards, CB.heroes.
   Keywords: Guard, Blitz, Pierce, Deathcry, Warcry, Ward (all original names). */
(function (root) {
  const CB = (root.CB = root.CB || {});
  const E = () => CB.engine;

  const POOL = [
    // ---- Minions: curve 1..8 ----
    { id: "pit-rat",        name: "Pit Rat",        type: "minion", cost: 1, atk: 2, hp: 1, keywords: [], text: "" },
    { id: "scrap-pup",      name: "Scrap Pup",      type: "minion", cost: 1, atk: 1, hp: 2, keywords: ["Blitz"], text: "Blitz" },
    { id: "odds-seller",    name: "Odds Seller",    type: "minion", cost: 1, atk: 1, hp: 1, keywords: [], text: "Warcry: draw a card.",
      warcry: (st, pi) => { E().drawCard(st, st.players[pi]); } },
    { id: "brick-keeper",   name: "Brick Keeper",   type: "minion", cost: 2, atk: 1, hp: 3, keywords: ["Guard"], text: "Guard" },
    { id: "chain-dog",      name: "Chain Dog",      type: "minion", cost: 2, atk: 3, hp: 2, keywords: [], text: "" },
    { id: "stubborn-mule",  name: "Stubborn Mule",  type: "minion", cost: 2, atk: 2, hp: 3, keywords: [], text: "" },
    { id: "banner-crier",   name: "Banner Crier",   type: "minion", cost: 2, atk: 2, hp: 2, keywords: [], text: "Warcry: your minions get +1 ATK.",
      warcry: (st, pi) => { for (const m of st.players[pi].board) if (m.atk > 0) m.atk += 1; } },
    { id: "rust-shaman",    name: "Rust Shaman",    type: "minion", cost: 2, atk: 2, hp: 3, keywords: ["Ward"], text: "Ward" },
    { id: "hook-fighter",   name: "Hook Fighter",   type: "minion", cost: 3, atk: 4, hp: 2, keywords: ["Blitz"], text: "Blitz" },
    { id: "bell-ringer",    name: "Bell Ringer",    type: "minion", cost: 3, atk: 3, hp: 3, keywords: [], text: "Warcry: deal 1 to a random enemy minion.",
      warcry: (st, pi) => { const b = st.players[1 - pi].board; if (b.length) E().dealDamage(st, b[Math.floor(st.rand() * b.length)], 1); } },
    { id: "pit-medic",      name: "Pit Medic",      type: "minion", cost: 3, atk: 2, hp: 4, keywords: [], text: "Warcry: restore 3 HP to a friendly minion.",
      warcry: (st, pi, self, target) => { const t = target && target.hp !== undefined && target.owner === pi ? target : self; t.hp = Math.min(t.maxHp + 2, t.hp + 3); t.maxHp = Math.max(t.maxHp, t.hp); } },
    { id: "crowd-favorite", name: "Crowd Favorite", type: "minion", cost: 3, atk: 3, hp: 4, keywords: [], text: "" },
    { id: "glass-lancer",   name: "Glass Lancer",   type: "minion", cost: 3, atk: 5, hp: 1, keywords: ["Pierce"], text: "Pierce" },
    { id: "corner-brute",   name: "Corner Brute",   type: "minion", cost: 4, atk: 5, hp: 4, keywords: [], text: "" },
    { id: "spark-twins",    name: "Spark Twins",    type: "minion", cost: 4, atk: 3, hp: 3, keywords: [], text: "Warcry: summon a twin.",
      warcry: (st, pi, self) => { const p = st.players[pi]; if (p.board.length < E().BOARD_CAP) { const t = { uid: self.uid + "t", card: self.card, owner: pi, atk: 3, hp: 3, maxHp: 3, sick: true, wardUsed: false, attacked: false, tempAtk: 0 }; p.board.push(t); } } },
    { id: "grave-announcer",name: "Grave Announcer",type: "minion", cost: 4, atk: 4, hp: 3, keywords: [], text: "Deathcry: draw a card.",
      deathcry: (st, pi) => { E().drawCard(st, st.players[pi]); } },
    { id: "wall-of-teeth",  name: "Wall of Teeth",  type: "minion", cost: 4, atk: 3, hp: 5, keywords: ["Guard"], text: "Guard" },
    { id: "knife-rain",     name: "Knife Rain",     type: "minion", cost: 5, atk: 4, hp: 4, keywords: ["Blitz"], text: "Blitz. Warcry: deal 1 to all enemy minions.",
      warcry: (st, pi) => { const opp = st.players[1 - pi]; for (const m of opp.board.slice()) E().dealDamage(st, m, 1); } },
    { id: "iron-barker",    name: "Iron Barker",    type: "minion", cost: 5, atk: 5, hp: 4, keywords: ["Guard"], text: "Guard" },
    { id: "void-bookie",    name: "Void Bookie",    type: "minion", cost: 5, atk: 4, hp: 6, keywords: ["Ward"], text: "Ward" },
    { id: "last-bell",      name: "Last Bell",      type: "minion", cost: 6, atk: 6, hp: 6, keywords: ["Guard"], text: "Guard" },
    { id: "bone-colossus",  name: "Bone Colossus",  type: "minion", cost: 7, atk: 7, hp: 7, keywords: ["Guard"], text: "Guard" },
    { id: "arena-champion", name: "Arena Champion", type: "minion", cost: 6, atk: 6, hp: 6, keywords: ["Blitz"], text: "Blitz" },
    { id: "the-main-event", name: "The Main Event", type: "minion", cost: 8, atk: 8, hp: 8, keywords: ["Blitz"], text: "Blitz" },

    // ---- Spells ----
    { id: "the-push",       name: "The Push",       type: "spell", cost: 0, text: "+1 mana this turn. Draw a card.",
      effect: (st, pi) => { st.players[pi].tempMana += 1; E().drawCard(st, st.players[pi]); } },
    { id: "sucker-punch",   name: "Sucker Punch",   type: "spell", cost: 1, text: "Deal 2 to a minion or the enemy hero.",
      effect: (st, pi, target) => { if (target && target.hp !== undefined) E().dealDamage(st, target, 2); else E().hitHero(st, 1 - pi, 2, "Sucker Punch → hero"); } },
    { id: "corner-cut",     name: "Corner Cut",     type: "spell", cost: 1, needsTarget: true, text: "Deal 1 to a minion. Draw a card.",
      effect: (st, pi, target) => { if (target && target.hp !== undefined) { E().dealDamage(st, target, 1); E().drawCard(st, st.players[pi]); } } },
    { id: "blood-money",    name: "Blood Money",    type: "spell", cost: 1, text: "Sacrifice your last minion; gain its cost as mana this turn.",
      effect: (st, pi) => { const p = st.players[pi]; const m = p.board.pop(); if (m) { p.discard.push(m.card); p.tempMana += m.card.cost; } } },
    { id: "second-wind",    name: "Second Wind",    type: "spell", cost: 2, needsTarget: true, targetSide: "self", text: "Restore 4 HP to a friendly minion.",
      effect: (st, pi, target) => { const t = target && target.owner === pi ? target : st.players[pi].board[0]; if (t) { t.hp = Math.min(t.maxHp, t.hp + 4); } } },
    { id: "roar-of-crowd",  name: "Roar of the Crowd", type: "spell", cost: 2, text: "Your minions get +1 ATK.",
      effect: (st, pi) => { for (const m of st.players[pi].board) m.atk += 1; } },
    { id: "shank",          name: "Shank",          type: "spell", cost: 2, needsTarget: true, text: "Deal 3 to a minion.",
      effect: (st, pi, target) => { if (target && target.hp !== undefined) E().dealDamage(st, target, 3); } },
    { id: "rigged-bout",    name: "Rigged Bout",    type: "spell", cost: 3, text: "Draw 2 cards.",
      effect: (st, pi) => { E().drawCard(st, st.players[pi]); E().drawCard(st, st.players[pi]); } },
    { id: "sweep-leg",      name: "Sweep the Leg",  type: "spell", cost: 3, text: "Deal 2 to all enemy minions.",
      effect: (st, pi) => { const opp = st.players[1 - pi]; for (const m of opp.board.slice()) E().dealDamage(st, m, 2); } },
    { id: "last-breath",    name: "Last Breath",    type: "spell", cost: 4, needsTarget: true, text: "Destroy a minion.",
      effect: (st, pi, target) => { if (target && target.hp !== undefined) target.hp = 0; } },
    { id: "crowd-surge",    name: "Crowd Surge",    type: "spell", cost: 4, text: "Your minions get +2/+1.",
      effect: (st, pi) => { const p = st.players[pi]; for (const m of p.board) { m.atk += 2; m.hp += 1; m.maxHp += 1; } } },
    { id: "ring-out",       name: "Ring Out",       type: "spell", cost: 5, text: "Destroy a minion, or deal 5 to the enemy hero.",
      effect: (st, pi, target) => { if (target && target.hp !== undefined) target.hp = 0; else E().hitHero(st, 1 - pi, 5, "Ring Out → hero"); } },

    // ---- Clash spells (defense window only) ----
    { id: "throw-sand",     name: "Throw Sand",     type: "spell", cost: 1, clashOnly: true, text: "Clash: attacker gets −2 ATK.",
      effect: (st, pi, ctx) => { if (ctx && ctx.attacker) ctx.attacker.atk = Math.max(0, ctx.attacker.atk - 2); } },
    { id: "cage-door",      name: "Cage Door",      type: "spell", cost: 2, clashOnly: true, text: "Clash: defending minion gets +3 HP.",
      effect: (st, pi, ctx) => { if (ctx && ctx.defender && ctx.defender.hp !== undefined) { ctx.defender.hp += 3; ctx.defender.maxHp += 3; } } },
    { id: "spoilers",       name: "Spoilers",       type: "spell", cost: 2, clashOnly: true, text: "Clash: deal 3 to the attacker.",
      effect: (st, pi, ctx) => { if (ctx && ctx.attacker) E().dealDamage(st, ctx.attacker, 3); } },
    { id: "feint",          name: "Feint",          type: "spell", cost: 3, clashOnly: true, text: "Clash: negate the attack.",
      effect: (st, pi, ctx) => { if (ctx) ctx.negate = true; } },
    // ---- R2 additions ----
    { id: "pit-fighter",    name: "Pit Fighter",    type: "minion", cost: 4, atk: 4, hp: 4, keywords: [], text: "Warcry: deal 1 to all enemy minions.",
      warcry: (st, pi) => { for (const m of st.players[1 - pi].board.slice()) E().dealDamage(st, m, 1); } },
    { id: "crowd-shield",   name: "Crowd Shield",   type: "minion", cost: 1, atk: 0, hp: 4, keywords: ["Guard"], text: "Guard" },
    { id: "pit-guard",      name: "Pit Guard",      type: "minion", cost: 2, atk: 1, hp: 4, keywords: ["Guard"], text: "Guard" },
    { id: "crowd-hush",     name: "Crowd Hush",     type: "spell", cost: 2, text: "Enemy minions get -1 ATK.",
      effect: (st, pi) => { for (const m of st.players[1 - pi].board) m.atk = Math.max(0, m.atk - 1); } },
  ];

  const HEROES = [
    { id: "vex", name: "Vex the Pitwright", powerName: "Pit Snipe (deal 1 to a minion)",
      power: (st, pi, target) => { const t = target && target.hp !== undefined ? target : st.players[1 - pi].board[0]; if (t) E().dealDamage(st, t, 1); },
      surge: "standard" },
    { id: "thorn", name: "Mother Thorn", powerName: "Thick Hide (+0/+1 to a friendly minion)",
      power: (st, pi, target) => { const t = target && target.owner === pi ? target : st.players[pi].board[0]; if (t) { t.hp += 1; t.maxHp += 1; } },
      surge: "standard" },
    { id: "odds", name: "The Oddsmaker", powerName: "Shave the Odds (-3 ATK to strongest enemy minion)",
      power: (st, pi) => {
        const opp = st.players[1 - pi];
        const t = opp.board.reduce((a, b) => (b.atk > (a ? a.atk : -1) ? b : a), null);
        if (t) t.atk = Math.max(0, t.atk - 3);
      },
      surge: "odds" },
  ];

  const byId = {};
  for (const c of POOL) byId[c.id] = c;

  // v2 stock decks — 25 cards, max 3 copies, legal by construction
  function stockDeck(ids) {
    const d = [];
    for (const id of ids) d.push(byId[id]);
    return d;
  }

  const DECKS = {
    bruiser: stockDeck([
      "pit-rat", "pit-rat", "scrap-pup", "scrap-pup",
      "chain-dog", "chain-dog", "banner-crier", "hook-fighter", "hook-fighter",
      "crowd-favorite", "crowd-favorite", "glass-lancer", "glass-lancer",
      "pit-fighter", "pit-fighter", "pit-fighter", "arena-champion", "the-main-event",
      "sucker-punch", "sucker-punch", "sweep-leg", "sweep-leg",
      "last-breath", "last-breath", "throw-sand",
    ]),
    bulwark: stockDeck([
      "pit-rat", "pit-rat", "scrap-pup", "scrap-pup", "odds-seller", "odds-seller",
      "brick-keeper", "brick-keeper", "rust-shaman", "rust-shaman",
      "pit-medic", "pit-medic", "stubborn-mule", "pit-guard",
      "wall-of-teeth", "wall-of-teeth", "grave-announcer", "grave-announcer",
      "chain-dog", "chain-dog", "bell-ringer",
      "corner-cut", "corner-cut", "sucker-punch", "blood-money",
    ]),
    trickster: stockDeck([
      "crowd-shield", "crowd-shield", "scrap-pup", "scrap-pup",
      "chain-dog", "chain-dog", "chain-dog", "hook-fighter", "hook-fighter",
      "crowd-favorite", "glass-lancer", "glass-lancer", "spark-twins",
      "corner-brute", "arena-champion", "pit-fighter", "rigged-bout", "rigged-bout",
      "sucker-punch", "sucker-punch", "throw-sand", "throw-sand",
      "cage-door", "spoilers", "crowd-hush",
    ]),
  };

  CB.cards = { POOL, byId, DECKS, stockDeck };
  CB.heroes = { list: HEROES, byId: Object.fromEntries(HEROES.map((h) => [h.id, h])) };
})(typeof window !== "undefined" ? window : globalThis);
