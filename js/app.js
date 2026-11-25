/* Ouhmitalie — le jeu. Aucune dépendance, aucun build : tout tourne dans le navigateur. */
(function () {
  'use strict';
  var OUH = window.OUH, esc = OUH.esc;
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var now = function () { return Date.now(); };
  var rid = function (n) { var s = ''; while (s.length < n) s += Math.random().toString(36).slice(2); return s.slice(0, n); };
  var LS = {
    get: function (k, d) { try { var v = localStorage.getItem('ouh.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem('ouh.' + k, JSON.stringify(v)); } catch (e) { } }
  };

  var THEMES = [
    { id: 'antique', name: 'Rome antique', emoji: '🏛️', col: '#F2B45C' },
    { id: 'rome', name: 'Rome', emoji: '🛵', col: '#FF9A57' },
    { id: 'vatican', name: 'Vatican', emoji: '🗝️', col: '#FFD35C' },
    { id: 'florence', name: 'Florence', emoji: '⚜️', col: '#FF9CC2' },
    { id: 'venise', name: 'Venise', emoji: '🎭', col: '#5FD0DD' },
    { id: 'genies', name: 'Génies', emoji: '🎨', col: '#B9A2FF' },
    { id: 'moderne', name: 'Italie moderne', emoji: '🇮🇹', col: '#7FD98B' },
    { id: 'economie', name: 'Éco & chiffres', emoji: '📈', col: '#9CC4FF' },
    { id: 'dolcevita', name: 'Dolce vita', emoji: '🍕', col: '#FF8B80' }
  ].filter(function (t) { return OUH.Q.some(function (q) { return q.t === t.id; }); });
  var THEME = {}; THEMES.forEach(function (t) { THEME[t.id] = t; });
  var DIFF = ['', 'Facile', 'Moyen', 'Difficile'], STARS = ['', '★☆☆', '★★☆', '★★★'];
  var BUILTIN = { ali: 'Ali', simo: 'Simo', mona: 'Mona' }, ORDER = ['ali', 'simo', 'mona'];
  var EMOJIS = ['🦊', '🐼', '🦁', '🐸', '🐵', '🦄', '🐯', '🐨', '🐙', '🦉', '🤠', '😎'];
  var REVEAL_MAX = 45000, ONLINE_MS = 12000, DEAD_MS = 30 * 60000;

  var qp = new URLSearchParams(location.search);
  var room = ((location.hash.match(/salon=([A-Za-z0-9]{3,12})/) || [])[1] || qp.get('salon') || 'OUHMI').toUpperCase();
  var dev = LS.get('dev'); if (!dev) { dev = rid(10); LS.set('dev', dev); }
  var customs = LS.get('customs', []);
  var prefs = LS.get('prefs', { sound: true, cos: {} }); prefs.cos = prefs.cos || {};
  var my = null, players = {}, photos = {}, off = {}, g = LS.get('g.' + room, null), gAcc = 0;
  var net = null, netUp = 0;
  var ui = { screen: 'home', rev: {}, adv: null, sheet: null, cfg: LS.get('cfg', null), gain: null, lastTick: -1 };

  /* ---------- petits utilitaires ---------- */
  function fmt(n) { return Math.round(n).toLocaleString('fr-FR').replace(/ | /g, ' '); }
  function lire(n) { return fmt(n) + ' ₤'; }
  function hash(str) { var h = 2166136261; for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) { var a = hash(seed); return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function shuffle(arr, rnd) { rnd = rnd || Math.random; var a = arr.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function stats(pid) { var s = LS.get('st.' + pid); if (!s || !s.q) s = { xp: 0, games: 0, wins: 0, best: 0, q: {}, done: [] }; return s; }
  function custom(pid) { for (var i = 0; i < customs.length; i++) if (customs[i].pid === pid) return customs[i]; return null; }
  function stateOf(pid) { return my && pid === my.pid ? my : (players[pid] ? players[pid].s : null); }
  function online(pid) { if (my && pid === my.pid) return true; var p = players[pid]; return !!p && !p.s.bye && now() - p.seen < ONLINE_MS; }
  function nameOf(pid) {
    if (BUILTIN[pid]) return BUILTIN[pid];
    var s = stateOf(pid); if (s && s.name) return String(s.name).slice(0, 14);
    var c = custom(pid); return c ? c.name : 'Invité';
  }
  function headOf(pid) {
    if (BUILTIN[pid]) return { img: 'assets/heads/' + pid + '.jpg' };
    var c = custom(pid);
    if (c && c.photo) return { img: c.photo };
    if (photos[pid]) return { img: photos[pid] };
    var s = stateOf(pid), em = (c && c.emoji) || (s && s.em);
    return em ? { emoji: String(em).slice(0, 4) } : { letter: nameOf(pid).charAt(0).toUpperCase() };
  }
  function cosOf(pid) { var s = stateOf(pid); return (s && s.cos) || 'touriste'; }
  function bob(pid, o) { o = o || {}; if (!o.cos) o.cos = cosOf(pid); return OUH.bobHTML(pid, headOf(pid), o); }
  function mini(pid, cls) { return OUH.bobHTML(pid, headOf(pid), { mini: true, cls: cls || '' }); }
  function sortPids(list) {
    return list.slice().sort(function (a, b) {
      var ia = ORDER.indexOf(a), ib = ORDER.indexOf(b);
      if (ia >= 0 || ib >= 0) return (ia < 0 ? 9 : ia) - (ib < 0 ? 9 : ib);
      return nameOf(a) < nameOf(b) ? -1 : 1;
    });
  }

  /* ---------- sons ---------- */
  var AC = null;
  function tone(f, d, type, v, delay) {
    if (!prefs.sound) return;
    try {
      AC = AC || new (window.AudioContext || window.webkitAudioContext)();
      if (AC.state === 'suspended') AC.resume();
      var o = AC.createOscillator(), gn = AC.createGain(), t = AC.currentTime + (delay || 0);
      o.type = type || 'sine'; o.frequency.value = f;
      gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(v || 0.15, t + 0.015); gn.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(gn); gn.connect(AC.destination); o.start(t); o.stop(t + d + 0.03);
    } catch (e) { }
  }
  var SFX = {
    tap: function () { tone(520, 0.08, 'triangle', 0.12); },
    ok: function () { [523, 659, 784, 1047].forEach(function (f, i) { tone(f, 0.18, 'triangle', 0.16, i * 0.09); }); },
    bad: function () { tone(196, 0.25, 'sawtooth', 0.08); tone(147, 0.35, 'sawtooth', 0.08, 0.12); },
    tick: function () { tone(880, 0.05, 'square', 0.04); },
    go: function () { tone(392, 0.1, 'triangle', 0.12); tone(784, 0.2, 'triangle', 0.14, 0.1); },
    win: function () { [523, 659, 784, 1047, 784, 1047, 1319].forEach(function (f, i) { tone(f, 0.22, 'triangle', 0.16, i * 0.12); }); }
  };
  function buzz(p) { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) { } }

  /* ---------- réseau ---------- */
  function pushMe() {
    if (!my) return;
    my.ts = now(); my.gs = g ? [g.gid, g.seq] : null;
    LS.set('my.' + my.pid, my);
    if (net) net.publish('p', my.pid, my);
  }
  function pushPhoto(only) {
    var c = my && custom(my.pid);
    if (c && c.photo && net) net.publish('a', my.pid, { v: c.photo }, only);
  }
  function onMessage(kind, id, m, retained) {
    var t = now();
    if (kind === 'g') { if (acceptGame(m)) tick(); return; }
    if (kind === 'a') { if (id && typeof m.v === 'string' && m.v.indexOf('data:image/') === 0 && m.v.length < 80000) photos[id] = m.v; return; }
    if (kind !== 'p' || !id || m.pid !== id || typeof m.ts !== 'number') return;
    if (my && id === my.pid) {
      // même personnage ouvert sur un autre téléphone : le dernier arrivé garde la place
      if (m.dev !== dev && !retained && !m.bye && m.jt > my.jt) { toast('« ' + my.name + ' » vient d\'être choisi sur un autre téléphone.'); leave(true); }
      return;
    }
    if (!retained) off[id] = Math.min(off[id] == null ? Infinity : off[id], t - m.ts);
    var cur = players[id], seen = retained ? Math.min(t, m.ts + (off[id] || 0)) : t;
    if (cur && cur.s.ts >= m.ts) { if (!retained) cur.seen = t; return; }
    players[id] = { s: m, seen: seen };
    // un joueur est en retard sur l'état de la partie : on le lui renvoie
    if (g && my && m.gs && m.gs[0] === g.gid && m.gs[1] < g.seq && t - gAcc > 3000 && t - (ui.lastHeal || 0) > 3000 && !retained) { ui.lastHeal = t; net.publish('g', null, g); }
  }

  /* ---------- état de la partie ---------- */
  function gameTime(m) { return m.at + (my && m.by === my.pid ? 0 : (off[m.by] || 0)); }
  function acceptGame(m) {
    if (!m || typeof m.gid !== 'string' || !Array.isArray(m.qs) || !m.cfg || !Array.isArray(m.roster)) return false;
    if (!m.qs.every(function (id) { return OUH.byId[id]; })) return false;
    if (g) {
      if (m.gid === g.gid) { if (!(m.seq > g.seq || (m.seq === g.seq && m.by < g.by))) return false; }
      else if (!(m.born > g.born)) return false;
    }
    g = m; gAcc = now(); LS.set('g.' + room, g);
    adopt();
    return true;
  }
  function adopt() { // je suis dans la liste de départ d'une partie vivante → j'y participe
    if (!my || !g || g.st !== 'play' || my.gid === g.gid) return;
    if (g.roster.indexOf(my.pid) < 0 || now() - gameTime(g) > DEAD_MS) return;
    my.gid = g.gid; my.ans = []; my.rdy = -1; my.rec = null; pushMe();
  }
  function gamePids() { // tous ceux qui ont joué cette partie, triés par score
    var set = {}; g.roster.forEach(function (p) { if (stateOf(p)) set[p] = 1; });
    Object.keys(players).forEach(function (p) { if (players[p].s.gid === g.gid) set[p] = 1; });
    if (my && my.gid === g.gid) set[my.pid] = 1;
    return Object.keys(set);
  }
  function activePids() { return gamePids().filter(function (p) { var s = stateOf(p); return online(p) && (s.gid === g.gid || g.roster.indexOf(p) >= 0); }); }
  function ansOf(pid, qi) { var s = stateOf(pid); return s && s.gid === g.gid && s.ans ? (s.ans[qi] || null) : null; }
  function afk(p) { // deux questions de suite sans répondre : on n'attend plus ce joueur (il revient dès qu'il répond)
    if ((my && p === my.pid) || g.qi < 2) return false;
    var a = ansOf(p, g.qi - 1), b = ansOf(p, g.qi - 2), c = ansOf(p, g.qi);
    return !(c && c.c >= 0) && !!a && a.c === -1 && !!b && b.c === -1;
  }
  function allAnswered() { return activePids().every(function (p) { return ansOf(p, g.qi) || afk(p); }); }
  function notReady() { // ceux qu'on attend avant la question suivante
    var since = now() - (ui.rev[g.gid + ':' + g.seq] || now());
    return activePids().filter(function (p) {
      var s = stateOf(p), a = ansOf(p, g.qi);
      if (s.gid === g.gid && s.rdy >= g.qi) return false;
      if (afk(p)) return false;
      return (a && a.c >= 0) || since < 10000; // pas de réponse : 10 s pour lire, puis on n'attend plus
    });
  }
  function info() {
    if (!g) return { ph: 'none' };
    var t = now(), at = gameTime(g), dur = g.cfg.dur * 1000;
    if (g.st === 'end') return { ph: 'end' };
    if (t - at > DEAD_MS) return { ph: 'none' };
    if (!my || my.gid !== g.gid) {
      var alive = gamePids().some(function (p) { return (!my || p !== my.pid) && online(p); });
      return { ph: alive ? 'other' : 'none' };
    }
    if (t < at) return { ph: 'count', left: at - t };
    if (ui.rev[g.gid + ':' + g.seq] || allAnswered() || t >= at + dur + 700) return { ph: 'reveal' };
    if (my.ans[g.qi]) return { ph: 'wait', left: Math.max(0, at + dur - t) };
    return { ph: 'ask', left: Math.max(0, at + dur - t) };
  }
  function order(qi) { return shuffle([0, 1, 2, 3], rng(g.gid + ':' + qi)); }
  function hidden(qi) { return shuffle([1, 2, 3], rng(g.gid + ':' + qi + ':' + my.pid)).slice(0, 2); }
  function jokerUsed(k) { return (my.ans || []).some(function (a) { return a && a.j && a.j.indexOf(k) >= 0; }); }

  function scoreOf(pid, upto) {
    var s = stateOf(pid), res = { total: 0, per: [], best: 0, ok: 0, time: 0 };
    if (!s || s.gid !== g.gid) return res;
    var streak = 0, dur = g.cfg.dur * 1000;
    for (var i = 0; i <= upto && i < g.qs.length; i++) {
      var a = s.ans && s.ans[i], q = OUH.byId[g.qs[i]], p = { pts: 0, ok: false, c: a ? a.c : null };
      if (a && a.c === 0) {
        streak++;
        p.ok = true; p.base = 100 * q.d; p.speed = Math.round(p.base * 0.5 * Math.max(0, 1 - a.t / dur));
        p.streak = Math.min(100, 25 * (streak - 1)); p.x2 = !!(a.j && a.j.indexOf('x') >= 0);
        p.pts = (p.base + p.speed + p.streak) * (p.x2 ? 2 : 1);
        res.ok++; res.time += a.t;
      } else streak = 0;
      res.best = Math.max(res.best, streak); res.total += p.pts; res.per.push(p);
    }
    return res;
  }
  function ranking(upto) {
    return gamePids().map(function (p) { return { pid: p, sc: scoreOf(p, upto) }; })
      .sort(function (a, b) { return b.sc.total - a.sc.total || (a.pid < b.pid ? -1 : 1); });
  }

  /* ---------- choix des questions ---------- */
  function pickFrom(list, k, seen, used) { // les moins vues d'abord, en variant les thèmes sur toute la partie
    var by = {}, out = [];
    list.forEach(function (q) { (by[q.t] = by[q.t] || []).push(q); });
    Object.keys(by).forEach(function (t) { by[t] = shuffle(by[t]).sort(function (a, b) { return seen(a.id) - seen(b.id); }); });
    while (out.length < k) {
      var ts = shuffle(Object.keys(by).filter(function (t) { return by[t].length; })).sort(function (a, b) { return (used[a] || 0) - (used[b] || 0); });
      if (!ts.length) break;
      var q = by[ts[0]].shift(); used[q.t] = (used[q.t] || 0) + 1; out.push(q);
    }
    return out;
  }
  function pickQuestions(cfg) {
    var st = stats(my.pid), seen = function (id) { return (st.q[id] || [0])[0]; };
    if (cfg.mode === 'revise') return shuffle(missed()).slice(0, cfg.n);
    var pool = OUH.Q.filter(function (q) { return cfg.themes.indexOf(q.t) >= 0; }), n = cfg.n, plan;
    if (cfg.diff === 'prog') { var hard = Math.max(1, Math.round(n * 0.3)), mid = Math.round(n * 0.3); plan = [n - mid - hard, mid, hard]; }
    else if (cfg.diff === 'mix') { plan = [Math.ceil(n / 3), Math.ceil(n / 3), n - 2 * Math.ceil(n / 3)]; }
    else { plan = [0, 0, 0]; plan[cfg.diff - 1] = n; }
    var out = [], used = {}, usedT = {};
    plan.forEach(function (k, i) {
      var got = pickFrom(pool.filter(function (q) { return q.d === i + 1; }), k, seen, usedT);
      got.forEach(function (q) { used[q.id] = 1; }); out.push(got);
    });
    var all = [].concat(out[0], out[1], out[2]);
    if (all.length < n) all = all.concat(pickFrom(pool.filter(function (q) { return !used[q.id]; }), n - all.length, seen, usedT));
    if (cfg.diff === 'mix') all = shuffle(all); else all.sort(function (a, b) { return a.d - b.d; });
    return all.map(function (q) { return q.id; });
  }
  function missed() { var st = stats(my.pid); return Object.keys(st.q).filter(function (id) { return OUH.byId[id] && st.q[id][2] === 0; }); }

  /* ---------- actions de jeu ---------- */
  function launch(cfg) {
    var I = info();
    if ((I.ph === 'other' || (I.ph !== 'none' && I.ph !== 'end')) && !confirm('Une partie est déjà en cours. En lancer une nouvelle pour tout le monde ?')) return;
    var qs = pickQuestions(cfg);
    if (qs.length < 3) { toast('Pas assez de questions avec ces réglages.'); return; }
    var t = now(), roster = [my.pid].concat(Object.keys(players).filter(online));
    var m = { gid: rid(8), seq: 1, by: my.pid, ts: t, born: t, st: 'play', cfg: { mode: cfg.mode, themes: cfg.themes, diff: cfg.diff, n: qs.length, dur: cfg.dur }, qs: qs, roster: roster, qi: 0, at: t + 5000 };
    g = null; acceptGame(m); net.publish('g', null, m);
    closeSheet(); SFX.go(); tick();
  }
  function answer(c) {
    if (!g || !my || my.gid !== g.gid || g.st !== 'play' || my.ans[g.qi]) return;
    var k = g.gid + ':' + g.qi, dur = g.cfg.dur * 1000, t = Math.max(0, Math.min(dur, now() - gameTime(g)));
    var a = { c: c, t: c < 0 ? dur : t }, j = (ui.j5 === k ? '5' : '') + (ui.x2 === k ? 'x' : '');
    if (j) a.j = j;
    my.ans[g.qi] = a; pushMe();
  }
  function advance() {
    var t = now(), m = JSON.parse(JSON.stringify(g));
    m.seq++; m.by = my.pid; m.ts = t;
    if (g.qi + 1 >= g.qs.length) { m.st = 'end'; m.at = t; } else { m.qi = g.qi + 1; m.at = t + 3600; }
    if (acceptGame(m)) net.publish('g', null, m);
  }
  function stopGame() {
    if (!g || g.st !== 'play' || !confirm('Arrêter la partie pour tout le monde ?')) return;
    var t = now(), m = JSON.parse(JSON.stringify(g));
    m.seq++; m.by = my.pid; m.ts = t; m.st = 'end'; m.at = t; m.cut = 1;
    if (acceptGame(m)) net.publish('g', null, m);
    tick();
  }
  function driver() { // passe à la suite quand tout le monde est prêt (ou après un délai) — un seul téléphone publie
    var k = g.gid + ':' + g.seq, t = now();
    if (!ui.rev[k]) ui.rev[k] = t;
    var act = activePids();
    if (notReady().length && t - ui.rev[k] < REVEAL_MAX) { ui.adv = null; return; }
    if (!ui.adv || ui.adv.k !== k) {
      var ord = act.slice().sort(function (a, b) { return a === g.by ? -1 : b === g.by ? 1 : (a < b ? -1 : 1); });
      ui.adv = { k: k, t: t + Math.max(0, ord.indexOf(my.pid)) * 1500 };
    }
    if (t >= ui.adv.t) { ui.adv.t = Infinity; advance(); }
  }
  function onReveal() { // enregistre ma réponse dans mon passeport (une seule fois)
    var k = g.gid + ':' + g.qi;
    if (my.rec === k) return;
    var a = my.ans[g.qi], qid = g.qs[g.qi];
    my.rec = k;
    if (a && a.c !== -2) {
      var st = stats(my.pid), e = st.q[qid] || [0, 0, 0];
      e[0]++; if (a.c === 0) { e[1]++; e[2] = 1; } else e[2] = 0;
      st.q[qid] = e; LS.set('st.' + my.pid, st);
      if (a.c === 0) { SFX.ok(); buzz(40); } else { SFX.bad(); buzz([60, 60, 120]); }
    }
    LS.set('my.' + my.pid, my);
  }
  function credit() { // fin de partie : mes lires rejoignent mon passeport
    var st = stats(my.pid);
    if (st.done.indexOf(g.gid) >= 0) return;
    var rk = ranking(g.qi), sc = scoreOf(my.pid, g.qi), before = OUH.rankIndex(st.xp);
    st.xp += sc.total; st.games++; st.best = Math.max(st.best, sc.best);
    var won = rk.length > 1 && rk[0].pid === my.pid && sc.total > 0;
    if (won) st.wins++;
    st.done.push(g.gid); st.done = st.done.slice(-40);
    LS.set('st.' + my.pid, st);
    var after = OUH.rankIndex(st.xp);
    if (after > before) { my.cos = OUH.RANKS[after].id; prefs.cos[my.pid] = my.cos; LS.set('prefs', prefs); }
    ui.gain = { gid: g.gid, pts: sc.total, before: before, after: after };
    my.xp = st.xp; pushMe();
    if (ui.screen === 'play') { SFX.win(); if (rk[0].pid === my.pid) confetti(); }
  }

  /* ---------- entrée / sortie ---------- */
  function enter(pid) {
    var c = custom(pid), st = stats(pid), saved = LS.get('my.' + pid), rank = OUH.rankIndex(st.xp);
    var cos = prefs.cos[pid], ci = OUH.RANKS.map(function (r) { return r.id; }).indexOf(cos);
    if (ci < 0 || ci > rank) cos = OUH.RANKS[rank].id;
    my = { pid: pid, dev: dev, name: BUILTIN[pid] || c.name, cos: cos, xp: st.xp, jt: now(), ts: now(), gid: null, ans: [], rdy: -1, rec: null };
    if (c && c.emoji && !c.photo) my.em = c.emoji;
    if (saved && saved.gid && g && saved.gid === g.gid) { my.gid = saved.gid; my.ans = saved.ans || []; my.rdy = saved.rdy == null ? -1 : saved.rdy; my.rec = saved.rec || null; }
    delete players[pid];
    LS.set('me', pid);
    ui.screen = 'lobby';
    adopt(); pushMe(); pushPhoto(); wake(); tick();
  }
  function leave(silent) {
    if (my && net && !silent) { my.bye = 1; pushMe(); }
    my = null; LS.set('me', null); ui.screen = 'home'; closeSheet(); tick();
  }
  var lock = null;
  function wake() { try { if (navigator.wakeLock && document.visibilityState === 'visible') navigator.wakeLock.request('screen').then(function (l) { lock = l; }).catch(function () { }); } catch (e) { } }

  /* ---------- rendu ---------- */
  var app = $('#app'), cache = {}, layout = '';
  function paint(secs) { // secs : [[id, classe, html]] — on ne touche au DOM que si le contenu change
    var lay = secs.map(function (s) { return s[0] + '.' + s[1]; }).join('|');
    if (lay !== layout) {
      app.innerHTML = secs.map(function (s) { return '<section id="s-' + s[0] + '" class="' + s[1] + '"></section>'; }).join('');
      layout = lay; cache = {}; window.scrollTo(0, 0);
      app.classList.add('fresh'); clearTimeout(paint.t); paint.t = setTimeout(function () { app.classList.remove('fresh'); }, 700);
    }
    secs.forEach(function (s) { if (cache[s[0]] !== s[2]) { $('#s-' + s[0]).innerHTML = s[2]; cache[s[0]] = s[2]; } });
  }
  function netChip() { return '<span class="net ' + (netUp ? 'on' : 'offl') + '">' + (netUp ? '● En direct' : '○ Hors ligne') + '</span>'; }

  function viewHome() {
    var cards = ORDER.concat(customs.map(function (c) { return c.pid; })).map(function (pid) {
      var on = online(pid), st = stats(pid), r = OUH.RANKS[OUH.rankIndex(st.xp)];
      var cos = (players[pid] && on) ? cosOf(pid) : (prefs.cos[pid] || r.id);
      return '<button class="pick" data-act="enter" data-pid="' + pid + '">' + bob(pid, { cos: cos, cls: 'idle' }) +
        '<b>' + esc(nameOf(pid)) + '</b><small>' + r.emoji + ' ' + r.name + '</small>' + (on ? '<i class="live">en ligne</i>' : '') +
        (custom(pid) ? '<span class="del" data-act="del" data-pid="' + pid + '" title="Supprimer">✕</span>' : '') + '</button>';
    }).join('');
    return [
      ['hero', 'hero', '<img class="logo" src="assets/logo.svg" alt="Ouhmitalie"><p class="tagline">Qui veut gagner des millions… <b>de lires</b> ?</p>'],
      ['pick', 'panel', '<h2>Qui es-tu ?</h2><div class="pick-grid">' + cards + '<button class="pick add" data-act="add"><span class="plus">＋</span><b>Ajouter</b><small>un joueur</small></button></div>'],
      ['foot', 'foot', '<span>Salon <b>' + esc(room) + '</b></span>' + netChip() + '<button class="link" data-act="room">Changer de salon</button>']
    ];
  }

  function viewLobby(I) {
    var pids = sortPids([my.pid].concat(Object.keys(players).filter(online)));
    var st = stats(my.pid), ri = OUH.rankIndex(st.xp), r = OUH.RANKS[ri], nx = OUH.RANKS[ri + 1];
    var stage = pids.map(function (p, i) {
      var s = stateOf(p), rk = OUH.RANKS[OUH.rankIndex(s.xp)];
      return '<div class="actor" style="--i:' + i + '">' + bob(p, { cls: 'idle' }) + '<b>' + esc(nameOf(p)) + (p === my.pid ? ' <em>(toi)</em>' : '') + '</b><small>' + rk.emoji + ' ' + rk.name + '</small></div>';
    }).join('');
    var hint = pids.length === 1 ? '<p class="hint">Tu es seul·e dans le salon : envoie le lien aux autres, ou joue en solo.</p>' : '<p class="hint">' + pids.length + ' joueurs prêts. Celui qui lance la partie la lance pour tout le monde.</p>';
    var banner = I.ph === 'other' ? '<div class="banner"><span>🎬 Une partie est en cours (question ' + (g.qi + 1) + '/' + g.qs.length + ')</span><button class="btn small" data-act="join">Rejoindre</button></div>' : '';
    var pct = nx ? Math.round(100 * (st.xp - r.xp) / (nx.xp - r.xp)) : 100, nm = missed().length;
    return [
      ['top', 'top', '<img class="logo-s" src="assets/logo.svg" alt="Ouhmitalie"><span class="grow"></span>' + netChip() + '<button class="icon" data-act="sound" aria-label="Son">' + (prefs.sound ? '🔊' : '🔇') + '</button>'],
      ['stage', 'stage', '<div class="actors n' + Math.min(pids.length, 5) + '">' + stage + '</div>' + hint + banner],
      ['go', 'actions',
        '<button class="btn big primary" data-act="quick"><span>⚡ Partie rapide</span><small>10 questions · tous les thèmes · de plus en plus dur</small></button>' +
        '<div class="row"><button class="btn" data-act="custom"><span>🎛️ Sur mesure</span><small>thèmes, niveau, durée</small></button>' +
        '<button class="btn" data-act="revise"' + (nm < 3 ? ' disabled' : '') + '><span>🔁 Mes erreurs</span><small>' + (nm < 3 ? 'rien à réviser' : nm + ' à revoir') + '</small></button></div>'],
      ['me', 'panel mecard', '<button class="mecard-in" data-act="passport"><div class="rank"><span class="rank-e">' + r.emoji + '</span><div><b>' + r.name + '</b><small>' + lire(st.xp) + (nx ? ' · encore ' + lire(nx.xp - st.xp) + ' → ' + nx.name : ' · rang maximum !') + '</small></div><span class="chev">📔 Passeport ›</span></div><div class="bar"><i style="width:' + pct + '%"></i></div></button>'],
      ['foot', 'foot', '<button class="link" data-act="share">📲 Inviter (salon ' + esc(room) + ')</button><button class="link" data-act="logout">Changer de joueur</button>']
    ];
  }

  function stripHTML(I, shown) {
    var rk = ranking(shown), reveal = I.ph === 'reveal';
    return rk.map(function (r) {
      var a = ansOf(r.pid, g.qi), s = stateOf(r.pid), per = reveal ? r.sc.per[g.qi] : null, badge = '';
      if (I.ph === 'ask' || I.ph === 'wait') badge = a ? '<i class="bdg ok">✓</i>' : '<i class="bdg think">…</i>';
      else if (reveal) badge = (s.rdy >= g.qi) ? '<i class="bdg ok">👍</i>' : (per && per.ok ? '<i class="bdg ok">✓</i>' : '<i class="bdg ko">✗</i>');
      return '<div class="sp' + (r.pid === my.pid ? ' me' : '') + (online(r.pid) ? '' : ' away') + '"><span class="sp-h">' + mini(r.pid) + badge + '</span><b>' + esc(nameOf(r.pid)) + '</b><span class="sp-s">' + fmt(r.sc.total) + '</span>' +
        (per && per.pts ? '<span class="sp-d">+' + fmt(per.pts) + '</span>' : '') + '</div>';
    }).join('');
  }
  function dotsHTML(shown) {
    var mine = scoreOf(my.pid, shown).per, s = '';
    for (var i = 0; i < g.qs.length; i++) {
      var q = OUH.byId[g.qs[i]], cls = 'd' + q.d;
      if (i <= shown) cls += mine[i] && mine[i].ok ? ' ok' : ' ko'; else if (i === g.qi) cls += ' cur';
      s += '<i class="' + cls + '"></i>';
    }
    return s;
  }

  function viewPlay(I) {
    var qi = g.qi, q = OUH.byId[g.qs[qi]], th = THEME[q.t] || { name: q.t, emoji: '❓', col: '#ddd' }, n = g.qs.length;
    var shown = I.ph === 'reveal' ? qi : qi - 1, k = g.gid + ':' + qi, mine = my.ans[qi];
    var bar = ['qbar', 'qbar', '<button class="icon" data-act="stop" aria-label="Arrêter la partie">✕</button><div class="dots">' + dotsHTML(shown) + '</div><div class="myscore">' + lire(scoreOf(my.pid, shown).total) + '</div>'];
    var strip = ['strip', 'strip', stripHTML(I, shown)];
    if (I.ph === 'count') {
      return [bar, ['count', 'count',
        '<p class="count-q">' + (qi === 0 ? 'Prêts ? ' : '') + 'Question <b>' + (qi + 1) + '</b>/' + n + '</p>' +
        '<div class="count-card" style="--c:' + th.col + '"><span class="big-emo">' + th.emoji + '</span><b>' + th.name + '</b><span>' + STARS[q.d] + ' ' + DIFF[q.d] + ' · ' + lire(100 * q.d) + '</span></div>' +
        '<div class="count-n" id="cnt"></div>'], strip];
    }
    var reveal = I.ph === 'reveal', gone = ui.j5 === k ? hidden(qi) : [], LET = 'ABCD';
    var who = {};
    if (reveal) gamePids().forEach(function (p) { var a = ansOf(p, qi); if (a && a.c >= 0) (who[a.c] = who[a.c] || []).push(p); });
    var answers = order(qi).map(function (c, i) {
      var cls = 'ans a' + i;
      if (mine && mine.c === c) cls += ' sel';
      if (reveal) cls += c === 0 ? ' good' : (mine && mine.c === c ? ' bad' : ' dim');
      else if (gone.indexOf(c) >= 0) cls += ' gone';
      var lock = reveal || mine || gone.indexOf(c) >= 0;
      return '<button class="' + cls + '" data-act="ans" data-c="' + c + '"' + (lock ? ' disabled' : '') + '><span class="letter">' + LET[i] + '</span><span class="txt">' + esc(q.a[c]) + '</span>' +
        (who[c] ? '<span class="who">' + who[c].map(function (p) { return mini(p); }).join('') + '</span>' : '') + '</button>';
    }).join('');
    var meta = '<div class="meta"><span class="chip" style="background:' + th.col + '">' + th.emoji + ' ' + th.name + '</span><span class="chip ghost">' + STARS[q.d] + ' ' + lire(100 * q.d) + '</span><span class="chip ghost">' + (qi + 1) + '/' + n + '</span></div>';
    var under, next = '';
    if (reveal) {
      var per = scoreOf(my.pid, qi).per[qi] || { ok: false }, res;
      if (per.ok) res = '<div class="result good"><b>✓ Bravo ! +' + lire(per.pts) + '</b><small>' + per.base + (per.speed ? ' + ' + per.speed + ' rapidité' : '') + (per.streak ? ' + ' + per.streak + ' série 🔥' : '') + (per.x2 ? ' — le tout ×2 !' : '') + '</small></div>';
      else if (!mine || mine.c === -2) res = '<div class="result bad"><b>👀 Tu regardes cette question</b></div>';
      else res = '<div class="result bad"><b>' + (mine.c < 0 ? '⏰ Trop tard !' : '✗ Raté !') + '</b><small>La bonne réponse : ' + esc(q.a[0]) + '</small></div>';
      var rdy = my.rdy >= qi, waiting = notReady().map(nameOf);
      var auto = Math.max(0, Math.ceil((REVEAL_MAX - (now() - (ui.rev[g.gid + ':' + g.seq] || now()))) / 1000));
      under = res + '<div class="fact"><b>💡 Le savais-tu ?</b><p>' + esc(q.e) + '</p></div>';
      next = rdy ? '<p class="waitmsg">👍 On attend ' + esc(waiting.join(', ') || '…') + ' <small>(suite auto dans ' + auto + ' s)</small></p>'
        : '<button class="btn big primary" data-act="ready"><span>' + (qi + 1 >= n ? 'Voir le classement 🏆' : 'Question suivante ➜') + '</span></button>';
    } else if (mine) {
      under = '<p class="waitmsg">🔒 Réponse verrouillée — on attend les autres…</p>';
    } else {
      var u5 = jokerUsed('5') || ui.j5 === k, ux = jokerUsed('x');
      under = '<div class="jokers"><button class="joker' + (ui.j5 === k ? ' on' : '') + '" data-act="j5"' + (u5 ? ' disabled' : '') + '><b>50:50</b><small>enlève 2 erreurs</small></button>' +
        '<button class="joker' + (ui.x2 === k ? ' on' : '') + '" data-act="x2"' + (ux ? ' disabled' : '') + '><b>×2</b><small>' + (ui.x2 === k ? 'activé !' : 'double les points') + '</small></button></div>';
    }
    if (reveal) return [bar,
      ['q' + qi + 'r', 'play compact', '<div class="qcard">' + esc(q.q) + '</div>'],
      ['a' + qi + 'r', 'answers revealed', answers],
      ['u' + qi + 'r', 'under', under],
      ['n' + qi, 'next', next],
      strip];
    return [bar,
      ['q' + qi, 'play', meta + '<div class="timer" id="timer"><i></i><b></b></div><div class="qcard">' + esc(q.q) + '</div>'],
      ['a' + qi, 'answers', answers],
      ['u' + qi, 'under', under],
      strip];
  }

  function viewEnd() {
    var rk = ranking(g.qi), n = g.qs.length, top = rk.slice(0, 3), podium = '';
    [1, 0, 2].forEach(function (i) {
      var r = top[i]; if (!r) return;
      podium += '<div class="pod p' + (i + 1) + '">' + bob(r.pid, { cls: i === 0 ? 'jump' : 'idle' }) + '<b>' + esc(nameOf(r.pid)) + '</b><span class="pod-s">' + lire(r.sc.total) + '</span><div class="pod-b"><span>' + ['🥇', '🥈', '🥉'][i] + '</span><small>' + r.sc.ok + '/' + n + '</small></div></div>';
    });
    var rest = rk.slice(3).map(function (r, i) { return '<div class="restrow"><span>' + (i + 4) + '.</span>' + mini(r.pid) + '<b>' + esc(nameOf(r.pid)) + '</b><span>' + lire(r.sc.total) + '</span></div>'; }).join('');
    var awards = '';
    if (rk.length > 1) {
      var fast = rk.filter(function (r) { return r.sc.ok > 0; }).sort(function (a, b) { return a.sc.time / a.sc.ok - b.sc.time / b.sc.ok; })[0];
      var strk = rk.slice().sort(function (a, b) { return b.sc.best - a.sc.best; })[0];
      if (fast) awards += '<div class="award"><span>⚡</span><div><b>' + esc(nameOf(fast.pid)) + '</b><small>le plus rapide · ' + (fast.sc.time / fast.sc.ok / 1000).toFixed(1).replace('.', ',') + ' s en moyenne</small></div></div>';
      if (strk && strk.sc.best > 1) awards += '<div class="award"><span>🔥</span><div><b>' + esc(nameOf(strk.pid)) + '</b><small>meilleure série · ' + strk.sc.best + ' bonnes réponses d\'affilée</small></div></div>';
    }
    var gain = '';
    if (my.gid === g.gid) {
      var st = stats(my.pid), ri = OUH.rankIndex(st.xp), r = OUH.RANKS[ri], nx = OUH.RANKS[ri + 1], up = ui.gain && ui.gain.gid === g.gid && ui.gain.after > ui.gain.before;
      var pct = nx ? Math.round(100 * (st.xp - r.xp) / (nx.xp - r.xp)) : 100;
      gain = '<div class="panel gain' + (up ? ' up' : '') + '">' + (up ? '<p class="rankup">🎉 Nouveau rang : <b>' + r.emoji + ' ' + r.name + '</b> — nouveau costume débloqué !</p>' : '') +
        '<div class="rank"><span class="rank-e">' + r.emoji + '</span><div><b>+' + lire(scoreOf(my.pid, g.qi).total) + ' dans ton passeport</b><small>' + lire(st.xp) + (nx ? ' · encore ' + lire(nx.xp - st.xp) + ' → ' + nx.name : '') + '</small></div></div><div class="bar"><i style="width:' + pct + '%"></i></div></div>';
    }
    var mine = scoreOf(my.pid, g.qi).per;
    var review = g.qs.slice(0, g.cut ? g.qi + 1 : n).map(function (id, i) {
      var q = OUH.byId[id], p = mine[i], th = THEME[q.t] || { emoji: '' };
      return '<li class="' + (p && p.ok ? 'ok' : 'ko') + '"><p class="rq">' + (p && p.ok ? '✓' : '✗') + ' ' + th.emoji + ' ' + esc(q.q) + '</p><p class="ra">' + esc(q.a[0]) + '</p><p class="re">' + esc(q.e) + '</p></li>';
    }).join('');
    return [
      ['etop', 'top', '<img class="logo-s" src="assets/logo.svg" alt="Ouhmitalie"><span class="grow"></span>' + netChip()],
      ['pod', 'endpod', '<h1>' + (g.cut ? 'Partie arrêtée' : 'Classement final') + '</h1><div class="podium n' + top.length + '">' + podium + '</div>' + rest],
      ['aw', 'endinfo', awards + gain],
      ['again', 'actions', '<button class="btn big primary" data-act="again"><span>🔁 Rejouer</span><small>mêmes réglages, nouvelles questions</small></button><button class="btn" data-act="lobby"><span>Retour au salon</span></button>'],
      ['rev', 'panel', '<details class="review"><summary>📚 Revoir les questions et les explications</summary><ol>' + review + '</ol></details>']
    ];
  }

  function viewPassport() {
    var st = stats(my.pid), ri = OUH.rankIndex(st.xp), r = OUH.RANKS[ri], nx = OUH.RANKS[ri + 1];
    var pct = nx ? Math.round(100 * (st.xp - r.xp) / (nx.xp - r.xp)) : 100;
    var ward = OUH.RANKS.map(function (k, i) {
      var open = i <= ri;
      return '<button class="cos' + (open ? '' : ' locked') + (my.cos === k.id ? ' on' : '') + '" data-act="cos" data-cos="' + k.id + '"' + (open ? '' : ' disabled') + '>' + bob(my.pid, { cos: k.id }) + '<b>' + k.name + '</b><small>' + (open ? (my.cos === k.id ? 'porté' : 'débloqué') : '🔒 ' + lire(k.xp)) + '</small></button>';
    }).join('');
    var seenN = 0, okN = 0, tries = 0, rights = 0;
    Object.keys(st.q).forEach(function (id) { if (!OUH.byId[id]) return; seenN++; if (st.q[id][1] > 0) okN++; tries += st.q[id][0]; rights += st.q[id][1]; });
    var stamps = THEMES.map(function (t) {
      var list = OUH.Q.filter(function (q) { return q.t === t.id; }), known = list.filter(function (q) { return st.q[q.id] && st.q[q.id][1] > 0; }).length;
      var p = known / list.length, medal = p >= 0.8 ? '🥇' : p >= 0.5 ? '🥈' : p >= 0.2 ? '🥉' : '';
      return '<div class="stamp' + (medal ? ' got' : '') + '" style="--c:' + t.col + '"><span class="st-e">' + t.emoji + '</span><b>' + t.name + '</b><div class="bar"><i style="width:' + Math.round(p * 100) + '%"></i></div><small>' + known + '/' + list.length + ' ' + medal + '</small></div>';
    }).join('');
    return [
      ['ptop', 'top', '<button class="icon" data-act="lobby" aria-label="Retour">←</button><h1 class="ptitle">Passeport de ' + esc(my.name) + '</h1>'],
      ['prank', 'panel', '<div class="rank big">' + bob(my.pid, { cls: 'idle' }) + '<div><b>' + r.emoji + ' ' + r.name + '</b><small>' + lire(st.xp) + ' gagnées</small><small>' + (nx ? 'Encore ' + lire(nx.xp - st.xp) + ' pour devenir ' + nx.name : 'Rang maximum : ave !') + '</small></div></div><div class="bar"><i style="width:' + pct + '%"></i></div>'],
      ['pst', 'panel', '<h2>Tampons</h2><p class="hint">Une question réussie au moins une fois = une case de gagnée. 🥉 20 % · 🥈 50 % · 🥇 80 %</p><div class="stamps">' + stamps + '</div>'],
      ['pward', 'panel', '<h2>Garde-robe</h2><div class="wardrobe">' + ward + '</div>'],
      ['pnum', 'panel', '<h2>En chiffres</h2><div class="nums"><div><b>' + st.games + '</b><small>parties</small></div><div><b>' + st.wins + '</b><small>victoires</small></div><div><b>' + st.best + '</b><small>meilleure série</small></div><div><b>' + (tries ? Math.round(100 * rights / tries) : 0) + ' %</b><small>de réussite</small></div><div><b>' + okN + '/' + OUH.Q.length + '</b><small>questions maîtrisées</small></div></div>'],
      ['foot', 'foot', '<button class="link" data-act="logout">Changer de joueur</button>']
    ];
  }

  /* ---------- feuilles (réglages, ajout de joueur) ---------- */
  var sheetEl = $('#sheet');
  function closeSheet() { ui.sheet = null; sheetEl.className = ''; sheetEl.innerHTML = ''; }
  function openSheet(html) { sheetEl.innerHTML = '<div class="sheet-bg" data-act="close"></div><div class="sheet-in">' + html + '</div>'; sheetEl.className = 'open'; }
  function seg(name, opts, val) { return '<div class="seg">' + opts.map(function (o) { return '<button data-act="set" data-k="' + name + '" data-v="' + o[0] + '" class="' + (String(o[0]) === String(val) ? 'on' : '') + '">' + o[1] + '</button>'; }).join('') + '</div>'; }
  function sheetCustom() {
    var c = ui.cfg = ui.cfg || { themes: THEMES.map(function (t) { return t.id; }), diff: 'prog', n: 10, dur: 20 };
    c.themes = c.themes.filter(function (t) { return THEME[t]; });
    var count = OUH.Q.filter(function (q) { return c.themes.indexOf(q.t) >= 0 && (typeof c.diff !== 'number' || q.d === c.diff); }).length;
    openSheet('<h2>🎛️ Partie sur mesure</h2>' +
      '<label>Thèmes <button class="link" data-act="allthemes">' + (c.themes.length === THEMES.length ? 'aucun' : 'tous') + '</button></label><div class="chips">' +
      THEMES.map(function (t) { var on = c.themes.indexOf(t.id) >= 0; return '<button class="chip pickable' + (on ? ' on' : '') + '" style="--c:' + t.col + '" data-act="theme" data-t="' + t.id + '">' + t.emoji + ' ' + t.name + '</button>'; }).join('') + '</div>' +
      '<label>Niveau</label>' + seg('diff', [['prog', '📈 Progressif'], ['mix', '🎲 Mélangé'], [1, 'Facile'], [2, 'Moyen'], [3, 'Difficile']], c.diff) +
      '<label>Nombre de questions</label>' + seg('n', [[5, '5'], [10, '10'], [15, '15'], [20, '20']], c.n) +
      '<label>Temps par question</label>' + seg('dur', [[12, '12 s ⚡'], [20, '20 s'], [30, '30 s 🧘']], c.dur) +
      '<button class="btn big primary" data-act="golaunch"' + (count < 3 ? ' disabled' : '') + '><span>C\'est parti !</span><small>' + count + ' questions disponibles</small></button>');
  }
  function sheetAdd() {
    var a = ui.add = ui.add || { name: '', emoji: EMOJIS[0], photo: null };
    openSheet('<h2>＋ Nouveau joueur</h2><label>Prénom</label><input id="addname" maxlength="12" placeholder="Prénom" value="' + esc(a.name) + '" autocomplete="off">' +
      '<label>Sa tête</label><div class="addhead">' + OUH.bobHTML('nouveau', a.photo ? { img: a.photo } : { emoji: a.emoji }, { cos: 'touriste', cls: 'idle' }) +
      '<div><label class="btn small filebtn">📷 Prendre / choisir une photo<input type="file" id="addphoto" accept="image/*" hidden></label><p class="hint">Cadre bien le visage : la photo est recadrée en carré.</p></div></div>' +
      '<div class="emojis">' + EMOJIS.map(function (e) { return '<button data-act="emoji" data-e="' + e + '" class="' + (!a.photo && a.emoji === e ? 'on' : '') + '">' + e + '</button>'; }).join('') + '</div>' +
      '<button class="btn big primary" data-act="addok"><span>Entrer dans le jeu</span></button>');
  }
  function readPhoto(file, cb) {
    var img = new Image(), url = URL.createObjectURL(file);
    img.onload = function () {
      var s = Math.min(img.width, img.height), c = document.createElement('canvas'); c.width = c.height = 128;
      c.getContext('2d').drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, 128, 128);
      URL.revokeObjectURL(url); cb(c.toDataURL('image/jpeg', 0.72));
    };
    img.onerror = function () { cb(null); };
    img.src = url;
  }

  function toast(msg) {
    var t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; $('#toasts').appendChild(t);
    setTimeout(function () { t.classList.add('out'); setTimeout(function () { t.remove(); }, 400); }, 3200);
  }
  function confetti() {
    var fx = $('#fx'), bits = ['🍕', '🎉', '⭐', '🇮🇹', '🍝', '🏛️', '🎭'], h = '';
    for (var i = 0; i < 28; i++) h += '<span style="left:' + Math.random() * 100 + '%;animation-delay:' + (Math.random() * 1.2).toFixed(2) + 's;animation-duration:' + (2.2 + Math.random() * 1.8).toFixed(2) + 's;font-size:' + (18 + Math.random() * 20).toFixed(0) + 'px">' + bits[i % bits.length] + '</span>';
    fx.innerHTML = h; setTimeout(function () { fx.innerHTML = ''; }, 5000);
  }

  /* ---------- boucle ---------- */
  function tick() {
    if (!my) { paint(viewHome()); return; }
    var t = now();
    if (g && g.st === 'play' && my.gid === g.gid) {
      var at = gameTime(g);
      if (t >= at + g.cfg.dur * 1000 && !my.ans[g.qi] && t - at < DEAD_MS) answer(-1);
    }
    var I = info();
    if (I.ph === 'reveal') { onReveal(); driver(); I = info(); }
    if (I.ph === 'end' && my.gid === g.gid) credit();
    var playing = I.ph === 'count' || I.ph === 'ask' || I.ph === 'wait' || I.ph === 'reveal';
    if (playing) { if (ui.screen !== 'play') { ui.screen = 'play'; closeSheet(); } }
    else if (ui.screen === 'play') ui.screen = (I.ph === 'end' && my.gid === g.gid) ? 'end' : 'lobby';
    if (ui.screen === 'end' && I.ph !== 'end') ui.screen = 'lobby';
    if (document.body.dataset.screen !== ui.screen) { if (ui.screen !== 'end') $('#fx').innerHTML = ''; document.body.dataset.screen = ui.screen; }
    if (ui.screen === 'play') {
      paint(viewPlay(I));
      if (I.ph === 'count') {
        var n = Math.ceil(I.left / 1000), el = $('#cnt');
        if (el && el.textContent !== String(n)) { el.textContent = n; el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); if (n <= 3) SFX.tick(); }
      } else if (I.ph !== 'reveal') {
        var tm = $('#timer'), dur = g.cfg.dur * 1000, sec = Math.ceil(I.left / 1000);
        if (tm) {
          tm.firstChild.style.width = (100 * I.left / dur).toFixed(1) + '%'; tm.lastChild.textContent = sec;
          tm.classList.toggle('hot', sec <= 5);
          if (I.ph === 'ask' && sec <= 5 && sec > 0 && ui.lastTick !== sec) { ui.lastTick = sec; SFX.tick(); }
        }
      }
    }
    else if (ui.screen === 'end') paint(viewEnd());
    else if (ui.screen === 'passport') paint(viewPassport());
    else paint(viewLobby(I));
  }

  /* ---------- événements ---------- */
  document.addEventListener('click', function (ev) {
    var el = ev.target.closest('[data-act]'); if (!el || el.disabled) return;
    var act = el.dataset.act, k = g ? g.gid + ':' + g.qi : '';
    switch (act) {
      case 'enter':
        if (online(el.dataset.pid) && !confirm(nameOf(el.dataset.pid) + ' est déjà connecté sur un autre téléphone. Prendre sa place ?')) return;
        enter(el.dataset.pid); break;
      case 'del':
        ev.stopPropagation();
        if (confirm('Supprimer ' + nameOf(el.dataset.pid) + ' de ce téléphone ?')) { customs = customs.filter(function (c) { return c.pid !== el.dataset.pid; }); LS.set('customs', customs); tick(); }
        break;
      case 'add': ui.add = null; sheetAdd(); break;
      case 'emoji': ui.add.name = $('#addname').value; ui.add.emoji = el.dataset.e; ui.add.photo = null; sheetAdd(); break;
      case 'addok':
        var nm = $('#addname').value.trim().slice(0, 12);
        if (!nm) { toast('Il faut un prénom !'); return; }
        var c = { pid: 'x' + rid(7), name: nm };
        if (ui.add.photo) c.photo = ui.add.photo; else c.emoji = ui.add.emoji;
        customs.push(c); LS.set('customs', customs); closeSheet(); enter(c.pid); break;
      case 'close': closeSheet(); break;
      case 'room':
        var r = prompt('Code du salon (3 à 12 lettres ou chiffres). Tout le monde doit avoir le même :', room);
        if (r && /^[A-Za-z0-9]{3,12}$/.test(r.trim())) { location.hash = 'salon=' + r.trim().toUpperCase(); location.reload(); }
        else if (r) toast('Code invalide : 3 à 12 lettres ou chiffres.');
        break;
      case 'share':
        var url = location.origin + location.pathname + (room === 'OUHMI' ? '' : '#salon=' + room);
        if (navigator.share) navigator.share({ title: 'Ouhmitalie', text: 'Rejoins-moi sur Ouhmitalie !', url: url }).catch(function () { });
        else if (navigator.clipboard) navigator.clipboard.writeText(url).then(function () { toast('Lien copié !'); });
        else prompt('Lien à partager :', url);
        break;
      case 'sound': prefs.sound = !prefs.sound; LS.set('prefs', prefs); SFX.tap(); tick(); break;
      case 'logout': leave(); break;
      case 'passport': ui.screen = 'passport'; layout = ''; tick(); break;
      case 'lobby': ui.screen = 'lobby'; tick(); break;
      case 'cos': my.cos = el.dataset.cos; prefs.cos[my.pid] = my.cos; LS.set('prefs', prefs); pushMe(); SFX.tap(); tick(); break;
      case 'quick': launch({ mode: 'quick', themes: THEMES.map(function (t) { return t.id; }), diff: 'prog', n: 10, dur: 20 }); break;
      case 'custom': sheetCustom(); break;
      case 'revise': launch({ mode: 'revise', themes: [], diff: 'mix', n: 10, dur: 20 }); break;
      case 'theme':
        var i = ui.cfg.themes.indexOf(el.dataset.t); if (i >= 0) ui.cfg.themes.splice(i, 1); else ui.cfg.themes.push(el.dataset.t);
        sheetCustom(); break;
      case 'allthemes': ui.cfg.themes = ui.cfg.themes.length === THEMES.length ? [] : THEMES.map(function (t) { return t.id; }); sheetCustom(); break;
      case 'set': var v = el.dataset.v; ui.cfg[el.dataset.k] = /^\d+$/.test(v) ? +v : v; sheetCustom(); break;
      case 'golaunch': LS.set('cfg', ui.cfg); launch({ mode: 'custom', themes: ui.cfg.themes.slice(), diff: ui.cfg.diff, n: ui.cfg.n, dur: ui.cfg.dur }); break;
      case 'again': launch(g.cfg.mode === 'revise' && missed().length < 3 ? { mode: 'quick', themes: THEMES.map(function (t) { return t.id; }), diff: 'prog', n: 10, dur: 20 } : g.cfg); break;
      case 'join':
        if (g && g.st === 'play') { my.gid = g.gid; my.ans = []; my.rdy = -1; my.rec = null; if (now() >= gameTime(g)) my.ans[g.qi] = { c: -2, t: 0 }; pushMe(); tick(); }
        break;
      case 'stop': stopGame(); break;
      case 'ans': SFX.tap(); buzz(15); answer(+el.dataset.c); tick(); break;
      case 'j5': ui.j5 = k; SFX.go(); tick(); break;
      case 'x2': ui.x2 = ui.x2 === k ? null : k; SFX.go(); tick(); break;
      case 'ready': my.rdy = g.qi; pushMe(); SFX.tap(); tick(); break;
    }
  });
  document.addEventListener('change', function (ev) {
    if (ev.target.id !== 'addphoto' || !ev.target.files[0]) return;
    ui.add.name = $('#addname').value;
    readPhoto(ev.target.files[0], function (data) { if (data) { ui.add.photo = data; sheetAdd(); } else toast('Photo illisible, essaie une autre.'); });
  });
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') { wake(); pushMe(); tick(); } });
  window.addEventListener('pagehide', function () { if (my && net) { my.bye = 1; pushMe(); delete my.bye; } });

  /* ---------- démarrage ---------- */
  var brokers = qp.get('broker') ? qp.get('broker').split(',') : null;
  net = new OUH.Net({
    room: room, brokers: brokers || undefined, onMessage: onMessage,
    onStatus: function (n) { netUp = n; },
    onUp: function (i) { if (my) { net.publish('p', my.pid, my, i); pushPhoto(i); } }
  });
  net.start();
  var last = LS.get('me', null);
  if (last && (BUILTIN[last] || custom(last))) enter(last); else tick();
  setInterval(tick, 150);
  setInterval(function () { if (my) pushMe(); }, 4000);
  OUH.debug = function () { return { my: my, g: g, players: players, info: info(), netUp: netUp }; };
})();
