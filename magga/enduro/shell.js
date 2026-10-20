/*
 * Enduro — shared page shell: input (keyboard, touch, gamepad), the fixed
 * 60 Hz loop, pause/mute, and the per-version best record. Each version hands
 * in a renderer and an audio driver; the simulation is EnduroCore.
 *
 * Keys: arrows steer / accelerate (up) / brake (down). Space, Z, X or Ctrl is
 * the joystick's red button. Enter is the game reset switch. P or Esc pauses,
 * M mutes.
 */
(function (global) {
  'use strict';

  var Core = global.EnduroCore;
  var STEP = 1 / Core.C.SIM_HZ;

  var KEYMAP = {
    ArrowLeft: 'left', KeyA: 'left',
    ArrowRight: 'right', KeyD: 'right',
    ArrowUp: 'accel', KeyW: 'accel', Space: 'accel', KeyZ: 'accel', KeyX: 'accel',
    ControlLeft: 'accel', ControlRight: 'accel',
    ArrowDown: 'brake', KeyS: 'brake'
  };

  function boot(opts) {
    var game = new Core.Game(opts.seed);
    var held = {};
    var touch = { left: false, right: false, accel: false, brake: false };
    var pad = { left: false, right: false, accel: false, brake: false, start: false };
    var startQueued = false;
    var paused = false;
    var muted = false;
    var overAt = 0;
    var bestKey = 'enduro.' + opts.version + '.best';
    var best = loadBest();
    var ui = { state: '', paused: null, muted: null };

    try { muted = localStorage.getItem('enduro.muted') === '1'; } catch (e) { /* storage blocked */ }
    if (opts.audio) opts.audio.setMuted(muted);

    function loadBest() {
      try {
        var raw = JSON.parse(localStorage.getItem(bestKey) || 'null');
        if (raw && typeof raw.day === 'number' && typeof raw.odo === 'number') return raw;
      } catch (e) { /* ignore */ }
      return { day: 0, odo: 0 };
    }

    function saveBest(day, odo) {
      if (day > best.day || (day === best.day && odo > best.odo)) {
        best = { day: day, odo: odo };
        try { localStorage.setItem(bestKey, JSON.stringify(best)); } catch (e) { /* ignore */ }
      }
    }

    function unlockAudio() {
      if (opts.audio && opts.audio.unlock) opts.audio.unlock();
    }

    function setPaused(p) {
      if (game.state !== 'race') p = false;
      paused = p;
      if (opts.audio && opts.audio.setPaused) opts.audio.setPaused(p);
      syncUi();
    }

    function toggleMute() {
      muted = !muted;
      if (opts.audio) opts.audio.setMuted(muted);
      try { localStorage.setItem('enduro.muted', muted ? '1' : '0'); } catch (e) { /* ignore */ }
      syncUi();
    }

    function requestStart() {
      if (game.state === 'over' && performance.now() - overAt < 900) return;
      startQueued = true;
    }

    global.addEventListener('keydown', function (e) {
      unlockAudio();
      var action = KEYMAP[e.code];
      if (action) {
        e.preventDefault();
        if (!held[e.code] && (action === 'accel') && game.state !== 'race') requestStart();
        held[e.code] = true;
        if (paused && action !== 'accel') setPaused(false);
        return;
      }
      if (e.code === 'Enter' || e.code === 'NumpadEnter') {
        e.preventDefault();
        if (paused) setPaused(false);
        else if (game.state !== 'race') requestStart();
        else if (e.shiftKey) { game.reset(); startQueued = false; syncUi(); }
      } else if (e.code === 'KeyP' || e.code === 'Escape') {
        e.preventDefault();
        setPaused(!paused);
      } else if (e.code === 'KeyM') {
        toggleMute();
      }
    }, { passive: false });

    global.addEventListener('keyup', function (e) {
      if (KEYMAP[e.code]) { held[e.code] = false; e.preventDefault(); }
    });

    global.addEventListener('blur', function () {
      held = {};
      if (game.state === 'race') setPaused(true);
    });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden && game.state === 'race') setPaused(true);
    });

    // iOS and Android only unlock audio on pointerup/touchend/click, not on pointerdown.
    ['pointerup', 'touchend', 'click'].forEach(function (type) {
      document.addEventListener(type, unlockAudio, true);
    });

    // Touch pads (shown on coarse pointers by the page CSS). Each finger is tracked
    // by position, so it can hold gas with one thumb and slide ◀ ↔ ▶ with the other.
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
        touch.left = touch.right = touch.accel = touch.brake = false;
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
        if (name === 'accel' && game.state !== 'race') requestStart();
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
      ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (type) {
        root.addEventListener(type, lift);
      });
      global.addEventListener('pointerup', lift);
      global.addEventListener('pointercancel', lift);
      global.addEventListener('blur', function () { fingers = {}; refresh(); });
      root.addEventListener('contextmenu', function (e) { e.preventDefault(); });
      root.addEventListener('touchstart', function (e) { e.preventDefault(); }, { passive: false });
    }
    var buzz = !!(navigator.vibrate && global.matchMedia && global.matchMedia('(pointer: coarse)').matches);
    if (opts.canvas) {
      opts.canvas.addEventListener('pointerdown', function () {
        unlockAudio();
        if (game.state !== 'race') requestStart();
        else if (paused) setPaused(false);
      });
    }
    if (opts.muteButton) opts.muteButton.addEventListener('click', function () { unlockAudio(); toggleMute(); });
    if (opts.pauseButton) opts.pauseButton.addEventListener('click', function () { setPaused(!paused); });

    var padStartPrev = false;
    function pollPad() {
      pad.left = pad.right = pad.accel = pad.brake = false;
      var pads = navigator.getGamepads ? navigator.getGamepads() : [];
      for (var i = 0; i < pads.length; i++) {
        var gp = pads[i];
        if (!gp) continue;
        var ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
        var b = function (n) { return !!(gp.buttons[n] && gp.buttons[n].pressed); };
        pad.left = pad.left || ax < -0.4 || b(14);
        pad.right = pad.right || ax > 0.4 || b(15);
        pad.accel = pad.accel || b(0) || b(7) || ay < -0.5 || b(12);
        pad.brake = pad.brake || ay > 0.5 || b(13) || b(6);
        var st = b(9);
        if (st && !padStartPrev) {
          if (game.state === 'race') setPaused(!paused); else requestStart();
        }
        padStartPrev = st;
        if (pad.accel && game.state !== 'race') requestStart();
      }
    }

    function readInput() {
      var inp = { left: false, right: false, accel: false, brake: false, start: false };
      for (var code in held) {
        if (held[code]) inp[KEYMAP[code]] = true;
      }
      inp.left = inp.left || touch.left || pad.left;
      inp.right = inp.right || touch.right || pad.right;
      inp.accel = inp.accel || touch.accel || pad.accel;
      inp.brake = inp.brake || touch.brake || pad.brake;
      if (game.state === 'over') inp.accel = false;
      inp.start = startQueued;
      startQueued = false;
      return inp;
    }

    function syncUi() {
      var key = game.state + '|' + paused + '|' + muted;
      if (key === ui.key) return;
      ui.key = key;
      if (opts.onUi) opts.onUi({ state: game.state, paused: paused, muted: muted, best: best, game: game });
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
              if (ev.type === 'gameover') { overAt = performance.now(); saveBest(ev.data.day, ev.data.odo); }
              if (ev.type === 'newday') saveBest(ev.data.day, Math.floor(game.odo));
              if (ev.type === 'crash' && buzz) { try { navigator.vibrate(70); } catch (err) { /* ignore */ } }
            }
            if (opts.audio) opts.audio.onEvents(events, game);
            if (opts.onEvents) opts.onEvents(events, game);
          }
          acc -= STEP;
          steps++;
        }
        if (steps >= 6) acc = 0;
      }
      if (opts.audio) opts.audio.update(game, paused);
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
      best: function () { return best; }
    };
    global.__enduro = api;
    return api;
  }

  global.EnduroShell = { boot: boot };
})(window);
