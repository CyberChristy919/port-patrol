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
    session: { games: 0, answered: 0, correct: 0, bestRush: 0, bestBlitz: 0, bestMatch: null },
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
  }
  function stopAll() { stopRush(); stopBlitz(); stopMatchTimer(); }

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
    $("#res-missed").innerHTML = uniq.map((p) => `<li><b>${portStr(p)}</b><div><strong>${p.name}</strong> <span>· ${p.proto} · ${p.tip}</span></div></li>`).join("");
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
      [s.bestMatch ? s.bestMatch.toFixed(1) + "s" : "—", "best Patch Panel"],
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
    fb.innerHTML = `<div>${ok ? "Correct." : "Not quite."} <b>${q.item.name}</b> → <b>${portStr(q.item)}</b> (${q.item.proto})</div>${wrongNote}<p>${q.item.tip}</p>`;
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
      ["ftp", "sftp"], ["telnet", "ssh"], ["http", "https"], ["smtp", "smtps"], ["ldap", "ldaps"], ["pop3", "pop3s"], ["imap", "imaps"],
    ].map(([a, b]) => [byId[a], byId[b]]);
    const extra = [
      [{ name: "SIP", p: "5060" }, { name: "SIP-TLS", p: "5061" }],
      [{ name: "SNMPv1/v2c", p: "161/162" }, { name: "SNMPv3", p: "161/162" }],
      [{ name: "FTP", p: "20/21" }, { name: "FTPS", p: "989/990" }],
    ];
    const card = (a, b) => `<div class="pair"><div class="ins"><b>${a.p}</b><span>${a.name}</span></div><div class="arrow">→</div><div class="sec"><b>${b.p}</b><span>${b.name}</span></div></div>`;
    $("#pairs").innerHTML = pairs.map(([a, b]) => card({ name: a.name, p: portStr(a) }, { name: b.name, p: portStr(b) })).join("") + extra.map(([a, b]) => card(a, b)).join("");
  }
  function setTab(t) {
    $$(".tab").forEach((b) => { const on = b.dataset.tab === t; b.classList.toggle("active", on); b.setAttribute("aria-selected", on); });
    ["cards", "table", "pairs"].forEach((k) => ($(`#tab-${k}`).hidden = k !== t));
  }

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
    const tab = e.target.closest(".tab");
    if (tab) return setTab(tab.dataset.tab);
  });
  $("#deck").addEventListener("change", (e) => setDeck(e.target.value));
  $("#mute").addEventListener("click", () => { state.muted = !state.muted; $("#mute").classList.toggle("muted", state.muted); });
  $("#q-next").addEventListener("click", nextQuiz);
  $("#rush-start").addEventListener("click", startRush);
  $("#blitz-start").addEventListener("click", startBlitz);
  $("#b-form").addEventListener("submit", (e) => { e.preventDefault(); submitBlitz(false); });
  $("#b-input").addEventListener("input", (e) => { e.target.value = e.target.value.replace(/\D/g, ""); });
  $("#flashcard").addEventListener("click", () => $("#flashcard").classList.toggle("flipped"));
  $("#fc-next").addEventListener("click", () => { study.i = (study.i + 1) % study.cards.length; renderCard(); });
  $("#fc-prev").addEventListener("click", () => { study.i = (study.i - 1 + study.cards.length) % study.cards.length; renderCard(); });
  $("#fc-shuffle").addEventListener("click", () => { study.cards = shuffle(study.cards); study.i = 0; renderCard(); });
  $("#fc-flipside").addEventListener("click", (e) => { study.svcFirst = !study.svcFirst; e.target.textContent = study.svcFirst ? "Show port first" : "Show service first"; renderCard(); });
  $("#ref-search").addEventListener("input", (e) => renderTable(e.target.value));

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
    } else if (state.screen === "study" && !$("#tab-cards").hidden && document.activeElement !== $("#ref-search")) {
      if (k === " ") { e.preventDefault(); $("#flashcard").classList.toggle("flipped"); }
      else if (k === "ArrowRight") $("#fc-next").click();
      else if (k === "ArrowLeft") $("#fc-prev").click();
    }
  });

  // ---------- Init ----------
  renderDeckUI();
  show("menu");
})();
