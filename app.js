(() => {
  "use strict";
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  const ALL = window.PORTS;
  const byId = Object.fromEntries(ALL.map((p) => [p.id, p]));

  // ---------- State ----------
  const state = {
    deck: "netplus",
    screen: "menu",
    muted: false,
    lastMode: null,
    drillIds: null,
    session: { games: 0, answered: 0, correct: 0, bestRush: 0, bestBlitz: 0, bestMatch: null, bestSnake: 0 },
  };

  // ---------- Helpers ----------
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const pick = (a) => a[(Math.random() * a.length) | 0];
  const portStr = (p) => (p.ports.length > 2 && p.ports[p.ports.length - 1] - p.ports[0] === p.ports.length - 1)
    ? `${p.ports[0]}-${p.ports[p.ports.length - 1]}` : p.ports.join("/");
  const conflicts = (a, b) => a.id === b.id || a.ports.some((n) => b.ports.includes(n)) || a.name === b.name;
  const deckItems = () => {
    if (state.drillIds) return state.drillIds.map((id) => byId[id]);
    const code = window.DECKS[state.deck].code;
    return code ? ALL.filter((p) => p.exams.includes(code)) : ALL.slice();
  };
  // Memory tricks: built-in plus the player's own (saved in this browser when storage is available)
  const MY_KEY = "portpatrol.mytricks";
  const store = (() => { try { const t = "__pp"; window.localStorage.setItem(t, t); window.localStorage.removeItem(t); return window.localStorage; } catch (e) { return null; } })();
  let myTricks = {};
  try { myTricks = JSON.parse((store && store.getItem(MY_KEY)) || "{}") || {}; } catch (e) { myTricks = {}; }
  const saveTricks = () => { try { if (store) store.setItem(MY_KEY, JSON.stringify(myTricks)); } catch (e) {} };
  const builtIn = (p) => (window.MNEMONICS || {})[p.id] || "";
  const trickFor = (p) => myTricks[p.id] || builtIn(p);
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const examTags = (p) => {
    const t = [];
    if (p.exams.includes("N")) t.push("Net+");
    if (p.exams.includes("S")) t.push("Sec+");
    if (p.exams.includes("C")) t.push("CCNA");
    if (!t.length) t.push("Bonus");
    return t;
  };
  function distractors(item, pool, n) {
    const chosen = [];
    const sources = [shuffle(pool), shuffle(ALL)];
    for (const src of sources) {
      for (const c of src) {
        if (chosen.length >= n) break;
        if (conflicts(c, item) || chosen.some((x) => conflicts(x, c))) continue;
        chosen.push(c);
      }
    }
    return chosen;
  }
  function buildPool(n) {
    let pool = shuffle(deckItems());
    while (pool.length < n) pool = pool.concat(shuffle(deckItems()));
    // avoid back-to-back duplicates
    for (let i = 1; i < pool.length; i++) if (pool[i].id === pool[i - 1].id) { const j = (i + 2) % pool.length; [pool[i], pool[j]] = [pool[j], pool[i]]; }
    return pool.slice(0, n);
  }

  // ---------- Sound ----------
  let actx = null;
  function beep(type) {
    if (state.muted) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const o = actx.createOscillator(), g = actx.createGain();
      const now = actx.currentTime;
      const cfg = { ok: [660, 990, "triangle"], bad: [220, 140, "sawtooth"], tick: [880, 880, "square"], win: [520, 1240, "triangle"] }[type];
      o.type = cfg[2];
      o.frequency.setValueAtTime(cfg[0], now);
      o.frequency.exponentialRampToValueAtTime(cfg[1], now + 0.14);
      g.gain.setValueAtTime(type === "tick" ? 0.03 : 0.08, now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + (type === "win" ? 0.4 : 0.18));
      o.connect(g).connect(actx.destination);
      o.start(now); o.stop(now + 0.45);
    } catch (e) { /* audio unavailable */ }
  }

  // ---------- Navigation ----------
  function show(name) {
    stopAll();
    state.screen = name;
    $$(".screen").forEach((s) => s.classList.toggle("active", s.id === `screen-${name}`));
    window.scrollTo({ top: 0 });
    if (name === "menu") { state.drillIds = null; renderSessionStats(); }
  }
  function startMode(mode) {
    state.lastMode = mode;
    if (mode === "quiz") startQuiz();
    else if (mode === "rush") openRush();
    else if (mode === "blitz") openBlitz();
    else if (mode === "match") startMatch();
    else if (mode === "study") openStudy();
    else if (mode === "snake") openSnake();
  }
  function stopAll() { stopRush(); stopBlitz(); stopMatchTimer(); if (typeof stopSnake === "function") stopSnake(); }

  // ---------- Deck UI ----------
  function renderDeckUI() {
    const sel = $("#deck");
    sel.innerHTML = Object.entries(window.DECKS).map(([k, d]) => `<option value="${k}">${d.label}</option>`).join("");
    sel.value = state.deck;
    $("#deck-pills").innerHTML = Object.entries(window.DECKS).map(([k, d]) => {
      const count = d.code ? ALL.filter((p) => p.exams.includes(d.code)).length : ALL.length;
      return `<button class="pill" role="radio" data-deck="${k}" aria-checked="${k === state.deck}">${d.label}<small>${d.sub} · ${count}</small></button>`;
    }).join("");
  }
  function setDeck(k) {
    state.deck = k;
    renderDeckUI();
    if (state.screen === "study") openStudy();
  }

  // ---------- Results ----------
  function showResults({ mode, title, stats, missed }) {
    state.session.games++;
    $("#res-mode").textContent = `${mode} · ${state.drillIds ? "drill" : window.DECKS[state.deck].label}`;
    $("#res-title").textContent = title;
    $("#res-stats").innerHTML = stats.map(([v, l]) => `<div class="stat"><b>${v}</b><span>${l}</span></div>`).join("");
    const uniq = [...new Set(missed)].map((id) => byId[id]);
    $("#res-missed-wrap").hidden = !uniq.length;
    $("#res-missed").innerHTML = uniq.map((p) => `<li><b>${portStr(p)}</b><div><strong>${p.name}</strong> <span>· ${p.proto} · ${p.tip}</span>${trickFor(p) ? `<span class="memo-mini">Trick: ${esc(trickFor(p))}</span>` : ""}</div></li>`).join("");
    const drill = $("#res-drill");
    drill.hidden = !uniq.length;
    drill.onclick = () => { state.drillIds = uniq.map((p) => p.id); state.lastMode = "quiz"; startQuiz(); };
    $("#res-again").onclick = () => { state.drillIds = null; startMode(mode === "Port Quiz" ? "quiz" : state.lastMode); };
    show("results");
    if (!uniq.length) beep("win");
  }
  function renderSessionStats() {
    const s = state.session;
    $("#session-stats").hidden = s.games === 0;
    const acc = s.answered ? Math.round((s.correct / s.answered) * 100) + "%" : "—";
    $("#session-row").innerHTML = [
      [s.games, "games played"], [acc, "answer accuracy"], [s.bestRush, "best Packet Rush"], [s.bestBlitz, "best Port Blitz"],
      [s.bestMatch ? s.bestMatch.toFixed(1) + "s" : "—", "best Patch Panel"], [s.bestSnake, "best Cyber Snake"],
    ].map(([v, l]) => `<div class="stat"><b>${v}</b><span>${l}</span></div>`).join("");
  }
  function track(ok) { state.session.answered++; if (ok) state.session.correct++; }

  // ---------- QUIZ ----------
  const quiz = { qs: [], i: 0, score: 0, streak: 0, best: 0, correct: 0, missed: [], answered: false };
  function startQuiz() {
    const n = state.drillIds ? Math.max(state.drillIds.length * 2, 6) : 15;
    const pool = buildPool(n);
    quiz.qs = pool.map((item, i) => ({ item, dir: i % 2 === 0 ? (Math.random() < 0.5 ? "p2s" : "s2p") : (Math.random() < 0.5 ? "s2p" : "p2s") }));
    Object.assign(quiz, { i: 0, score: 0, streak: 0, best: 0, correct: 0, missed: [] });
    $("#q-total").textContent = quiz.qs.length;
    show("quiz");
    renderQuiz();
  }
  function renderQuiz() {
    const q = quiz.qs[quiz.i];
    quiz.answered = false;
    const opts = shuffle([q.item, ...distractors(q.item, deckItems(), 3)]);
    q.opts = opts;
    $("#q-num").textContent = quiz.i + 1;
    $("#q-score").textContent = quiz.score;
    $("#q-streak").textContent = quiz.streak;
    $("#q-progress").style.width = (quiz.i / quiz.qs.length) * 100 + "%";
    $("#q-feedback").hidden = true;
    $("#q-next").hidden = true;
    if (q.dir === "p2s") {
      $("#q-label").textContent = "Which service uses port";
      $("#q-prompt").textContent = portStr(q.item);
      $("#q-sub").textContent = q.item.proto;
      $("#q-options").innerHTML = opts.map((o, k) => `<button class="opt" data-id="${o.id}"><span class="k">${k + 1}</span>${o.name}<span class="o-sub">${o.full}</span></button>`).join("");
    } else {
      $("#q-label").textContent = "Which port does this use";
      $("#q-prompt").textContent = q.item.name;
      $("#q-sub").textContent = q.item.full;
      $("#q-options").innerHTML = opts.map((o, k) => `<button class="opt port-opt" data-id="${o.id}"><span class="k">${k + 1}</span>${portStr(o)}</button>`).join("");
    }
  }
  function answerQuiz(id) {
    if (quiz.answered) return;
    quiz.answered = true;
    const q = quiz.qs[quiz.i];
    const ok = id === q.item.id;
    track(ok);
    $$("#q-options .opt").forEach((b) => {
      b.disabled = true;
      if (b.dataset.id === q.item.id) b.classList.add("correct");
      else if (b.dataset.id === id) b.classList.add("wrong");
    });
    if (ok) { quiz.streak++; quiz.best = Math.max(quiz.best, quiz.streak); quiz.correct++; quiz.score += 100 + (quiz.streak - 1) * 10; beep("ok"); }
    else { quiz.streak = 0; quiz.missed.push(q.item.id); beep("bad"); }
    const fb = $("#q-feedback");
    fb.className = "feedback" + (ok ? "" : " bad");
    const chosen = byId[id];
    const wrongNote = !ok && chosen ? `<p>You picked ${chosen.name}, which uses ${portStr(chosen)}.</p>` : "";
    fb.innerHTML = `<div>${ok ? "Correct." : "Not quite."} <b>${q.item.name}</b> → <b>${portStr(q.item)}</b> (${q.item.proto})</div>${wrongNote}<p>${q.item.tip}</p>${trickFor(q.item) ? `<p class="memo-line"><span class="memo-label mono">Memory trick</span> ${esc(trickFor(q.item))}</p>` : ""}`;
    fb.hidden = false;
    $("#q-score").textContent = quiz.score;
    $("#q-streak").textContent = quiz.streak;
    $("#q-next").hidden = false;
    $("#q-next").textContent = quiz.i + 1 >= quiz.qs.length ? "See results" : "Next";
    $("#q-next").insertAdjacentHTML("beforeend", "<kbd>Enter</kbd>");
    $("#q-next").focus({ preventScroll: true });
  }
  function nextQuiz() {
    if (!quiz.answered) return;
    quiz.i++;
    if (quiz.i >= quiz.qs.length) {
      const pct = Math.round((quiz.correct / quiz.qs.length) * 100);
      showResults({
        mode: "Port Quiz",
        title: pct === 100 ? "Perfect scan. Zero open findings." : pct >= 80 ? "Exam-ready territory." : pct >= 60 ? "Solid. Patch the gaps." : "Keep drilling. You've got this.",
        stats: [[pct + "%", "accuracy"], [quiz.score, "score"], [quiz.best, "best streak"]],
        missed: quiz.missed,
      });
      return;
    }
    renderQuiz();
  }

  // ---------- PACKET RUSH ----------
  const rush = { running: false, raf: 0, item: null, port: 0, x: 0, dur: 7000, t0: 0, score: 0, lives: 3, level: 1, hits: 0, missed: [], opts: [], lock: false };
  function openRush() {
    Object.assign(rush, { running: false, score: 0, lives: 3, level: 1, hits: 0, missed: [], lock: false });
    $("#rush-overlay").hidden = false;
    $("#rush-overlay").querySelector("h2").textContent = "Packet Rush";
    $("#packet").hidden = true;
    $("#r-options").innerHTML = "";
    updateRushHud();
    show("rush");
    $("#rush-start").focus({ preventScroll: true });
  }
  function updateRushHud() {
    $("#r-score").textContent = rush.score;
    $("#r-level").textContent = rush.level;
    $("#r-lives").innerHTML = [0, 1, 2].map((i) => `<i class="${i < rush.lives ? "" : "lost"}"></i>`).join("");
  }
  function startRush() {
    $("#rush-overlay").hidden = true;
    rush.running = true;
    rush.pool = [];
    nextPacket();
  }
  function nextPacket() {
    if (!rush.pool.length) rush.pool = shuffle(deckItems());
    let item = rush.pool.pop();
    if (rush.item && item.id === rush.item.id && rush.pool.length) item = rush.pool.pop();
    rush.item = item;
    rush.port = pick(item.ports);
    const proto = item.proto === "TCP/UDP" ? pick(["TCP", "UDP"]) : item.proto;
    $("#pk-port").textContent = rush.port;
    $("#pk-proto").textContent = proto;
    rush.opts = shuffle([item, ...distractors(item, deckItems(), 3)]);
    $("#r-options").innerHTML = rush.opts.map((o, k) => `<button class="opt" data-id="${o.id}"><span class="k">${k + 1}</span>${o.name}</button>`).join("");
    rush.dur = Math.max(2200, 7000 - (rush.level - 1) * 550);
    rush.t0 = performance.now();
    rush.lock = false;
    const pk = $("#packet");
    pk.hidden = false; pk.classList.remove("danger");
    cancelAnimationFrame(rush.raf);
    rush.raf = requestAnimationFrame(rushTick);
  }
  function rushTick(now) {
    if (!rush.running) return;
    const field = $("#rush-field"), pk = $("#packet");
    const maxX = field.clientWidth - 56 - pk.offsetWidth - 4;
    const p = Math.min(1, (now - rush.t0) / rush.dur);
    pk.style.transform = `translate(${12 + p * (maxX - 12)}px, -50%)`;
    pk.classList.toggle("danger", p > 0.7);
    if (p >= 1) { rushFail(null); return; }
    rush.raf = requestAnimationFrame(rushTick);
  }
  function flash(cls) {
    const f = $("#rush-flash");
    f.className = "flash " + cls;
    requestAnimationFrame(() => requestAnimationFrame(() => (f.className = "flash")));
  }
  function answerRush(id) {
    if (!rush.running || rush.lock) return;
    if (id === rush.item.id) {
      rush.lock = true;
      track(true);
      const remain = 1 - (performance.now() - rush.t0) / rush.dur;
      rush.score += 10 * rush.level + Math.round(remain * 10);
      rush.hits++;
      if (rush.hits % 5 === 0) rush.level++;
      beep("ok"); flash("ok");
      updateRushHud();
      nextPacket();
    } else {
      rushFail(id);
    }
  }
  function rushFail(id) {
    rush.lock = true;
    track(false);
    rush.missed.push(rush.item.id);
    rush.lives--;
    beep("bad"); flash("bad");
    $$("#r-options .opt").forEach((b) => {
      b.disabled = true;
      if (b.dataset.id === rush.item.id) b.classList.add("correct");
      else if (b.dataset.id === id) b.classList.add("wrong");
    });
    updateRushHud();
    cancelAnimationFrame(rush.raf);
    if (rush.lives <= 0) {
      rush.running = false;
      setTimeout(() => {
        if (state.screen !== "rush") return;
        state.session.bestRush = Math.max(state.session.bestRush, rush.score);
        showResults({
          mode: "Packet Rush",
          title: rush.score >= 300 ? "Firewall held. Elite SOC energy." : rush.score >= 120 ? "Good defense. A few got through." : "Breached. Reboot and retry.",
          stats: [[rush.score, "score"], [rush.hits, "packets identified"], [rush.level, "level reached"]],
          missed: rush.missed,
        });
      }, 1100);
    } else {
      setTimeout(() => { if (rush.running && state.screen === "rush") nextPacket(); }, 1100);
    }
  }
  function stopRush() { rush.running = false; cancelAnimationFrame(rush.raf); }

  // ---------- PORT BLITZ ----------
  const blitz = { running: false, timer: 0, end: 0, item: null, score: 0, streak: 0, best: 0, missed: [], pool: [], tries: 0 };
  const BLITZ_SECS = 60;
  function openBlitz() {
    stopBlitz();
    $("#b-intro").hidden = false;
    $("#b-play").hidden = true;
    $("#b-time").textContent = BLITZ_SECS;
    $("#b-score").textContent = 0;
    $("#b-streak").textContent = 0;
    $("#b-progress").style.width = "100%";
    $(".progress.timer").classList.remove("low");
    show("blitz");
    $("#blitz-start").focus({ preventScroll: true });
  }
  function startBlitz() {
    Object.assign(blitz, { running: true, score: 0, streak: 0, best: 0, missed: [], pool: [], tries: 0 });
    $("#b-intro").hidden = true;
    $("#b-play").hidden = false;
    $("#b-log").innerHTML = "";
    blitz.end = performance.now() + BLITZ_SECS * 1000;
    nextBlitz();
    blitz.timer = setInterval(blitzTick, 100);
  }
  function blitzTick() {
    const left = Math.max(0, blitz.end - performance.now());
    $("#b-time").textContent = Math.ceil(left / 1000);
    $("#b-progress").style.width = (left / (BLITZ_SECS * 1000)) * 100 + "%";
    $(".progress.timer").classList.toggle("low", left < 10000);
    if (left <= 0) endBlitz();
  }
  function nextBlitz() {
    if (!blitz.pool.length) blitz.pool = shuffle(deckItems());
    blitz.item = blitz.pool.pop();
    $("#b-prompt").textContent = blitz.item.name;
    $("#b-sub").textContent = `${blitz.item.full} · ${blitz.item.proto}`;
    const inp = $("#b-input");
    inp.value = "";
    inp.focus({ preventScroll: true });
  }
  function logBlitz(ok, text) {
    const log = $("#b-log");
    log.insertAdjacentHTML("afterbegin", `<div class="${ok ? "ok" : "bad"}">${ok ? "[+]" : "[-]"} ${text}</div>`);
    while (log.children.length > 5) log.lastChild.remove();
  }
  function submitBlitz(skip) {
    if (!blitz.running) return;
    const inp = $("#b-input");
    const val = parseInt(inp.value, 10);
    if (!skip && isNaN(val)) return;
    const it = blitz.item;
    const term = $("#b-form");
    term.classList.remove("shake", "good");
    void term.offsetWidth;
    blitz.tries++;
    if (!skip && it.ports.includes(val)) {
      track(true);
      blitz.score++; blitz.streak++; blitz.best = Math.max(blitz.best, blitz.streak);
      term.classList.add("good"); beep("ok");
      logBlitz(true, `${it.name} = ${portStr(it)}`);
    } else {
      track(false);
      blitz.streak = 0; blitz.missed.push(it.id);
      term.classList.add("shake"); beep("bad");
      logBlitz(false, `${it.name} = ${portStr(it)}${skip ? " (skipped)" : `, not ${val}`}`);
    }
    $("#b-score").textContent = blitz.score;
    $("#b-streak").textContent = blitz.streak;
    nextBlitz();
  }
  function endBlitz() {
    stopBlitz();
    state.session.bestBlitz = Math.max(state.session.bestBlitz, blitz.score);
    const acc = blitz.tries ? Math.round((blitz.score / blitz.tries) * 100) : 0;
    showResults({
      mode: "Port Blitz",
      title: blitz.score >= 25 ? "Muscle memory unlocked." : blitz.score >= 15 ? "Fast hands. Keep it up." : "Warm-up complete. Go again.",
      stats: [[blitz.score, "ports recalled"], [acc + "%", "accuracy"], [blitz.best, "best streak"]],
      missed: blitz.missed,
    });
  }
  function stopBlitz() { blitz.running = false; clearInterval(blitz.timer); }

  // ---------- PATCH PANEL ----------
  const match = { round: 0, pairs: [], sel: null, done: 0, misses: 0, t0: 0, timer: 0, missed: [] };
  const MATCH_ROUNDS = 3, MATCH_SIZE = 5;
  function startMatch() {
    Object.assign(match, { round: 0, misses: 0, missed: [], sel: null });
    match.queue = shuffle(deckItems());
    show("match");
    match.t0 = performance.now();
    stopMatchTimer();
    match.timer = setInterval(() => { $("#m-time").textContent = ((performance.now() - match.t0) / 1000).toFixed(1); }, 100);
    nextPanel();
  }
  function nextPanel() {
    match.round++;
    const set = [];
    let guard = 0;
    while (set.length < MATCH_SIZE && guard++ < 400) {
      if (!match.queue.length) match.queue = shuffle(deckItems().length >= MATCH_SIZE ? deckItems() : ALL);
      const c = match.queue.pop();
      if (!set.some((x) => conflicts(x, c))) set.push(c);
    }
    match.pairs = set; match.done = 0; match.sel = null;
    $("#m-round").textContent = match.round;
    $("#m-miss").textContent = match.misses;
    $("#m-ports").innerHTML = shuffle(set).map((p) => `<button class="jack" data-side="port" data-id="${p.id}">${portStr(p)}</button>`).join("");
    $("#m-svcs").innerHTML = shuffle(set).map((p) => `<button class="jack" data-side="svc" data-id="${p.id}">${p.name}</button>`).join("");
  }
  function clickJack(btn) {
    if (btn.classList.contains("done")) return;
    const side = btn.dataset.side;
    if (!match.sel || match.sel.dataset.side === side) {
      if (match.sel) match.sel.classList.remove("sel");
      match.sel = match.sel === btn ? null : btn;
      if (match.sel) btn.classList.add("sel");
      return;
    }
    const a = match.sel;
    a.classList.remove("sel");
    match.sel = null;
    if (a.dataset.id === btn.dataset.id) {
      track(true);
      a.classList.add("done"); btn.classList.add("done"); a.disabled = btn.disabled = true;
      beep("ok");
      match.done++;
      if (match.done === match.pairs.length) {
        if (match.round >= MATCH_ROUNDS) return setTimeout(endMatch, 350);
        setTimeout(nextPanel, 450);
      }
    } else {
      track(false);
      match.misses++;
      const portBtn = a.dataset.side === "port" ? a : btn;
      match.missed.push(portBtn.dataset.id);
      $("#m-miss").textContent = match.misses;
      [a, btn].forEach((b) => { b.classList.remove("miss"); void b.offsetWidth; b.classList.add("miss"); });
      beep("bad");
    }
  }
  function endMatch() {
    stopMatchTimer();
    const secs = (performance.now() - match.t0) / 1000;
    const final = secs + match.misses * 3;
    state.session.bestMatch = state.session.bestMatch ? Math.min(state.session.bestMatch, final) : final;
    showResults({
      mode: "Patch Panel",
      title: match.misses === 0 ? "Clean cable run. No misses." : match.misses <= 3 ? "Panel patched. Minor rework." : "Panel patched. Label those cables.",
      stats: [[secs.toFixed(1) + "s", "time"], [match.misses, "misses (+3s each)"], [final.toFixed(1) + "s", "final time"]],
      missed: match.missed,
    });
  }
  function stopMatchTimer() { clearInterval(match.timer); }

  // ---------- STUDY ----------
  const study = { cards: [], i: 0, svcFirst: false };
  function openStudy() {
    study.cards = deckItems().slice().sort((a, b) => a.ports[0] - b.ports[0]);
    study.i = Math.min(study.i, study.cards.length - 1);
    renderCard();
    renderTable($("#ref-search").value);
    renderPairs();
    if (state.screen !== "study") show("study");
  }
  function renderCard() {
    const p = study.cards[study.i];
    if (!p) return;
    $("#flashcard").classList.remove("flipped");
    const front = $("#fc-front");
    if (study.svcFirst) {
      front.textContent = p.name;
      $("#fc-name").textContent = portStr(p);
    } else {
      front.textContent = portStr(p);
      $("#fc-name").textContent = p.name;
    }
    $("#fc-full").textContent = `${p.full} · ${p.proto}`;
    $("#fc-tip").textContent = p.tip;
    const tr = trickFor(p);
    $("#fc-memo").hidden = !tr;
    $("#fc-memo").textContent = tr ? (myTricks[p.id] ? "Your trick: " : "Trick: ") + tr : "";
    $("#fc-tags").textContent = examTags(p).join(" · ");
    $("#fc-count").textContent = `${study.i + 1} / ${study.cards.length}`;
  }
  function renderTable(q = "") {
    q = q.trim().toLowerCase();
    const rows = deckItems().slice().sort((a, b) => a.ports[0] - b.ports[0]).filter((p) =>
      !q || portStr(p).includes(q) || p.name.toLowerCase().includes(q) || p.full.toLowerCase().includes(q));
    $("#ref-body").innerHTML = rows.length ? rows.map((p) => `<tr>
      <td>${portStr(p)}</td>
      <td><strong>${p.name}</strong><span class="lock ${p.secure ? "" : "open"}">${p.secure ? "secure" : "cleartext"}</span><br><span style="color:var(--muted);font-size:13px">${p.full}</span></td>
      <td class="mono">${p.proto}</td>
      <td>${examTags(p).map((t) => `<span class="tag">${t}</span>`).join("")}</td>
      <td>${p.tip}</td></tr>`).join("")
      : `<tr><td colspan="5" style="color:var(--muted);font-family:var(--sans);font-weight:400">No ports match "${q.replace(/[<>&"]/g, "")}". Try a number like 443 or a name like DNS.</td></tr>`;
  }
  function renderPairs() {
    const pairs = [
      ["ftp", "sftp"], ["telnet", "ssh"], ["http", "https"], ["smtp", "smtps"], ["ldap", "ldaps"], ["pop3", "pop3s"], ["imap", "imaps"], ["sip", "sips"],
    ].map(([a, b]) => [byId[a], byId[b]]);
    const extra = [
      [{ name: "SNMPv1/v2c", p: "161/162" }, { name: "SNMPv3", p: "161/162" }],
      [{ name: "FTP", p: "20/21" }, { name: "FTPS", p: "989/990" }],
    ];
    const card = (a, b) => `<div class="pair"><div class="ins"><b>${a.p}</b><span>${a.name}</span></div><div class="arrow">→</div><div class="sec"><b>${b.p}</b><span>${b.name}</span></div></div>`;
    $("#pairs").innerHTML = pairs.map(([a, b]) => card({ name: a.name, p: portStr(a) }, { name: b.name, p: portStr(b) })).join("") + extra.map(([a, b]) => card(a, b)).join("");
  }
  function renderTricks(q = "") {
    q = q.trim().toLowerCase();
    const rows = deckItems().slice().sort((a, b) => a.ports[0] - b.ports[0]).filter((p) =>
      !q || portStr(p).includes(q) || p.name.toLowerCase().includes(q) || p.full.toLowerCase().includes(q) || trickFor(p).toLowerCase().includes(q));
    $("#tricks-list").innerHTML = rows.length ? rows.map((p) => `<article class="trick" data-id="${p.id}">
      <div class="trick-head"><b class="mono">${portStr(p)}</b><strong>${p.name}</strong></div>
      ${builtIn(p) ? `<p class="trick-built"><span class="memo-label mono">Built-in</span> ${esc(builtIn(p))}</p>` : ""}
      <label class="trick-mine"><span class="memo-label mono">Your trick</span>
        <textarea rows="2" maxlength="240" data-trick="${p.id}" placeholder="Write your own way to remember ${portStr(p)}…">${esc(myTricks[p.id] || "")}</textarea>
      </label>
      <span class="trick-saved mono" aria-live="polite"></span>
    </article>`).join("")
      : `<p class="match-help">No tricks match "${esc(q)}". Try a number like 25 or a name like SMTP.</p>`;
  }
  function setTab(t) {
    $$(".tab").forEach((b) => { const on = b.dataset.tab === t; b.classList.toggle("active", on); b.setAttribute("aria-selected", on); });
    ["cards", "table", "pairs", "tricks"].forEach((k) => ($(`#tab-${k}`).hidden = k !== t));
    if (t === "tricks") renderTricks($("#tricks-search").value);
  }

  // ---------- CYBER SNAKE ----------
  const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  const OPP = { up: "down", down: "up", left: "right", right: "left" };
  const snake = { running: false, paused: false, over: false, raf: 0, acc: 0, last: 0, cols: 24, rows: 15, cell: 32, body: [], dir: "right", queue: [], grow: 0,
    tokens: [], target: null, targetPort: 0, score: 0, lives: 3, eaten: 0, level: 1, tick: 160, missed: [], pool: [], toastT: 0, pulse: 0 };
  const cvs = () => $("#snake-canvas");
  const SNAKE_INTRO = $("#snake-ov-text").textContent;

  function sizeSnake() {
    const wrap = $("#snake-wrap");
    const w = wrap.clientWidth - 2;
    const narrow = w < 560;
    snake.cols = narrow ? 14 : 24;
    snake.rows = narrow ? 16 : 15;
    const availH = Math.max(narrow ? 300 : 330, window.innerHeight - (narrow ? 360 : 330));
    snake.cell = Math.max(narrow ? 18 : 22, Math.floor(Math.min(w / snake.cols, availH / snake.rows, 40)));
    const c = cvs(), dpr = window.devicePixelRatio || 1;
    c.width = snake.cols * snake.cell * dpr;
    c.height = snake.rows * snake.cell * dpr;
    c.style.width = snake.cols * snake.cell + "px";
    c.style.height = snake.rows * snake.cell + "px";
    c.getContext("2d").setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function openSnake() {
    stopSnake();
    show("snake");
    sizeSnake();
    resetSnakeState();
    $("#snake-ov-title").textContent = "Cyber Snake";
    $("#snake-ov-text").textContent = SNAKE_INTRO;
    $("#snake-start").innerHTML = "Start <kbd>Enter</kbd>";
    $("#snake-overlay").hidden = false;
    drawSnake();
    $("#snake-start").focus({ preventScroll: true });
  }
  function resetSnakeState() {
    const cy = Math.floor(snake.rows / 2);
    Object.assign(snake, { body: [{ x: 4, y: cy }, { x: 3, y: cy }, { x: 2, y: cy }], dir: "right", queue: [], grow: 0, score: 0, lives: 3, eaten: 0, level: 1, tick: 160, missed: [], pool: [], over: false, paused: false });
    newSnakeTarget();
    updateSnakeHud();
  }
  function updateSnakeHud() {
    $("#s-score").textContent = snake.score;
    $("#s-level").textContent = snake.level;
    $("#s-lives").innerHTML = [0, 1, 2].map((i) => `<i class="${i < snake.lives ? "" : "lost"}"></i>`).join("");
  }
  function cellFree(x, y) {
    if (x < 0 || y < 0 || x + 1 >= snake.cols || y >= snake.rows) return false;
    const head = snake.body[0];
    if (Math.abs(head.x - x) + Math.abs(head.y - y) < 4) return false;
    // keep clear of the cells directly ahead of the head
    const [dx, dy] = DIRS[snake.dir];
    for (let k = 1; k <= 3; k++) { const ax = head.x + dx * k, ay = head.y + dy * k; if (ay === y && (ax === x || ax === x + 1)) return false; }
    if (snake.body.some((b) => b.y === y && (b.x === x || b.x === x + 1))) return false;
    // tokens need a one-cell gap around them
    return !snake.tokens.some((t) => Math.abs(t.y - y) <= 1 && x <= t.x + 2 && x + 1 >= t.x - 1);
  }
  function spawnToken(item, port, correct) {
    for (let tries = 0; tries < 500; tries++) {
      const x = (Math.random() * (snake.cols - 1)) | 0, y = (Math.random() * snake.rows) | 0;
      if (cellFree(x, y)) { snake.tokens.push({ x, y, item, port, correct }); return; }
    }
  }
  function newSnakeTarget() {
    if (!snake.pool.length) snake.pool = shuffle(deckItems());
    let item = snake.pool.pop();
    if (snake.target && item.id === snake.target.id && snake.pool.length) item = snake.pool.pop();
    snake.target = item;
    snake.targetPort = pick(item.ports);
    snake.tokens = [];
    spawnToken(item, snake.targetPort, true);
    const decoys = distractors(item, deckItems(), Math.min(5, 2 + snake.level));
    decoys.forEach((d) => spawnToken(d, pick(d.ports), false));
    $("#s-name").textContent = item.name;
    $("#s-sub").textContent = `${item.full} · ${item.proto}`;
  }
  function toast(msg, bad) {
    const t = $("#s-toast");
    t.textContent = msg;
    t.className = "snake-toast mono" + (bad ? " bad" : "");
    t.hidden = false;
    clearTimeout(snake.toastT);
    snake.toastT = setTimeout(() => (t.hidden = true), bad ? 2200 : 1300);
  }
  function startSnake() {
    if (snake.over) { sizeSnake(); resetSnakeState(); }
    $("#snake-overlay").hidden = true;
    snake.running = true; snake.paused = false;
    snake.last = performance.now(); snake.acc = 0;
    cancelAnimationFrame(snake.raf);
    snake.raf = requestAnimationFrame(snakeLoop);
  }
  function pauseSnake() {
    if (!snake.running || snake.over) return;
    snake.paused = !snake.paused;
    $("#snake-ov-title").textContent = "Paused";
    $("#snake-ov-text").textContent = "Press Space or Resume to keep going.";
    $("#snake-start").innerHTML = "Resume <kbd>Space</kbd>";
    $("#snake-overlay").hidden = !snake.paused;
    if (!snake.paused) { snake.last = performance.now(); snake.raf = requestAnimationFrame(snakeLoop); }
  }
  function steer(d) {
    if (!snake.running || snake.paused) return;
    const lastDir = snake.queue.length ? snake.queue[snake.queue.length - 1] : snake.dir;
    if (d === lastDir || d === OPP[lastDir] || snake.queue.length >= 2) return;
    snake.queue.push(d);
  }
  function snakeLoop(now) {
    if (!snake.running || snake.paused) return;
    snake.acc += now - snake.last; snake.last = now;
    snake.pulse = now;
    while (snake.acc >= snake.tick && snake.running) { snake.acc -= snake.tick; stepSnake(); }
    drawSnake();
    if (snake.running) snake.raf = requestAnimationFrame(snakeLoop);
  }
  function stepSnake() {
    if (snake.queue.length) snake.dir = snake.queue.shift();
    const [dx, dy] = DIRS[snake.dir];
    const head = { x: snake.body[0].x + dx, y: snake.body[0].y + dy };
    const willGrow = snake.grow > 0;
    const bodyToCheck = willGrow ? snake.body : snake.body.slice(0, -1);
    if (head.x < 0 || head.y < 0 || head.x >= snake.cols || head.y >= snake.rows) return endSnake("You hit the firewall.");
    if (bodyToCheck.some((b) => b.x === head.x && b.y === head.y)) return endSnake("You ran into your own tail.");
    snake.body.unshift(head);
    if (willGrow) snake.grow--; else snake.body.pop();
    const hit = snake.tokens.find((t) => t.y === head.y && (t.x === head.x || t.x + 1 === head.x));
    if (!hit) return;
    if (hit.correct) {
      track(true); beep("ok");
      snake.eaten++;
      snake.score += 10 * snake.level;
      snake.grow += 2;
      snake.level = 1 + Math.floor(snake.eaten / 4);
      snake.tick = Math.max(75, 160 - (snake.level - 1) * 14);
      toast(`+ ${snake.target.name} = ${portStr(snake.target)}`, false);
      newSnakeTarget();
    } else {
      track(false); beep("bad");
      snake.missed.push(snake.target.id);
      snake.lives--;
      const w = $("#snake-wrap"); w.classList.remove("hit"); void w.offsetWidth; w.classList.add("hit"); setTimeout(() => w.classList.remove("hit"), 400);
      toast(`${hit.port} is ${hit.item.name}. ${snake.target.name} = ${portStr(snake.target)}`, true);
      snake.tokens = snake.tokens.filter((t) => t !== hit);
      spawnToken(hit.item, hit.port, false);
      if (snake.lives <= 0) { updateSnakeHud(); return endSnake("Out of lives."); }
    }
    updateSnakeHud();
  }
  function endSnake(reason) {
    snake.running = false; snake.over = true;
    cancelAnimationFrame(snake.raf);
    beep("bad");
    drawSnake(true);
    if (!snake.missed.includes(snake.target.id) && reason !== "Out of lives.") snake.missed.push(snake.target.id);
    state.session.bestSnake = Math.max(state.session.bestSnake || 0, snake.score);
    setTimeout(() => {
      if (state.screen !== "snake") return;
      showResults({
        mode: "Cyber Snake",
        title: snake.eaten >= 15 ? "Apex predator of the packet layer." : snake.eaten >= 7 ? `${reason} Strong run.` : `${reason} Shed your skin and retry.`,
        stats: [[snake.score, "score"], [snake.eaten, "ports eaten"], [snake.body.length, "final length"], [snake.level, "level reached"]],
        missed: snake.missed,
      });
    }, 1000);
  }
  function stopSnake() { snake.running = false; cancelAnimationFrame(snake.raf); clearTimeout(snake.toastT); const t = $("#s-toast"); if (t) t.hidden = true; }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function drawSnake(dead) {
    const c = cvs(); if (!c) return;
    const ctx = c.getContext("2d"), s = snake.cell, W = snake.cols * s, H = snake.rows * s;
    ctx.fillStyle = "#181818"; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(70,70,255,0.12)"; ctx.lineWidth = 1;
    for (let x = 0; x <= snake.cols; x++) { ctx.beginPath(); ctx.moveTo(x * s + .5, 0); ctx.lineTo(x * s + .5, H); ctx.stroke(); }
    for (let y = 0; y <= snake.rows; y++) { ctx.beginPath(); ctx.moveTo(0, y * s + .5); ctx.lineTo(W, y * s + .5); ctx.stroke(); }
    // tokens (all look alike, so the player has to know the answer)
    const glow = 0.5 + 0.5 * Math.sin(snake.pulse / 300);
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    const fs = Math.max(11, Math.min(16, Math.floor(s * 0.48)));
    for (const t of snake.tokens) {
      const x = t.x * s + 2, y = t.y * s + 3, w = s * 2 - 4, h = s - 6;
      ctx.shadowColor = "rgba(0,0,254,0.9)"; ctx.shadowBlur = 6 + glow * 8;
      ctx.fillStyle = "#1e1e3d"; roundRect(ctx, x, y, w, h, 5); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "#8792ff"; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = "#ffffff"; ctx.font = `700 ${String(t.port).length > 4 ? fs - 2 : fs}px "JetBrains Mono", monospace`;
      ctx.fillText(String(t.port), x + w / 2, y + h / 2 + 1);
    }
    // snake body
    const n = snake.body.length;
    snake.body.forEach((b, i) => {
      const k = 1 - i / Math.max(n, 6) * 0.45;
      const pad = i === 0 ? 1 : 2;
      ctx.fillStyle = dead ? `rgba(255,0,140,${k})` : i === 0 ? "#FFEC01" : `rgba(30,40,255,${k})`;
      if (i === 0) { ctx.shadowColor = dead ? "#FF008C" : "#FFEC01"; ctx.shadowBlur = 12; }
      roundRect(ctx, b.x * s + pad, b.y * s + pad, s - pad * 2, s - pad * 2, i === 0 ? 6 : 4); ctx.fill();
      ctx.shadowBlur = 0;
      if (i > 0 && i % 3 === 0) { // circuit trace detail
        ctx.fillStyle = "rgba(255,236,1,0.55)"; ctx.fillRect(b.x * s + s / 2 - 1, b.y * s + 4, 2, s - 8);
      }
    });
    // eyes
    const h0 = snake.body[0]; if (!h0) return;
    const [dx, dy] = DIRS[snake.dir];
    const cx = h0.x * s + s / 2, cy = h0.y * s + s / 2, off = s * 0.18;
    ctx.fillStyle = "#1C1C1C";
    [[-1, 1]].forEach(() => {
      const ex1 = cx + dx * off - dy * off, ey1 = cy + dy * off + dx * off;
      const ex2 = cx + dx * off + dy * off, ey2 = cy + dy * off - dx * off;
      const r = Math.max(2, s * 0.09);
      ctx.fillRect(ex1 - r, ey1 - r, r * 2, r * 2); ctx.fillRect(ex2 - r, ey2 - r, r * 2, r * 2);
    });
  }

  // swipe controls
  (() => {
    let sx = 0, sy = 0;
    const wrap = $("#snake-wrap");
    wrap.addEventListener("touchstart", (e) => { const t = e.touches[0]; sx = t.clientX; sy = t.clientY; }, { passive: true });
    wrap.addEventListener("touchmove", (e) => { if (snake.running) e.preventDefault(); }, { passive: false });
    wrap.addEventListener("touchend", (e) => {
      const t = e.changedTouches[0], dx = t.clientX - sx, dy = t.clientY - sy;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return;
      steer(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up"));
    });
  })();
  window.addEventListener("resize", () => { if (state.screen === "snake" && !snake.running) { sizeSnake(); if (snake.over) resetSnakeState(); else { snake.tokens = []; newSnakeTarget(); } drawSnake(); } });

  // ---------- Events ----------
  document.addEventListener("click", (e) => {
    const go = e.target.closest("[data-go]");
    if (go) return show(go.dataset.go);
    const mode = e.target.closest("[data-mode]");
    if (mode) return startMode(mode.dataset.mode);
    const pill = e.target.closest("[data-deck]");
    if (pill) return setDeck(pill.dataset.deck);
    const qo = e.target.closest("#q-options .opt");
    if (qo) return answerQuiz(qo.dataset.id);
    const ro = e.target.closest("#r-options .opt");
    if (ro) return answerRush(ro.dataset.id);
    const jack = e.target.closest(".jack");
    if (jack) return clickJack(jack);
    const dp = e.target.closest(".dp");
    if (dp) return steer(dp.dataset.dir);
    const tab = e.target.closest(".tab");
    if (tab) return setTab(tab.dataset.tab);
  });
  $("#deck").addEventListener("change", (e) => setDeck(e.target.value));
  $("#mute").addEventListener("click", () => { state.muted = !state.muted; $("#mute").classList.toggle("muted", state.muted); });
  $("#q-next").addEventListener("click", nextQuiz);
  $("#rush-start").addEventListener("click", startRush);
  $("#blitz-start").addEventListener("click", startBlitz);
  $("#snake-start").addEventListener("click", () => (snake.paused ? pauseSnake() : startSnake()));
  $("#b-form").addEventListener("submit", (e) => { e.preventDefault(); submitBlitz(false); });
  $("#b-input").addEventListener("input", (e) => { e.target.value = e.target.value.replace(/\D/g, ""); });
  $("#flashcard").addEventListener("click", () => $("#flashcard").classList.toggle("flipped"));
  $("#fc-next").addEventListener("click", () => { study.i = (study.i + 1) % study.cards.length; renderCard(); });
  $("#fc-prev").addEventListener("click", () => { study.i = (study.i - 1 + study.cards.length) % study.cards.length; renderCard(); });
  $("#fc-shuffle").addEventListener("click", () => { study.cards = shuffle(study.cards); study.i = 0; renderCard(); });
  $("#fc-flipside").addEventListener("click", (e) => { study.svcFirst = !study.svcFirst; e.target.textContent = study.svcFirst ? "Show port first" : "Show service first"; renderCard(); });
  $("#ref-search").addEventListener("input", (e) => renderTable(e.target.value));
  $("#tricks-search").addEventListener("input", (e) => renderTricks(e.target.value));
  let trickT = 0;
  $("#tricks-list").addEventListener("input", (e) => {
    const ta = e.target.closest("textarea[data-trick]");
    if (!ta) return;
    const v = ta.value.trim();
    if (v) myTricks[ta.dataset.trick] = v; else delete myTricks[ta.dataset.trick];
    saveTricks();
    const msg = ta.closest(".trick").querySelector(".trick-saved");
    msg.textContent = store ? "Saved in this browser" : "Saved for this session";
    clearTimeout(trickT); trickT = setTimeout(() => (msg.textContent = ""), 1600);
  });

  document.addEventListener("keydown", (e) => {
    const k = e.key;
    const num = /^[1-4]$/.test(k) ? parseInt(k, 10) - 1 : -1;
    if (state.screen === "quiz") {
      if (num >= 0 && !quiz.answered) { const b = $$("#q-options .opt")[num]; if (b) answerQuiz(b.dataset.id); }
      else if (k === "Enter" && quiz.answered) { e.preventDefault(); nextQuiz(); }
    } else if (state.screen === "rush") {
      if (!rush.running && !$("#rush-overlay").hidden && k === "Enter") { e.preventDefault(); startRush(); }
      else if (num >= 0) { const b = $$("#r-options .opt")[num]; if (b && !b.disabled) answerRush(b.dataset.id); }
    } else if (state.screen === "blitz") {
      if (!blitz.running && k === "Enter" && !$("#b-intro").hidden) { e.preventDefault(); startBlitz(); }
      else if (blitz.running && k === "Tab") { e.preventDefault(); submitBlitz(true); }
    } else if (state.screen === "snake") {
      const map = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right", w: "up", s: "down", a: "left", d: "right", W: "up", S: "down", A: "left", D: "right" };
      if (map[k]) { e.preventDefault(); steer(map[k]); }
      else if (k === " ") { e.preventDefault(); if (snake.running) pauseSnake(); else if (!$("#snake-overlay").hidden) startSnake(); }
      else if (k === "Enter" && !$("#snake-overlay").hidden) { e.preventDefault(); if (snake.paused) pauseSnake(); else if (!snake.running) startSnake(); }
    } else if (state.screen === "study" && !$("#tab-cards").hidden && document.activeElement !== $("#ref-search")) {
      if (k === " ") { e.preventDefault(); $("#flashcard").classList.toggle("flipped"); }
      else if (k === "ArrowRight") $("#fc-next").click();
      else if (k === "ArrowLeft") $("#fc-prev").click();
    }
  });

  // ---------- Init ----------
  $("#binary-bg").textContent = Array.from({ length: 6000 }, () => (Math.random() < 0.5 ? "0" : "1")).join("");
  renderDeckUI();
  show("menu");
})();
