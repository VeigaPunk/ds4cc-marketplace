/*
 * Frostbite — shared page shell: input (keyboard, touch, gamepad), the fixed
 * 60 Hz loop, pause/mute, game select and the per-version best score. Each
 * version hands in a renderer and an audio driver; the simulation is
 * FrostbiteCore.
 *
 * Keys: arrows (or WASD) move and jump. Space, Z, X or Ctrl is the joystick's
 * red button (reverse the floe). Enter is the game reset switch, G or 1-4 the
 * game select switch. P or Esc pauses, M mutes.
 */
(function (global) {
  'use strict';

  var Core = global.FrostbiteCore;
  var STEP = 1 / Core.C.SIM_HZ;

  var KEYMAP = {
    ArrowLeft: 'left', KeyA: 'left',
    ArrowRight: 'right', KeyD: 'right',
    ArrowUp: 'up', KeyW: 'up',
    ArrowDown: 'down', KeyS: 'down',
    Space: 'fire', KeyZ: 'fire', KeyX: 'fire', ControlLeft: 'fire', ControlRight: 'fire'
  };
  var MODES = {
    1: 'GAME 1 · REGULAR · 1 PLAYER',
    2: 'GAME 2 · REGULAR · 2 PLAYERS',
    3: 'GAME 3 · ADVANCED · 1 PLAYER',
    4: 'GAME 4 · ADVANCED · 2 PLAYERS'
  };

  function boot(opts) {
    var game = new Core.Game(opts.seed || ((Date.now() & 0xffffff) ^ 0x51ce));
    var held = {};
    var touch = { left: false, right: false, up: false, down: false, fire: false };
    var pad = { left: false, right: false, up: false, down: false, fire: false };
    var startQueued = false;
    var selectQueued = 0;
    var paused = false;
    var muted = false;
    var overAt = 0;
    var bestKey = 'frostbite.' + opts.version + '.best';
    var best = loadBest();
    var ui = { key: '' };

    try { muted = localStorage.getItem('frostbite.muted') === '1'; } catch (e) { /* storage blocked */ }
    try {
      var m = parseInt(localStorage.getItem('frostbite.mode'), 10);
      if (m >= 1 && m <= 4) game.selectMode(m);
    } catch (e) { /* ignore */ }
    if (opts.audio) opts.audio.setMuted(muted);

    function loadBest() {
      try {
        var raw = JSON.parse(localStorage.getItem(bestKey) || 'null');
        if (raw && typeof raw.score === 'number' && typeof raw.level === 'number') return raw;
      } catch (e) { /* ignore */ }
      return { score: 0, level: 0 };
    }

    function saveBest(score, level) {
      if (score > best.score) {
        best = { score: score, level: level };
        try { localStorage.setItem(bestKey, JSON.stringify(best)); } catch (e) { /* ignore */ }
      }
    }

    function unlockAudio() {
      if (opts.audio && opts.audio.unlock) opts.audio.unlock();
    }

    function playing() { return game.state !== 'title' && game.state !== 'over'; }

    function setPaused(p) {
      if (!playing()) p = false;
      paused = p;
      if (opts.audio && opts.audio.setPaused) opts.audio.setPaused(p);
      syncUi();
    }

    function toggleMute() {
      muted = !muted;
      if (opts.audio) opts.audio.setMuted(muted);
      try { localStorage.setItem('frostbite.muted', muted ? '1' : '0'); } catch (e) { /* ignore */ }
      syncUi();
    }

    function requestStart() {
      if (game.state === 'over' && performance.now() - overAt < 900) return;
      startQueued = true;
    }

    function requestSelect(n) {
      if (playing()) return;
      selectQueued = n || true;
    }

    global.addEventListener('keydown', function (e) {
      if (e.metaKey || e.altKey) return;
      unlockAudio();
      var action = KEYMAP[e.code];
      if (action) {
        e.preventDefault();
        if (!held[e.code] && !playing()) requestStart();
        held[e.code] = true;
        if (paused) setPaused(false);
        return;
      }
      if (e.code === 'Enter' || e.code === 'NumpadEnter') {
        e.preventDefault();
        if (paused) setPaused(false);
        else if (!playing()) requestStart();
        else if (e.shiftKey) { game.reset(); startQueued = false; syncUi(); }
      } else if (e.code === 'KeyP' || e.code === 'Escape') {
        e.preventDefault();
        setPaused(!paused);
      } else if (e.code === 'KeyM') {
        toggleMute();
      } else if (e.code === 'KeyG' || e.code === 'Tab') {
        if (!playing()) { e.preventDefault(); requestSelect(0); }
      } else if (/^(Digit|Numpad)[1-4]$/.test(e.code)) {
        requestSelect(parseInt(e.code.slice(-1), 10));
      }
    }, { passive: false });

    global.addEventListener('keyup', function (e) {
      if (KEYMAP[e.code]) { held[e.code] = false; e.preventDefault(); }
    });

    global.addEventListener('blur', function () {
      held = {};
      if (playing()) setPaused(true);
    });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden && playing()) setPaused(true);
    });

    // iOS and Android only unlock audio on pointerup/touchend/click, not on pointerdown.
    ['pointerup', 'touchend', 'click', 'keyup'].forEach(function (type) {
      document.addEventListener(type, unlockAudio, true);
    });

    // Touch pads (shown on coarse pointers by the page CSS). Each finger is
    // tracked by position, so one thumb can hold ◀ ▶ while the other jumps.
    if (opts.touchRoot) {
      var root = opts.touchRoot;
      var fingers = {};
      var padEls = root.querySelectorAll('[data-pad]');
      var padAt = function (x, y) {
        var el = document.elementFromPoint(x, y);
        el = el && el.closest ? el.closest('[data-pad]') : null;
        return el && root.contains(el) ? el.getAttribute('data-pad') : null;
      };
      var refresh = function () {
        touch.left = touch.right = touch.up = touch.down = touch.fire = false;
        for (var id in fingers) if (fingers[id]) touch[fingers[id]] = true;
        Array.prototype.forEach.call(padEls, function (el) {
          el.classList.toggle('on', !!touch[el.getAttribute('data-pad')]);
        });
      };
      root.addEventListener('pointerdown', function (e) {
        var name = padAt(e.clientX, e.clientY);
        if (!name) return;
        e.preventDefault();
        if (e.target.releasePointerCapture && e.target.hasPointerCapture && e.target.hasPointerCapture(e.pointerId)) {
          e.target.releasePointerCapture(e.pointerId);
        }
        if (!playing()) requestStart();
        if (paused) setPaused(false);
        fingers[e.pointerId] = name;
        refresh();
      });
      root.addEventListener('pointermove', function (e) {
        if (!(e.pointerId in fingers)) return;
        var name = padAt(e.clientX, e.clientY);
        if (name !== fingers[e.pointerId]) { fingers[e.pointerId] = name; refresh(); }
      });
      var lift = function (e) {
        if (!(e.pointerId in fingers)) return;
        delete fingers[e.pointerId];
        refresh();
      };
      ['pointerup', 'pointercancel'].forEach(function (type) {
        root.addEventListener(type, lift);
        global.addEventListener(type, lift);
      });
      global.addEventListener('blur', function () { fingers = {}; refresh(); });
      root.addEventListener('contextmenu', function (e) { e.preventDefault(); });
      root.addEventListener('touchstart', function (e) { e.preventDefault(); }, { passive: false });
    }

    // Swipes on the picture itself: up / down jump, a tap starts or resumes.
    if (opts.canvas) {
      var swipe = null;
      var pulse = { up: 0, down: 0 };
      boot.pulse = pulse;
      opts.canvas.addEventListener('pointerdown', function (e) {
        unlockAudio();
        swipe = { id: e.pointerId, x: e.clientX, y: e.clientY, done: false };
        if (!playing()) requestStart();
        else if (paused) setPaused(false);
      });
      opts.canvas.addEventListener('pointermove', function (e) {
        if (!swipe || swipe.id !== e.pointerId || swipe.done) return;
        var dy = e.clientY - swipe.y, dx = e.clientX - swipe.x;
        if (Math.abs(dy) > 24 && Math.abs(dy) > Math.abs(dx)) {
          pulse[dy < 0 ? 'up' : 'down'] = 8;
          swipe.done = true;
        }
      });
      ['pointerup', 'pointercancel'].forEach(function (type) {
        opts.canvas.addEventListener(type, function () { swipe = null; });
      });
      opts.canvas.addEventListener('touchstart', function (e) { e.preventDefault(); }, { passive: false });
    }
    var buzz = !!(navigator.vibrate && global.matchMedia && global.matchMedia('(pointer: coarse)').matches);
    if (opts.muteButton) opts.muteButton.addEventListener('click', function () { unlockAudio(); toggleMute(); });
    if (opts.pauseButton) opts.pauseButton.addEventListener('click', function () { setPaused(!paused); });
    if (opts.selectButton) opts.selectButton.addEventListener('click', function () { unlockAudio(); requestSelect(0); });

    var padPrev = { start: false, select: false };
    function pollPad() {
      pad.left = pad.right = pad.up = pad.down = pad.fire = false;
      var pads = navigator.getGamepads ? navigator.getGamepads() : [];
      for (var i = 0; i < pads.length; i++) {
        var gp = pads[i];
        if (!gp) continue;
        var ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
        var b = function (n) { return !!(gp.buttons[n] && gp.buttons[n].pressed); };
        pad.left = pad.left || ax < -0.4 || b(14);
        pad.right = pad.right || ax > 0.4 || b(15);
        pad.up = pad.up || ay < -0.5 || b(12);
        pad.down = pad.down || ay > 0.5 || b(13);
        pad.fire = pad.fire || b(0) || b(1) || b(2) || b(3);
        var st = b(9), se = b(8);
        if (st && !padPrev.start) {
          if (playing()) setPaused(!paused); else requestStart();
        }
        if (se && !padPrev.select) requestSelect(0);
        padPrev.start = st;
        padPrev.select = se;
        if ((pad.fire || pad.up || pad.down) && !playing()) requestStart();
      }
    }

    function readInput() {
      var inp = { left: false, right: false, up: false, down: false, fire: false, start: false, select: 0 };
      for (var code in held) {
        if (held[code]) inp[KEYMAP[code]] = true;
      }
      var p = boot.pulse;
      inp.left = inp.left || touch.left || pad.left;
      inp.right = inp.right || touch.right || pad.right;
      inp.up = inp.up || touch.up || pad.up || (p && p.up > 0);
      inp.down = inp.down || touch.down || pad.down || (p && p.down > 0);
      inp.fire = inp.fire || touch.fire || pad.fire;
      if (p) { if (p.up > 0) p.up--; if (p.down > 0) p.down--; }
      inp.start = startQueued;
      inp.select = selectQueued;
      startQueued = false;
      selectQueued = 0;
      return inp;
    }

    function syncUi() {
      var p = game.player();
      var key = game.state + '|' + paused + '|' + muted + '|' + game.mode + '|' + game.cur + '|' + p.level;
      if (key === ui.key) return;
      ui.key = key;
      if (opts.selectButton) {
        opts.selectButton.textContent = 'GAME ' + game.mode;
        opts.selectButton.disabled = playing();
      }
      if (opts.onUi) opts.onUi({ state: game.state, paused: paused, muted: muted, best: best, game: game, modeLabel: MODES[game.mode] });
    }

    var acc = 0, last = performance.now();
    function frame(now) {
      var dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      pollPad();
      if (!paused) {
        acc += dt;
        var steps = 0;
        while (acc >= STEP && steps < 6) {
          var inp = readInput();
          var events = game.update(STEP, inp);
          if (events.length) {
            for (var i = 0; i < events.length; i++) {
              var ev = events[i];
              if (ev.type === 'gameover') { overAt = performance.now(); saveBest(ev.data.score, ev.data.level); }
              if (ev.type === 'select') { try { localStorage.setItem('frostbite.mode', String(game.mode)); } catch (err) { /* ignore */ } }
              if ((ev.type === 'drown' || ev.type === 'bear' || ev.type === 'freeze') && buzz) {
                try { navigator.vibrate(ev.type === 'freeze' ? [40, 60, 40] : 80); } catch (err) { /* ignore */ }
              }
            }
            if (opts.audio) opts.audio.onEvents(events, game);
            if (opts.onEvents) opts.onEvents(events, game);
          }
          acc -= STEP;
          steps++;
        }
        if (steps >= 6) acc = 0;
      }
      if (opts.audio && opts.audio.update) opts.audio.update(game, paused);
      opts.render(game, { paused: paused, dt: dt, now: now });
      syncUi();
      global.requestAnimationFrame(frame);
    }

    syncUi();
    global.requestAnimationFrame(frame);

    var api = {
      game: game,
      isPaused: function () { return paused; },
      setPaused: setPaused,
      toggleMute: toggleMute,
      best: function () { return best; },
      modeLabel: function () { return MODES[game.mode]; },
      select: function (n) { unlockAudio(); requestSelect(n); },
      start: function () { unlockAudio(); requestStart(); },
      refresh: function () { ui.key = ''; syncUi(); }
    };
    global.__frostbite = api;
    return api;
  }

  global.FrostbiteShell = { boot: boot, MODES: MODES };
})(window);
