/* Clashbound browser client. All actions resolve through the same engine as the simulation. */
(function () {
  const CB = window.CB, E = CB.engine;
  const $ = id => document.getElementById(id);
  const heroes = { bruiser: 'vex', bulwark: 'thorn', trickster: 'odds' };
  let st, attacking = null, targeting = null, pendingClash = null, mullSel = new Set();
  let deckA = 'bruiser', deckB = 'bulwark', aiBusy = false, gameSeq = 0, logLen = 0;
  let muted = false, audio;
  function sound(freq = 390) {
    if (muted) return;
    try { audio ||= new AudioContext(); void audio.resume(); const o = audio.createOscillator(), g = audio.createGain(); o.type = 'triangle'; o.frequency.setValueAtTime(freq, audio.currentTime); o.frequency.exponentialRampToValueAtTime(freq * .7, audio.currentTime + .12); g.gain.setValueAtTime(.09, audio.currentTime); g.gain.exponentialRampToValueAtTime(.001, audio.currentTime + .15); o.connect(g).connect(audio.destination); o.start(); o.stop(audio.currentTime + .16); } catch (_) { /* Audio is optional. */ }
  }
  const text = (tag, str, cls = '') => { const el = document.createElement(tag); el.textContent = str; el.className = cls; return el; };
  const contestAtk = p => p.board.reduce((sum, m) => sum + (E.GUARD_NO_CONTEST && m.card.keywords.includes('Guard') ? 0 : m.atk), 0);
  function cardArt(c) { const image = document.createElement('img'); image.src = `art/${c.id}.svg`; image.alt = ''; image.className = 'card-art'; return image; }
  function canTarget(m) { return targeting && (targeting.side === 'any' || (targeting.side === 'self') === (m.owner === 0)); }
  function commitTarget(target) {
    if (!targeting || aiBusy) return;
    const t = targeting; targeting = null;
    if (t.power) E.heroPower(st, 0, target); else E.playCard(st, 0, t.index, target === 'hero' ? null : target);
    sound(); render();
  }
  CB.hooks.humanSeat = 0;
  CB.hooks.humanClash = function (game, defPi, attacker, defender) {
    const p = game.players[defPi], cards = [];
    p.hand.forEach((c, i) => { if (c.clashOnly && E.totalMana(p) >= c.cost && (c.id !== 'cage-door' || defender !== 'hero')) cards.push({ handIdx: i, card: c }); });
    if (!cards.length) return null;
    pendingClash = { attacker, defender, cards }; render(); return CB.hooks.PENDING;
  };
  function finishAI() {
    if (st.winner === null) CB.ai.takeTurn(st, 1);
    if (st.pendingAttack) { render(); return; }
    if (st.winner === null) { E.endTurn(st); E.startTurn(st); }
    aiBusy = false; render();
  }
  function resolveClash(handIdx) {
    if (!pendingClash) return;
    const p = st.players[0]; let ctx = null;
    if (handIdx !== null) {
      const c = p.hand[handIdx];
      if (c && c.clashOnly && E.totalMana(p) >= c.cost) {
        p.hand.splice(handIdx, 1); E.pay(p, c.cost);
        ctx = { attacker: pendingClash.attacker, defender: pendingClash.defender, negate: false };
        E.say(st, `CLASH: P1 plays ${c.name}`, 0); c.effect(st, 0, ctx); p.discard.push(c); sound(590);
      }
    }
    pendingClash = null; E.resolveAttack(st, ctx); finishAI();
  }
  function showDeckSelect() {
    gameSeq++; aiBusy = false; pendingClash = null; attacking = null; targeting = null;
    $('deckselect').hidden = false; $('app').hidden = true;
  }
  function newGame() {
    const others = Object.keys(CB.cards.DECKS).filter(d => d !== deckA);
    deckB = others[Math.random() * others.length | 0];
    st = E.newGame(CB.cards.DECKS[deckA], CB.cards.DECKS[deckB], CB.heroes.byId[heroes[deckA]], CB.heroes.byId[heroes[deckB]], Math.random() * 1e9 | 0);
    attacking = null; targeting = null; pendingClash = null; logLen = 0; aiBusy = false; gameSeq++; mullSel = new Set();
    $('log').replaceChildren(); $('deckselect').hidden = true; $('app').hidden = false;
    CB.ai.mulligan(st, 1); sound(520); render();
  }
  function minionEl(m, mine) {
    const el = document.createElement('button'); el.type = 'button';
    el.className = 'minion' + (m.card.keywords.includes('Guard') ? ' guard' : '') + (m.sick ? ' sick' : '') + (m.attacked ? ' exhausted' : '');
    el.dataset.uid = m.uid; el.append(cardArt(m.card), text('span', m.card.name, 'name'), text('span', m.card.keywords.join(' · ') || (m.sick ? 'Summoning' : m.attacked ? 'Exhausted' : 'Ready'), 'kw'), text('span', `${m.atk} / ${m.hp}`, 'stats'));
    el.title = `${m.card.name} · ${m.atk} attack / ${m.hp} health. ${m.card.text || ''}`;
    if (m.card.keywords.includes('Ward') && !m.wardUsed) el.classList.add('ward');
    let enabled = false;
    if (targeting && canTarget(m)) { enabled = true; el.classList.add('targetable'); el.onclick = () => commitTarget(m); }
    else if (!targeting && mine && !m.sick && !m.attacked && st.winner === null && !aiBusy && !pendingClash && st.phase === 'main') {
      enabled = true; el.classList.add('canatk'); el.onclick = () => { attacking = attacking === m ? null : m; sound(320); render(); };
    } else if (attacking && !mine && E.legalTargets(st, 0, attacking).includes(m)) {
      enabled = true; el.classList.add('targetable'); el.onclick = () => { E.attack(st, 0, attacking.uid, m); attacking = null; sound(180); render(); };
    }
    el.disabled = !enabled; if (attacking === m) el.classList.add('selected'); return el;
  }
  function heroBar(el, p, mine, deck) {
    el.replaceChildren();
    const img = document.createElement('img'); img.src = `art/hero-${p.hero.id}.svg`; img.alt = ''; img.className = 'heroart'; el.append(img);
    const info = document.createElement('div'); info.className = 'hero-info'; info.append(text('strong', p.hero.name), text('span', `${mine ? 'YOU' : 'RIVAL'} · ${deck.toUpperCase()} · ${p.deck.length} cards left`, 'hero-meta')); el.append(info);
    const health = text('span', `♥ ${Math.max(0, p.hp)}`, 'hp'); health.setAttribute('aria-label', `${p.hp} health`); el.append(health);
    if (mine) el.append(text('span', `◈ ${E.totalMana(p)} mana${p.tempMana ? ' + surge' : ''}`, 'mana')); else el.append(text('span', `${p.hand.length} in hand`, 'hero-meta'));
    el.append(text('span', `${contestAtk(p)} contest ATK`, 'contest-atk'));
  }
  function render() {
    const me = st.players[0], opp = st.players[1], mull = st.phase === 'mulligan', over = st.winner !== null;
    if (over) { attacking = null; targeting = null; }
    heroBar($('oppbar'), opp, false, deckB); heroBar($('mybar'), me, true, deckA);
    $('cp').replaceChildren(text('span', 'YOU', 'cplabel'), text('b', `${me.cp}`, 'my-cp'), text('span', '/ 8', 'cpgoal'), text('span', '—', 'cpgoal'), text('b', `${opp.cp}`), text('span', '/ 8', 'cpgoal'), text('span', 'RIVAL', 'cplabel'));
    $('turn').textContent = over ? st.winner === 0 ? 'VICTORY' : 'DEFEAT' : mull ? 'OPENING HAND' : pendingClash ? 'CLASH WINDOW' : aiBusy ? 'RIVAL’S TURN' : `YOUR TURN ${st.turn}`;
    const instruction = over ? `${st.winner === 0 ? 'You claimed' : 'Your rival claimed'} the arena by ${st.winReason}. Choose New game to play again.` : targeting ? `Choose ${targeting.side === 'self' ? 'a friendly' : targeting.side === 'any' ? 'a' : 'an enemy'} minion${targeting.hero ? ' or the rival hero' : ''} for ${targeting.name}.` : attacking ? `Choose a highlighted target for ${attacking.card.name}.` : mull ? 'Select cards to redraw, then confirm your opening hand.' : pendingClash ? 'Spend your remaining mana to defend, or decline.' : aiBusy ? 'Your rival is planning their move…' : 'Play a card, attack with a ready minion, or use your hero power. The stronger board scores at each turn end.';
    $('instruction').textContent = instruction; $('cancel').hidden = !targeting && !attacking;
    for (const [id, p, mine] of [['oppboard', opp, false], ['myboard', me, true]]) {
      const board = $(id); board.replaceChildren();
      for (let i = 0; i < E.BOARD_CAP; i++) { const slot = document.createElement('div'); slot.className = 'slot'; if (p.board[i]) slot.append(minionEl(p.board[i], mine)); else slot.append(text('span', '◇', 'empty-slot')); board.append(slot); }
    }
    const heroTarget = (attacking && E.legalTargets(st, 0, attacking).includes('hero')) || targeting?.hero;
    $('oppbar').classList.toggle('targetable', !!heroTarget); $('oppbar').tabIndex = heroTarget ? 0 : -1;
    $('oppbar').setAttribute('role', heroTarget ? 'button' : 'group');
    $('oppbar').onclick = heroTarget ? () => { if (targeting) commitTarget('hero'); else { E.attack(st, 0, attacking.uid, 'hero'); attacking = null; sound(180); render(); } } : null;
    $('oppbar').onkeydown = e => { if (heroTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); $('oppbar').click(); } };
    const hand = $('hand'); hand.replaceChildren();
    me.hand.forEach((c, i) => {
      const el = document.createElement('button'); el.type = 'button'; el.dataset.index = i;
      const affordable = E.canPlay(st, 0, c), enabled = mull || (affordable && !aiBusy && !pendingClash && !over);
      el.className = 'card' + (enabled ? '' : ' unaffordable') + (mull && mullSel.has(i) ? ' mullsel' : '') + (targeting?.index === i ? ' selected' : ''); el.disabled = !enabled;
      el.append(cardArt(c), text('span', c.cost, 'cost'), text('span', c.name, 'name'), text('span', c.type === 'minion' ? `${c.atk} ATK · ${c.hp} HP` : c.clashOnly ? 'CLASH · DEFENSE ONLY' : 'SPELL', 'card-type'), text('span', c.text || 'An arena fighter. Ready to attack next turn.', 'txt'));
      if (mull) { el.setAttribute('aria-pressed', String(mullSel.has(i))); el.onclick = () => { if (mullSel.has(i)) mullSel.delete(i); else mullSel.add(i); render(); }; }
      else if (enabled) el.onclick = () => {
        attacking = null;
        if (c.needsTarget || ['sucker-punch', 'ring-out'].includes(c.id)) { targeting = { index: i, name: c.name, side: c.targetSide === 'self' ? 'self' : 'enemy', hero: !c.needsTarget }; render(); }
        else { targeting = null; E.playCard(st, 0, i, null); sound(); render(); }
      };
      hand.append(el);
    });
    $('mulliganbar').hidden = !mull;
    $('mullinfo').textContent = `${mullSel.size} card${mullSel.size === 1 ? '' : 's'} selected for redraw`;
    $('mullconfirm').textContent = mullSel.size ? `Redraw ${mullSel.size}` : 'Keep hand';
    $('clashprompt').hidden = !pendingClash;
    if (pendingClash) {
      const { attacker, defender, cards } = pendingClash;
      $('clashinfo').textContent = `${attacker.card.name} (${attacker.atk} ATK) attacks ${defender === 'hero' ? 'your hero' : defender.card.name}.`;
      $('clashcards').replaceChildren();
      for (const { handIdx, card } of cards) { const b = document.createElement('button'); b.append(text('strong', `${card.name} · ${card.cost} mana`), text('small', card.text)); b.onclick = () => resolveClash(handIdx); $('clashcards').append(b); }
    }
    const hasPowerTarget = me.hero.id === 'thorn' ? me.board.length : opp.board.length;
    $('power').disabled = me.powerUsed || E.totalMana(me) < 2 || over || aiBusy || !!pendingClash || mull || !hasPowerTarget;
    $('power').textContent = `${me.hero.powerName.split('(')[0].trim()} · 2`; $('power').title = me.hero.powerName;
    $('endturn').disabled = over || aiBusy || !!pendingClash || mull;
    $('result').hidden = !over; $('result').textContent = over ? `${st.winner === 0 ? 'The arena is yours.' : 'A worthy rival. A new chance awaits.'} ${st.winReason === 'contest' ? 'Eight contest points claimed.' : st.winReason === 'lethal' ? 'A hero has fallen.' : 'The final card has been drawn.'}` : '';
    const fresh = st.log.slice(logLen); for (const line of fresh) $('log').append(text('div', line));
    if (fresh.length) { logLen = st.log.length; $('log').scrollTop = $('log').scrollHeight; }
  }
  $('endturn').onclick = () => {
    if (aiBusy || pendingClash || st.phase !== 'main' || st.winner !== null) return;
    attacking = null; targeting = null; E.endTurn(st); sound(260);
    if (st.winner !== null) { render(); return; }
    aiBusy = true; render(); const seq = gameSeq;
    setTimeout(() => { if (seq !== gameSeq) return; E.startTurn(st); finishAI(); }, 400);
  };
  $('power').onclick = () => {
    const p = st.players[0]; attacking = null;
    if (p.hero.id === 'odds') { E.heroPower(st, 0); sound(560); render(); }
    else { targeting = { power: true, name: p.hero.powerName.split('(')[0].trim(), side: p.hero.id === 'thorn' ? 'self' : 'any', hero: false }; render(); }
  };
  $('decline').onclick = () => resolveClash(null);
  $('mullconfirm').onclick = () => { if (st.phase !== 'mulligan') return; E.mulligan(st, 0, [...mullSel]); mullSel = new Set(); E.startTurn(st); render(); };
  $('newgame').onclick = showDeckSelect;
  $('cancel').onclick = () => { attacking = null; targeting = null; render(); };
  $('sound').onclick = () => { muted = !muted; $('sound').textContent = muted ? 'Sound off' : 'Sound on'; $('sound').setAttribute('aria-pressed', String(muted)); if (!muted) sound(); };
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !aiBusy) { attacking = null; targeting = null; if (st && !$('app').hidden) render(); } });
  document.querySelectorAll('[data-deck]').forEach(b => { b.onclick = () => { deckA = b.dataset.deck; newGame(); }; });
  if (new URLSearchParams(location.search).has('debug')) Object.defineProperty(window, '__clashbound', { value: { get state() { return st; }, get aiBusy() { return aiBusy; }, get pendingClash() { return pendingClash; } } });
  showDeckSelect();
})();
