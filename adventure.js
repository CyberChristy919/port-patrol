// Packet's Port Adventure: a side-scrolling platformer for learning port numbers.
// Packet is an original character: a little data packet with suction-cup hands that
// can stick to walls and climb. Each level has port doors; only the right port opens the path.
(() => {
  "use strict";
  const PP = window.PP;
  if (!PP) return;
  const $ = (s) => document.querySelector(s);
  const T = 32, H = 17;

  // ---------- Level builder ----------
  function makeLevel(def) {
    const W = def.w;
    const grid = Array.from({ length: H }, () => Array(W).fill(" "));
    const bar = Array.from({ length: H }, () => Array(W).fill(-1));
    const L = { name: def.name, sub: def.sub, theme: def.theme, W, grid, bar, doors: [], items: [], enemies: [], signs: [], checks: [], start: { x: 2, y: 13 }, exit: { x: W - 4, y: 13 }, clusters: 0, boss: null, bossWall: [] };
    const set = (x, y, c) => { if (x >= 0 && x < W && y >= 0 && y < H) grid[y][x] = c; };
    const api = {
      ground: (x0, x1, top = 14) => { for (let x = x0; x <= x1; x++) for (let y = top; y < H; y++) set(x, y, "#"); },
      block: (x0, x1, y0, y1) => { for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) set(x, y, "#"); },
      plat: (x0, x1, y) => { for (let x = x0; x <= x1; x++) set(x, y, "-"); },
      spikes: (x0, x1, y) => { for (let x = x0; x <= x1; x++) set(x, y, "^"); },
      bits: (x0, x1, y) => { for (let x = x0; x <= x1; x++) L.items.push({ type: "bit", x, y }); },
      heart: (x, y) => L.items.push({ type: "heart", x, y }),
      scroll: (x, y) => L.items.push({ type: "scroll", x, y }),
      check: (x, y = 13) => L.checks.push({ x, y, on: false }),
      start: (x, y = 13) => { L.start = { x, y }; },
      exit: (x, y = 13) => { L.exit = { x, y }; },
      sign: (x, y, text) => L.signs.push({ x, y, text }),
      doors: (c, xs, y = 13) => { xs.forEach((x) => L.doors.push({ c, x, y })); L.clusters = Math.max(L.clusters, c + 1); },
      barrier: (c, x, yb = 13) => { for (let y = 0; y <= yb; y++) bar[y][x] = c; },
      worm: (x, y = 13) => L.enemies.push({ type: "worm", x, y }),
      phish: (x, y0, y1) => L.enemies.push({ type: "phish", x, y0, y1 }),
      boss: (x, y = 12) => { L.boss = { x, y }; },
      bossWall: (x, yb = 13) => { for (let y = 0; y <= yb; y++) L.bossWall.push([x, y]); },
    };
    def.build(api);
    return L;
  }

  const LEVELS = [
    { name: "Router Ridge", sub: "Learn to run, jump, and stick", theme: "#4d4dff", w: 96, build(b) {
      b.ground(0, 11); b.ground(14, 52); b.ground(56, 95);
      b.start(2);
      b.sign(4, 13, "Move with the arrow keys or A and D. Jump with Space.");
      b.bits(6, 10, 13); b.bits(12, 13, 11);
      b.block(18, 19, 12, 13); b.block(21, 22, 12, 13);
      b.sign(24, 13, "Tall wall? Jump into it and hold toward it. Your suction cups stick. Press Up to climb.");
      b.block(27, 33, 7, 13); b.bits(28, 32, 6);
      b.check(37);
      b.sign(40, 13, "Worms are malware. Jump on them to squash them.");
      b.worm(45); b.worm(50);
      b.bits(53, 55, 11);
      b.scroll(58, 13);
      b.sign(59, 13, "Find the door with the right port number, then press Up to deliver the packet.");
      b.doors(0, [62, 65, 68]); b.barrier(0, 71);
      b.plat(74, 77, 10); b.bits(74, 77, 9); b.bits(80, 87, 13);
      b.exit(91);
    } },
    { name: "Inbox Caverns", sub: "Low ceilings and hungry worms", theme: "#ff008c", w: 120, build(b) {
      b.block(0, 119, 0, 1);
      b.ground(0, 24); b.ground(28, 45); b.ground(56, 119);
      b.spikes(25, 27, 16);
      b.start(2);
      b.bits(5, 10, 13);
      b.block(14, 22, 2, 10); b.bits(15, 21, 13);
      b.worm(33); b.worm(41);
      b.plat(46, 49, 12); b.plat(51, 54, 10); b.bits(46, 49, 11); b.bits(51, 54, 9);
      b.check(58); b.scroll(59, 13);
      b.doors(0, [62, 65, 68]); b.barrier(0, 71);
      b.block(75, 76, 6, 13); b.bits(75, 76, 5);
      b.worm(80); b.heart(78, 13);
      b.check(84); b.scroll(86, 13);
      b.doors(1, [90, 93, 96]); b.barrier(1, 99);
      b.worm(105); b.bits(102, 110, 13);
      b.exit(114);
    } },
    { name: "Wi-Fi Woods", sub: "Firewall spikes and phishing hooks", theme: "#ffec01", w: 130, build(b) {
      b.ground(0, 40); b.ground(44, 72); b.ground(76, 129);
      b.spikes(73, 75, 16);
      b.start(2);
      b.sign(7, 13, "Pink spikes are a firewall. Don't touch them.");
      b.block(12, 13, 6, 13); b.bits(12, 13, 5);
      b.spikes(22, 24, 13); b.bits(22, 24, 10);
      b.sign(28, 13, "Phishing hooks bob up and down. Don't take the bait.");
      b.phish(33, 3, 12);
      b.check(38);
      b.block(48, 49, 4, 13); b.bits(48, 49, 3);
      b.scroll(53, 13);
      b.doors(0, [56, 59, 62]); b.barrier(0, 65);
      b.phish(69, 4, 12);
      b.check(78); b.worm(82); b.worm(87);
      b.heart(80, 13);
      b.scroll(89, 13);
      b.doors(1, [92, 95, 98]); b.barrier(1, 101);
      b.phish(107, 3, 12); b.spikes(112, 113, 13);
      b.bits(115, 121, 13);
      b.exit(125);
    } },
    { name: "Cloud Climb", sub: "Big walls and floating platforms", theme: "#4d4dff", w: 112, build(b) {
      b.ground(0, 50); b.ground(65, 111);
      b.start(2);
      b.block(15, 16, 3, 13); b.scroll(16, 2); b.bits(15, 15, 2);
      b.spikes(19, 21, 13);
      b.doors(0, [25, 27, 29]); b.barrier(0, 31);
      b.check(34); b.worm(40); b.worm(46);
      b.plat(52, 54, 12); b.plat(57, 59, 10); b.plat(61, 63, 12);
      b.bits(52, 54, 11); b.bits(57, 59, 9); b.bits(61, 63, 11);
      b.phish(58, 2, 6);
      b.check(67); b.scroll(68, 13);
      b.doors(1, [71, 74, 77]); b.barrier(1, 80);
      b.block(83, 84, 5, 13); b.bits(83, 84, 4);
      b.worm(88); b.heart(87, 13);
      b.check(91); b.scroll(93, 13);
      b.doors(2, [96, 99, 102]); b.barrier(2, 105);
      b.exit(108);
    } },
    { name: "The Gateway", sub: "Boss: the Man-in-the-Middle", theme: "#ff008c", w: 100, build(b) {
      b.ground(0, 43); b.ground(47, 99);
      b.start(2);
      b.worm(10); b.worm(16); b.bits(8, 16, 12);
      b.spikes(20, 22, 13);
      b.phish(26, 3, 12);
      b.check(28); b.scroll(30, 13);
      b.doors(0, [33, 36, 39]); b.barrier(0, 42);
      b.block(50, 51, 6, 13); b.bits(50, 51, 5);
      b.check(54); b.scroll(55, 13);
      b.doors(1, [58, 61, 64]); b.barrier(1, 67);
      b.check(69); b.heart(70, 13);
      b.sign(71, 13, "The Man-in-the-Middle has Packet's parents. Jump on his head three times.");
      b.plat(74, 77, 10); b.plat(85, 88, 10);
      b.boss(84);
      b.bossWall(93);
      b.exit(96);
    } },
  ].map(makeLevel);

  // Ports that fit Episode 1 (the home network): web, email, file transfer, naming, remote access
  const EP1 = ["http", "https", "dns", "dhcp", "smtp", "smtps", "smtpssl", "pop3", "pop3s", "imap", "imaps", "ftp", "sftp", "ssh", "telnet", "ntp", "tftp", "httpalt", "rdp"];

  // ---------- State ----------
  const keys = { left: false, right: false, up: false, down: false, jump: false };
  let prevUp = false, prevJump = false, prevDown = false;
  const taps = { up: false, jump: false, down: false }; // quick taps between physics steps still count
  const A = { running: false, paused: false, over: false, raf: 0, last: 0, acc: 0, lvl: 0, L: null, sel: 0 };
  const view = { vw: 30, tile: 32, scale: 1, dpr: 1 };
  let p = null, cam = { x: 0 }, run = null, parts = [], bg = [];

  const cvs = () => $("#adv-canvas");
  const progress = () => PP.progress();
  const unlocked = () => Math.min(LEVELS.length, (progress().plat || 0) + 1);

  // ---------- Layout ----------
  function size() {
    const wrap = $("#adv-wrap");
    if (!wrap) return;
    const w = wrap.clientWidth || 960;
    const availH = Math.max(300, window.innerHeight - 300);
    let tile = Math.min(w / 30, availH / H, 40);
    if (tile < 22) tile = Math.min(22, w / 12);
    view.tile = tile;
    view.vw = Math.max(12, Math.min(30, Math.floor(w / tile)));
    view.dpr = Math.min(2, window.devicePixelRatio || 1);
    view.scale = (tile / T) * view.dpr;
    const c = cvs();
    c.width = Math.round(view.vw * tile * view.dpr);
    c.height = Math.round(H * tile * view.dpr);
    c.style.width = Math.round(view.vw * tile) + "px";
    c.style.height = Math.round(H * tile) + "px";
  }

  // ---------- Level select ----------
  function renderLevels() {
    const u = unlocked(), cleared = progress().plat || 0;
    $("#adv-levels").innerHTML = LEVELS.map((L, i) => {
      const locked = i >= u, done = i < cleared;
      return `<button type="button" class="adv-lv${locked ? " locked" : ""}${done ? " done" : ""}${i === A.sel ? " sel" : ""}" data-lv="${i}" ${locked ? "disabled" : ""}>
        <span class="mono adv-lv-n">1-${i + 1}</span><b>${PP.esc(L.name)}</b><span class="adv-lv-s">${locked ? "Locked" : done ? "Cleared" : PP.esc(L.sub)}</span></button>`;
    }).join("");
  }
  function overlay(mode) {
    const ov = $("#adv-overlay");
    ov.hidden = false;
    $("#adv-levels").hidden = mode !== "select";
    $("#adv-story").hidden = mode !== "select";
    if (mode === "select") {
      $("#adv-ov-title").textContent = "Packet's Port Adventure";
      $("#adv-ov-text").textContent = "Packet's family was routing to the cloud when a lightning strike knocked their ship offline inside a home network. The Man-in-the-Middle grabbed Packet's parents. Deliver each packet to the right port to open the path.";
      $("#adv-start").innerHTML = `Play 1-${A.sel + 1} <kbd>Enter</kbd>`;
      renderLevels();
    } else if (mode === "pause") {
      $("#adv-ov-title").textContent = "Paused";
      $("#adv-ov-text").textContent = "Press P or Resume to keep going.";
      $("#adv-start").innerHTML = "Resume <kbd>P</kbd>";
    }
    $("#adv-start").focus({ preventScroll: true });
  }
  function open() {
    PP.show("adventure");
    size();
    const u = unlocked();
    A.sel = Math.min(A.sel, u - 1);
    if (A.justCleared != null) { A.sel = Math.min(A.justCleared + 1, u - 1); A.justCleared = null; }
    A.running = false; A.paused = false; A.over = false;
    loadLevel(A.sel);
    draw();
    overlay("select");
  }

  // ---------- Level setup ----------
  function loadLevel(i) {
    A.lvl = i;
    const L = LEVELS[i];
    A.L = L;
    let pool = PP.deckItems().filter((it) => EP1.includes(it.id));
    if (pool.length < 6) pool = PP.deckItems();
    pool = PP.shuffle(pool);
    const targets = [];
    for (let c = 0; c < L.clusters; c++) targets.push(pool[c % pool.length]);
    const doors = [];
    for (let c = 0; c < L.clusters; c++) {
      const ds = L.doors.filter((d) => d.c === c);
      const item = targets[c];
      const decoys = PP.distractors(item, PP.deckItems(), ds.length - 1);
      const opts = PP.shuffle([{ item, port: PP.pick(item.ports), ok: true }, ...decoys.map((d) => ({ item: d, port: PP.pick(d.ports), ok: false }))]);
      ds.forEach((d, k) => doors.push({ ...d, ...opts[k], broken: false }));
    }
    run = {
      targets, doors, solved: Array(L.clusters).fill(false), solveT: Array(L.clusters).fill(0), cur: 0,
      items: L.items.map((it) => ({ ...it, taken: false })),
      checks: L.checks.map((c) => ({ ...c, on: false })),
      enemies: L.enemies.map((e) => e.type === "worm"
        ? { type: "worm", x: e.x * T + 2, y: (e.y + 1) * T - 16, w: 28, h: 16, vx: -45, alive: true, t: Math.random() * 6 }
        : { type: "phish", cx: e.x * T + T / 2, y0: e.y0 * T, y1: e.y1 * T, x: e.x * T + 6, y: e.y0 * T, w: 20, h: 22, t: Math.random() * 6, alive: true }),
      boss: L.boss ? { x: L.boss.x * T, y: (L.boss.y + 2) * T - 64, w: 52, h: 64, vx: -80, vy: 0, hp: 3, inv: 0, jumpT: 2, alive: true, deadT: 0, onGround: false } : null,
      bossDead: !L.boss,
      score: 0, bits: 0, bitsTotal: L.items.filter((it) => it.type === "bit").length,
      wrong: 0, firstTry: 0, hurt: 0, missed: [], time: 0, toastT: 0, clearT: 0, failT: 0,
      spawn: { x: L.start.x * T + 5, y: (L.start.y + 1) * T - 28 },
    };
    p = { x: run.spawn.x, y: run.spawn.y, w: 22, h: 28, vx: 0, vy: 0, face: 1, ground: false, cling: 0, coyote: 0, buffer: 0, lock: 0, mantle: 0, knock: 0, inv: 0, hearts: 3, drop: 0, anim: 0, squash: 0 };
    cam.x = 0;
    parts = [];
    // background towers (deterministic per level)
    let seed = 1234 + i * 99;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    bg = [];
    for (let x = 0; x < L.W * T * 0.6 + 1200; x += 70 + rnd() * 90) bg.push({ x, w: 40 + rnd() * 50, h: 120 + rnd() * 220, leds: Array.from({ length: 6 }, () => [rnd(), rnd(), rnd() < 0.33 ? 0 : rnd() < 0.5 ? 1 : 2]) });
    updateHud();
  }
  function start(i) {
    if (i >= unlocked()) return;
    A.sel = i;
    size();
    loadLevel(i);
    $("#adv-overlay").hidden = true;
    A.running = true; A.paused = false; A.over = false;
    Object.keys(keys).forEach((k) => (keys[k] = false));
    A.last = performance.now(); A.acc = 0;
    cancelAnimationFrame(A.raf);
    A.raf = requestAnimationFrame(loop);
    toast(`Level 1-${i + 1}: ${LEVELS[i].name}`, false);
  }
  function pause(force) {
    if (!A.running || A.over) return;
    A.paused = force != null ? force : !A.paused;
    Object.keys(keys).forEach((k) => (keys[k] = false));
    if (A.paused) overlay("pause");
    else { $("#adv-overlay").hidden = true; A.last = performance.now(); A.raf = requestAnimationFrame(loop); }
  }
  function stop() {
    A.running = false; cancelAnimationFrame(A.raf);
    const t = $("#a-toast"); if (t) t.hidden = true;
  }

  // ---------- HUD ----------
  function updateHud() {
    if (!run) return;
    $("#a-level").textContent = `1-${A.lvl + 1}`;
    $("#a-score").textContent = run.score;
    $("#a-bits").textContent = `${run.bits}/${run.bitsTotal}`;
    $("#a-hearts").innerHTML = [0, 1, 2].map((i) => `<i class="${i < p.hearts ? "" : "lost"}"></i>`).join("");
    const tgt = run.targets[run.cur];
    if (tgt) {
      $("#a-label").textContent = "Deliver the packet to the port for";
      $("#a-name").textContent = tgt.name;
      $("#a-sub").textContent = `${tgt.full} · ${tgt.proto}`;
    } else {
      $("#a-label").textContent = run.bossDead ? "Path is open" : "Boss fight";
      $("#a-name").textContent = run.bossDead ? (A.lvl === LEVELS.length - 1 ? "Rescue your family" : "Reach the exit") : "Man-in-the-Middle";
      $("#a-sub").textContent = run.bossDead ? "Head for the exit portal on the right." : "Jump on his head three times.";
    }
  }
  function toast(text, bad) {
    const t = $("#a-toast");
    t.textContent = text;
    t.className = "snake-toast mono adv-toast" + (bad ? " bad" : "");
    t.hidden = false;
    clearTimeout(run && run.toastT);
    if (run) run.toastT = setTimeout(() => (t.hidden = true), bad ? 3200 : 2200);
  }

  // ---------- Tiles ----------
  function tileAt(tx, ty) { return ty < 0 || ty >= H || tx < 0 || tx >= A.L.W ? "" : A.L.grid[ty][tx]; }
  function barrierOn(tx, ty) { if (ty < 0 || ty >= H || tx < 0 || tx >= A.L.W) return false; const c = A.L.bar[ty][tx]; return c >= 0 && !run.solved[c]; }
  function bossWallOn(tx, ty) { return !run.bossDead && A.L.bossWall.some(([x, y]) => x === tx && y === ty); }
  function solid(tx, ty) {
    if (tx < 0 || tx >= A.L.W || ty < 0) return true;
    if (ty >= H) return false;
    return A.L.grid[ty][tx] === "#" || barrierOn(tx, ty) || bossWallOn(tx, ty);
  }
  function oneway(tx, ty) { return tileAt(tx, ty) === "-"; }

  // Move a body with tile collision. Returns flags.
  function moveBody(b, dx, dy, useOneway) {
    const out = { wallL: false, wallR: false, ground: false, ceil: false };
    if (dx) {
      b.x += dx;
      const r0 = Math.floor(b.y / T), r1 = Math.floor((b.y + b.h - 0.01) / T);
      if (dx > 0) {
        const c = Math.floor((b.x + b.w - 0.01) / T);
        for (let r = r0; r <= r1; r++) if (solid(c, r)) { b.x = c * T - b.w; out.wallR = true; break; }
      } else {
        const c = Math.floor(b.x / T);
        for (let r = r0; r <= r1; r++) if (solid(c, r)) { b.x = (c + 1) * T; out.wallL = true; break; }
      }
    }
    if (dy) {
      const prevBottom = b.y + b.h;
      b.y += dy;
      const c0 = Math.floor(b.x / T), c1 = Math.floor((b.x + b.w - 0.01) / T);
      if (dy > 0) {
        const r = Math.floor((b.y + b.h - 0.01) / T);
        for (let c = c0; c <= c1; c++) {
          if (solid(c, r) || (useOneway && oneway(c, r) && prevBottom <= r * T + 0.5)) { b.y = r * T - b.h; out.ground = true; break; }
        }
      } else {
        const r = Math.floor(b.y / T);
        for (let c = c0; c <= c1; c++) if (solid(c, r)) { b.y = (r + 1) * T; out.ceil = true; break; }
      }
    }
    return out;
  }
  function wallBeside(d, yA, yB) {
    const x = d > 0 ? p.x + p.w + 1 : p.x - 1;
    const c = Math.floor(x / T);
    return [yA, yB].map((y) => solid(c, Math.floor(y / T)));
  }

  // ---------- Physics ----------
  const G = 2000, JUMP = 640, RUN = 210, MAXFALL = 760, CLIMB = 125;
  function step(dt) {
    run.time += dt;
    const upEdge = (keys.up && !prevUp) || taps.up, jumpEdge = (keys.jump && !prevJump) || taps.jump, downEdge = (keys.down && !prevDown) || taps.down;
    taps.up = taps.jump = taps.down = false;
    prevUp = keys.up; prevJump = keys.jump; prevDown = keys.down;
    if (run.clearT || run.failT) { stepEnd(dt); return; }

    p.inv = Math.max(0, p.inv - dt); p.lock = Math.max(0, p.lock - dt); p.knock = Math.max(0, p.knock - dt);
    p.mantle = Math.max(0, p.mantle - dt); p.drop = Math.max(0, p.drop - dt);
    p.coyote = p.ground ? 0.09 : Math.max(0, p.coyote - dt);
    p.buffer = jumpEdge ? 0.12 : Math.max(0, p.buffer - dt);
    p.squash = Math.max(0, p.squash - dt * 4);
    let dir = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
    if (p.lock > 0 && dir === -p.cling) dir = 0;

    if (p.cling) {
      // Suction-cup hands: stuck to the wall until you jump, climb off the top, or push away
      p.vx = 0;
      if (dir === -p.cling) { p.cling = 0; p.vx = dir * 120; }
      else if (p.buffer > 0) {
        p.buffer = 0;
        p.vx = -p.cling * 250; p.vy = -600; p.face = -p.cling; p.lock = 0.16; p.cling = 0; PP.beep("tick");
      } else {
        p.vy = keys.up ? -CLIMB : keys.down ? CLIMB * 1.3 : 0;
        const f = moveBody(p, 0, p.vy * dt, false);
        const [top, bot] = wallBeside(p.cling, p.y + 3, p.y + p.h - 3);
        if (f.ground) { p.cling = 0; p.ground = true; }
        else if (!top && bot && keys.up) { p.mantle = 0.22; p.vy = -360; p.vx = p.cling * 150; p.cling = 0; }
        else if (!top && !bot) p.cling = 0;
        p.anim += dt * (p.vy ? 8 : 0);
      }
    }
    if (!p.cling) {
      if (p.mantle > 0) p.vx = Math.sign(p.vx || p.face) * 150;
      else if (p.knock > 0) { /* knocked back, no control */ }
      else {
        const target = dir * RUN, accel = p.ground ? (dir ? 2400 : 2800) : 1500;
        if (p.vx < target) p.vx = Math.min(target, p.vx + accel * dt);
        else if (p.vx > target) p.vx = Math.max(target, p.vx - accel * dt);
        if (dir) p.face = dir;
      }
      if (p.buffer > 0 && p.coyote > 0) { p.vy = -JUMP; p.buffer = 0; p.coyote = 0; p.ground = false; p.squash = 1; PP.beep("tick"); }
      if (!keys.jump && p.vy < -260 && p.knock <= 0 && p.mantle <= 0) p.vy = -260; // short hop when jump is released
      p.vy = Math.min(MAXFALL, p.vy + G * dt);
      if (downEdge && p.ground) {
        const r = Math.floor((p.y + p.h + 2) / T);
        if (oneway(Math.floor((p.x + 2) / T), r) || oneway(Math.floor((p.x + p.w - 2) / T), r)) p.drop = 0.22;
      }
      const fx = moveBody(p, p.vx * dt, 0, false);
      if (fx.wallL || fx.wallR) p.vx = 0;
      const wasGround = p.ground;
      const fy = moveBody(p, 0, p.vy * dt, p.drop <= 0);
      if (fy.ground) { if (!wasGround && p.vy > 300) p.squash = 0.7; p.vy = 0; p.ground = true; } else p.ground = false;
      if (fy.ceil) p.vy = Math.max(0, p.vy);
      // Start clinging when airborne and pushing into a wall
      if (!p.ground && dir && p.knock <= 0 && p.mantle <= 0) {
        const [top, bot] = wallBeside(dir, p.y + 3, p.y + p.h - 3);
        if (top && bot) { p.cling = dir; p.face = dir; p.vy = 0; p.vx = 0; }
      }
      p.anim += dt * (p.ground ? Math.abs(p.vx) / 30 : 0);
    }

    // Fell into a pit
    if (p.y > H * T + 60) { hurt(0, true); }

    stepWorld(dt, upEdge);
    // Camera
    const vwPx = view.vw * T;
    const want = Math.max(0, Math.min(A.L.W * T - vwPx, p.x + p.w / 2 - vwPx * 0.42 + p.face * 30));
    cam.x += (want - cam.x) * Math.min(1, dt * 7);
  }

  const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

  function stepWorld(dt, upEdge) {
    // Hazards: firewall spikes
    const c0 = Math.floor((p.x + 3) / T), c1 = Math.floor((p.x + p.w - 3) / T), r0 = Math.floor(p.y / T), r1 = Math.floor((p.y + p.h - 1) / T);
    for (let c = c0; c <= c1; c++) for (let r = r0; r <= r1; r++) {
      if (tileAt(c, r) === "^" && p.y + p.h > r * T + 14) { hurt(p.vx >= 0 ? -1 : 1); }
    }
    // Items
    for (const it of run.items) {
      if (it.taken) continue;
      const box = { x: it.x * T + 6, y: it.y * T + 6, w: 20, h: 20 };
      if (!overlap(p, box)) continue;
      it.taken = true;
      if (it.type === "bit") { run.bits++; run.score += 10; burst(box.x + 10, box.y + 10, "#FFEC01", 5); PP.beep("tick"); }
      else if (it.type === "heart") {
        if (p.hearts < 3) p.hearts++; else run.score += 50;
        burst(box.x + 10, box.y + 10, "#FF008C", 10); PP.beep("ok");
      } else if (it.type === "scroll") {
        run.score += 25; PP.beep("ok");
        const tgt = run.targets[run.cur];
        const trick = tgt && PP.trickFor(tgt);
        toast(tgt ? (trick ? `Memory trick for ${tgt.name}: ${trick}` : `${tgt.name}: ${tgt.tip}`) : "Memory scroll: +25", false);
        burst(box.x + 10, box.y + 10, "#8792ff", 10);
      }
      updateHud();
    }
    // Checkpoints
    for (const ck of run.checks) {
      if (ck.on) continue;
      if (overlap(p, { x: ck.x * T + 6, y: (ck.y - 1) * T, w: 20, h: T * 2 })) {
        run.checks.forEach((o) => { if (o.x < ck.x) o.on = true; });
        ck.on = true; run.spawn = { x: ck.x * T + 5, y: (ck.y + 1) * T - 28 };
        toast("Checkpoint saved", false); PP.beep("ok");
      }
    }
    // Doors
    run.near = null;
    for (const d of run.doors) {
      if (d.broken || run.solved[d.c]) continue;
      const box = { x: d.x * T + 2, y: (d.y - 1) * T, w: T - 4, h: T * 2 };
      if (overlap(p, box) && p.ground) { run.near = d; break; }
    }
    if (run.near && upEdge) enterDoor(run.near);
    for (let c = 0; c < run.solveT.length; c++) if (run.solveT[c] > 0) run.solveT[c] = Math.max(0, run.solveT[c] - dt);

    // Enemies
    for (const e of run.enemies) {
      if (!e.alive) { e.dead = (e.dead || 0) + dt; continue; }
      e.t += dt;
      if (e.type === "worm") {
        const front = e.vx > 0 ? e.x + e.w + 1 : e.x - 1;
        const fc = Math.floor(front / T), row = Math.floor((e.y + e.h / 2) / T), below = Math.floor((e.y + e.h + 2) / T);
        if (solid(fc, row) || !(solid(fc, below) || oneway(fc, below))) e.vx = -e.vx;
        e.x += e.vx * dt;
      } else {
        const k = (Math.sin(e.t * 1.7) + 1) / 2;
        e.y = e.y0 + (e.y1 - e.y0) * k; e.x = e.cx - 10;
      }
      if (!overlap(p, e) || run.failT) continue;
      if (e.type === "worm" && p.vy > 40 && p.y + p.h - e.y < 18) {
        e.alive = false; p.vy = -440; p.ground = false; run.score += 50; burst(e.x + 14, e.y + 8, "#FF008C", 12); PP.beep("ok"); updateHud();
      } else hurt(p.x + p.w / 2 < e.x + e.w / 2 ? -1 : 1);
    }
    // Boss
    const B = run.boss;
    if (B && B.alive) stepBoss(B, dt);
    else if (B && !B.alive) B.deadT += dt;

    // Exit
    const ex = { x: A.L.exit.x * T - 4, y: (A.L.exit.y - 1) * T, w: T + 8, h: T * 2 };
    if (run.bossDead && run.solved.every(Boolean) && overlap(p, ex)) clearLevel();
  }

  function stepBoss(B, dt) {
    B.inv = Math.max(0, B.inv - dt);
    B.jumpT -= dt;
    const speed = 80 + (3 - B.hp) * 45;
    B.vx = Math.sign(B.vx || -1) * speed;
    if (B.onGround && B.jumpT <= 0) { B.vy = -620 - (3 - B.hp) * 60; B.jumpT = 1.6 + Math.random() * 1.2; B.vx = Math.sign(p.x - B.x) * speed; }
    B.vy = Math.min(MAXFALL, B.vy + G * dt);
    const fx = moveBody(B, B.vx * dt, 0, false);
    if (fx.wallL || fx.wallR) B.vx = -B.vx;
    // stay inside the arena
    const arenaL = 69 * T, arenaR = 92 * T;
    if (B.x < arenaL) { B.x = arenaL; B.vx = Math.abs(B.vx); }
    if (B.x + B.w > arenaR) { B.x = arenaR - B.w; B.vx = -Math.abs(B.vx); }
    const fy = moveBody(B, 0, B.vy * dt, true);
    B.onGround = fy.ground; if (fy.ground) B.vy = 0;
    if (!overlap(p, B) || run.failT) return;
    if (p.vy > 40 && p.y + p.h - B.y < 22 && B.inv <= 0) {
      B.hp--; B.inv = 1.1; p.vy = -620; p.ground = false; run.score += 150;
      burst(B.x + B.w / 2, B.y + 6, "#FFEC01", 18); PP.beep("ok");
      if (B.hp <= 0) {
        B.alive = false; run.bossDead = true; run.score += 500; PP.beep("win");
        toast("Man-in-the-Middle defeated. Connection secured.", false);
        burst(B.x + B.w / 2, B.y + B.h / 2, "#FF008C", 40);
      } else toast(`Direct hit. ${B.hp} to go.`, false);
      updateHud();
    } else if (B.inv <= 0.6) hurt(p.x + p.w / 2 < B.x + B.w / 2 ? -1 : 1);
  }

  function enterDoor(d) {
    const tgt = run.targets[d.c];
    if (d.c !== run.cur) return;
    if (d.ok) {
      PP.track(true, tgt.id);
      const first = !run.doors.some((o) => o.c === d.c && o.broken);
      if (first) run.firstTry++;
      run.score += first ? 150 : 100;
      run.solved[d.c] = true; run.solveT[d.c] = 0.6; run.cur++;
      PP.beep("win");
      const trick = PP.trickFor(tgt);
      toast(`${tgt.name} = ${PP.portStr(tgt)}. Path unlocked.${trick ? " " + trick : ""}`, false);
      burst(d.x * T + T / 2, d.y * T, "#FFEC01", 24);
    } else {
      PP.track(false, tgt.id);
      d.broken = true; run.wrong++;
      if (!run.missed.includes(tgt.id)) run.missed.push(tgt.id);
      PP.beep("bad");
      toast(`${d.port} is ${d.item.name}. ${tgt.name} is ${PP.portStr(tgt)}.`, true);
      hurt(0, false, true);
    }
    updateHud();
  }

  function hurt(knockDir, pit, door) {
    if (!pit && p.inv > 0) return;
    p.hearts--; run.hurt++;
    PP.beep("bad");
    const wrap = $("#adv-wrap"); wrap.classList.remove("hit"); void wrap.offsetWidth; wrap.classList.add("hit"); setTimeout(() => wrap.classList.remove("hit"), 400);
    updateHud();
    if (p.hearts <= 0) return fail(pit ? "Lost in a pit." : door ? "Too many wrong ports." : "Connection lost.");
    p.inv = 1.5;
    if (pit) { p.x = run.spawn.x; p.y = run.spawn.y; p.vx = 0; p.vy = 0; p.cling = 0; cam.x = Math.max(0, p.x - view.vw * T * 0.4); toast("Packet dropped. Back to the checkpoint.", true); }
    else if (!door) { p.cling = 0; p.vy = -360; p.vx = knockDir * 220; p.knock = 0.28; p.ground = false; }
  }
  function fail(reason) {
    run.failT = 0.0001; run.failReason = reason;
    p.cling = 0; p.vy = -520; p.vx = 0;
  }
  function clearLevel() {
    run.clearT = 0.0001;
    run.score += p.hearts * 100;
    PP.beep("win");
    const P = progress();
    P.plat = Math.max(P.plat || 0, A.lvl + 1);
    toast(A.lvl === LEVELS.length - 1 ? "Family rescued. Episode 1 complete." : `Level clear: ${A.L.name}`, false);
    burst(p.x + p.w / 2, p.y, "#FFEC01", 30);
    updateHud();
  }
  function stepEnd(dt) {
    if (run.failT) {
      run.failT += dt; p.vy += G * dt; p.y += p.vy * dt;
      if (run.failT > 1.4) finish(false);
    } else {
      run.clearT += dt;
      if (run.clearT > 1.6) finish(true);
    }
    stepParts(dt);
  }
  function finish(cleared) {
    if (A.over) return;
    A.over = true; A.running = false; cancelAnimationFrame(A.raf);
    const L = A.L, last = A.lvl === LEVELS.length - 1;
    if (cleared) A.justCleared = A.lvl; else A.sel = A.lvl;
    const delivered = run.solved.filter(Boolean).length;
    PP.setBest(run.score);
    PP.showResults({
      mode: "Packet's Port Adventure",
      title: cleared ? (last ? "Family rescued. Episode 1 complete." : `Level 1-${A.lvl + 1} clear: ${L.name}.`) : `${run.failReason} Try level 1-${A.lvl + 1} again.`,
      stats: [[run.score, "score"], [`${delivered}/${L.clusters}`, "ports delivered"], [`${run.bits}/${run.bitsTotal}`, "data bits"], [Math.max(0, p.hearts), "hearts left"]],
      missed: run.missed,
      g: { mode: "adventure", level: A.lvl + 1, cleared, wrong: run.wrong, gates: L.clusters, hurt: run.hurt, bits: run.bits, bitsTotal: run.bitsTotal, score: run.score },
    });
  }

  // ---------- Particles ----------
  function burst(x, y, color, n) {
    for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, s = 60 + Math.random() * 180; parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 80, life: 0.6 + Math.random() * 0.4, color }); }
  }
  function stepParts(dt) {
    parts.forEach((q) => { q.life -= dt; q.vy += 600 * dt; q.x += q.vx * dt; q.y += q.vy * dt; });
    parts = parts.filter((q) => q.life > 0);
  }

  // ---------- Loop ----------
  function loop(now) {
    if (!A.running || A.paused) return;
    let dt = Math.min(0.05, (now - A.last) / 1000); A.last = now;
    A.acc += dt;
    const h = 1 / 120;
    while (A.acc >= h && A.running) { A.acc -= h; step(h); if (!run.clearT && !run.failT) stepParts(h); }
    draw();
    if (A.running) A.raf = requestAnimationFrame(loop);
  }

  // ---------- Drawing ----------
  function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function draw() {
    const c = cvs(); if (!c || !A.L) return;
    const ctx = c.getContext("2d");
    const L = A.L, vwPx = view.vw * T, now = performance.now() / 1000;
    ctx.setTransform(view.scale, 0, 0, view.scale, 0, 0);
    // sky
    const g = ctx.createLinearGradient(0, 0, 0, H * T);
    g.addColorStop(0, "#121212"); g.addColorStop(1, "#1f1f24");
    ctx.fillStyle = g; ctx.fillRect(0, 0, vwPx, H * T);
    // far binary dots
    ctx.fillStyle = "rgba(124,124,124,0.18)";
    const off = (cam.x * 0.2) % 48;
    for (let x = -off; x < vwPx; x += 48) for (let y = 20; y < H * T; y += 48) ctx.fillRect(x, y, 2, 2);
    // server towers (parallax)
    for (const t of bg) {
      const x = t.x - cam.x * 0.5;
      if (x + t.w < 0 || x > vwPx) continue;
      ctx.fillStyle = "#1b1b20"; ctx.fillRect(x, H * T - 96 - t.h, t.w, t.h + 96);
      ctx.fillStyle = "#24242b"; ctx.fillRect(x + 4, H * T - 92 - t.h, t.w - 8, 4);
      t.leds.forEach(([lx, ly, col], k) => {
        const on = Math.sin(now * (1 + k * 0.7) + lx * 9) > -0.2;
        ctx.fillStyle = on ? ["rgba(77,77,255,0.8)", "rgba(255,236,1,0.7)", "rgba(255,0,140,0.75)"][col] : "rgba(80,80,80,0.5)";
        ctx.fillRect(x + 6 + lx * (t.w - 14), H * T - 90 - t.h + ly * t.h, 4, 3);
      });
    }
    ctx.save();
    ctx.translate(-Math.round(cam.x), 0);
    const tx0 = Math.max(0, Math.floor(cam.x / T) - 1), tx1 = Math.min(L.W - 1, Math.ceil((cam.x + vwPx) / T) + 1);
    // tiles
    for (let ty = 0; ty < H; ty++) for (let tx = tx0; tx <= tx1; tx++) {
      const ch = L.grid[ty][tx], x = tx * T, y = ty * T;
      if (ch === "#") {
        ctx.fillStyle = "#2a2a2e"; ctx.fillRect(x, y, T, T);
        ctx.fillStyle = "#232327"; ctx.fillRect(x + 2, y + 2, T - 4, T - 4);
        ctx.fillStyle = "rgba(124,124,124,0.35)"; ctx.fillRect(x + 8, y + 14, 10, 2); ctx.fillRect(x + 18, y + 14, 2, 8);
        ctx.fillStyle = "rgba(124,124,124,0.5)"; ctx.fillRect(x + 20, y + 21, 3, 3);
        if (!solidRaw(tx, ty - 1)) { ctx.fillStyle = L.theme; ctx.fillRect(x, y, T, 4); }
      } else if (ch === "-") {
        ctx.fillStyle = "#FFEC01"; ctx.fillRect(x, y, T, 6);
        ctx.fillStyle = "#7C7C7C"; ctx.fillRect(x + 4, y + 6, 3, 6); ctx.fillRect(x + T - 7, y + 6, 3, 6);
      } else if (ch === "^") {
        ctx.fillStyle = "#FF008C";
        for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(x + k * 11, y + T); ctx.lineTo(x + k * 11 + 5.5, y + 12 + Math.sin(now * 6 + tx + k) * 2); ctx.lineTo(x + k * 11 + 11, y + T); ctx.fill(); }
      }
    }
    // barriers
    for (let c = 0; c < run.solved.length; c++) {
      const cells = [];
      for (let ty = 0; ty < H; ty++) for (let tx = tx0; tx <= tx1; tx++) if (L.bar[ty][tx] === c) cells.push([tx, ty]);
      if (!cells.length) continue;
      const fade = run.solved[c] ? run.solveT[c] / 0.6 : 1;
      if (fade <= 0) continue;
      ctx.globalAlpha = fade;
      cells.forEach(([tx, ty]) => {
        const x = tx * T, y = ty * T;
        ctx.fillStyle = "rgba(255,0,140,0.18)"; ctx.fillRect(x + 6, y, T - 12, T);
        ctx.fillStyle = "rgba(255,0,140,0.8)";
        for (let k = 0; k < 3; k++) ctx.fillRect(x + 8 + k * 7, y, 2, T);
        ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.fillRect(x + 6, y + ((now * 80 + ty * 9) % T), T - 12, 2);
      });
      const [lx, ly] = cells[cells.length - 1];
      lock(ctx, lx * T + T / 2, (ly - 2) * T);
      ctx.globalAlpha = 1;
    }
    // boss wall
    if (!run.bossDead) L.bossWall.forEach(([tx, ty]) => { const x = tx * T, y = ty * T; ctx.fillStyle = "rgba(124,124,124,0.25)"; ctx.fillRect(x + 6, y, T - 12, T); ctx.fillStyle = "rgba(255,236,1,0.6)"; ctx.fillRect(x + 14, y, 4, T); });
    // signs
    for (const s of L.signs) {
      const x = s.x * T, y = s.y * T;
      ctx.fillStyle = "#7C7C7C"; ctx.fillRect(x + 14, y + 10, 4, T - 10);
      ctx.fillStyle = "#3b3b3b"; rr(ctx, x + 4, y - 4, 24, 18, 3); ctx.fill();
      ctx.fillStyle = "#FFEC01"; ctx.font = "700 13px 'JetBrains Mono', monospace"; ctx.textAlign = "center"; ctx.fillText("?", x + 16, y + 10);
      if (Math.abs(p.x - x) < T * 6) bubble(ctx, x + 16, y - 10, s.text);
    }
    // checkpoints
    for (const ck of run.checks) {
      const x = ck.x * T, y = ck.y * T;
      ctx.fillStyle = "#7C7C7C"; ctx.fillRect(x + 14, y - T + 4, 3, T * 2 - 4);
      ctx.fillStyle = ck.on ? "#FFEC01" : "#4a4a4a";
      ctx.beginPath(); ctx.moveTo(x + 17, y - T + 4); ctx.lineTo(x + 31, y - T + 10 + Math.sin(now * 4) * 1.5); ctx.lineTo(x + 17, y - T + 16); ctx.fill();
    }
    // doors
    for (const d of run.doors) drawDoor(ctx, d, now);
    // items
    for (const it of run.items) {
      if (it.taken) continue;
      const x = it.x * T + T / 2, y = it.y * T + T / 2 + Math.sin(now * 3 + it.x) * 3;
      if (it.type === "bit") {
        ctx.fillStyle = "#FFEC01"; ctx.save(); ctx.translate(x, y); ctx.scale(Math.abs(Math.cos(now * 2.5 + it.x)) * 0.7 + 0.3, 1);
        rr(ctx, -7, -9, 14, 18, 3); ctx.fill(); ctx.fillStyle = "#1C1C1C"; ctx.font = "800 12px 'JetBrains Mono', monospace"; ctx.textAlign = "center"; ctx.fillText((it.x + it.y) % 2 ? "1" : "0", 0, 4); ctx.restore();
      } else if (it.type === "heart") heartShape(ctx, x, y, 9, "#FF008C");
      else if (it.type === "scroll") {
        ctx.fillStyle = "#8792ff"; rr(ctx, x - 10, y - 8, 20, 16, 3); ctx.fill();
        ctx.fillStyle = "#1C1C1C"; ctx.fillRect(x - 6, y - 3, 12, 2); ctx.fillRect(x - 6, y + 1, 8, 2);
        ctx.fillStyle = "#FFEC01"; ctx.fillRect(x - 12, y - 9, 3, 18); ctx.fillRect(x + 9, y - 9, 3, 18);
      }
    }
    // exit
    drawExit(ctx, now);
    // enemies
    for (const e of run.enemies) drawEnemy(ctx, e, now);
    if (run.boss) drawBoss(ctx, run.boss, now);
    // player
    drawPlayer(ctx, now);
    // particles
    for (const q of parts) { ctx.globalAlpha = Math.max(0, Math.min(1, q.life * 2)); ctx.fillStyle = q.color; ctx.fillRect(q.x - 2, q.y - 2, 4, 4); }
    ctx.globalAlpha = 1;
    // door prompt
    if (run.near && !run.clearT && !run.failT) {
      const d = run.near, x = d.x * T + T / 2, y = (d.y - 1) * T - 28;
      ctx.fillStyle = "rgba(28,28,28,0.92)"; rr(ctx, x - 40, y - 12, 80, 22, 5); ctx.fill();
      ctx.strokeStyle = "#FFEC01"; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = "#FFEC01"; ctx.font = "700 12px 'JetBrains Mono', monospace"; ctx.textAlign = "center"; ctx.fillText("Up: deliver", x, y + 3);
    }
    ctx.restore();
  }
  function solidRaw(tx, ty) { return ty >= 0 && ty < H && tx >= 0 && tx < A.L.W && A.L.grid[ty][tx] === "#"; }
  function lock(ctx, x, y) {
    ctx.fillStyle = "rgba(28,28,28,0.9)"; rr(ctx, x - 13, y - 4, 26, 22, 4); ctx.fill();
    ctx.strokeStyle = "#FF008C"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y - 4, 7, Math.PI, 0); ctx.stroke();
    ctx.fillStyle = "#FF008C"; ctx.fillRect(x - 2, y + 3, 4, 8);
  }
  function bubble(ctx, x, y, text) {
    ctx.font = "600 13px 'Satoshi', system-ui, sans-serif";
    const words = text.split(" "), lines = []; let line = "";
    words.forEach((w) => { const t = line ? line + " " + w : w; if (ctx.measureText(t).width > 210) { lines.push(line); line = w; } else line = t; });
    if (line) lines.push(line);
    const w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 20, h = lines.length * 17 + 12;
    const bx = Math.max(cam.x + 6, Math.min(cam.x + view.vw * T - w - 6, x - w / 2)), by = y - h - 6;
    ctx.fillStyle = "rgba(28,28,28,0.94)"; rr(ctx, bx, by, w, h, 6); ctx.fill();
    ctx.strokeStyle = "#7C7C7C"; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = "#f4f4f4"; ctx.textAlign = "left";
    lines.forEach((l, i) => ctx.fillText(l, bx + 10, by + 20 + i * 17));
  }
  function heartShape(ctx, x, y, s, col) {
    ctx.fillStyle = col; ctx.beginPath();
    ctx.moveTo(x, y + s * 0.9);
    ctx.bezierCurveTo(x - s * 1.4, y - s * 0.1, x - s * 0.6, y - s * 1.2, x, y - s * 0.4);
    ctx.bezierCurveTo(x + s * 0.6, y - s * 1.2, x + s * 1.4, y - s * 0.1, x, y + s * 0.9);
    ctx.fill();
  }
  function drawDoor(ctx, d, now) {
    const x = d.x * T, y = (d.y - 1) * T, solved = run.solved[d.c];
    const active = d.c === run.cur;
    ctx.fillStyle = "#3b3b3b"; rr(ctx, x + 1, y + 2, T - 2, T * 2 - 2, 4); ctx.fill();
    let panel = d.broken ? "#2d2d2d" : solved ? (d.ok ? "#FFEC01" : "#2d2d2d") : "#0000FE";
    ctx.fillStyle = panel; rr(ctx, x + 5, y + 6, T - 10, T * 2 - 8, 3); ctx.fill();
    if (!d.broken && !(solved && !d.ok)) { ctx.fillStyle = solved ? "#1C1C1C" : "#FFEC01"; ctx.beginPath(); ctx.arc(x + T - 10, y + T + 4, 2.5, 0, Math.PI * 2); ctx.fill(); }
    if (d.broken) { ctx.strokeStyle = "#FF008C"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x + 8, y + 12); ctx.lineTo(x + T - 8, y + T * 2 - 8); ctx.moveTo(x + T - 8, y + 12); ctx.lineTo(x + 8, y + T * 2 - 8); ctx.stroke(); }
    // port plaque
    const label = String(d.port);
    ctx.font = "800 15px 'JetBrains Mono', monospace"; ctx.textAlign = "center";
    const w = Math.max(34, ctx.measureText(label).width + 12);
    const py = y - 22 + (active && !solved && !d.broken ? Math.sin(now * 3 + d.x) * 1.5 : 0);
    ctx.fillStyle = "rgba(28,28,28,0.95)"; rr(ctx, x + T / 2 - w / 2, py - 2, w, 22, 4); ctx.fill();
    ctx.strokeStyle = d.broken ? "#FF008C" : solved && d.ok ? "#FFEC01" : active ? "#FFEC01" : "#7C7C7C"; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = d.broken ? "#7C7C7C" : "#FFEC01"; ctx.fillText(label, x + T / 2, py + 14);
  }
  function drawExit(ctx, now) {
    const ex = A.L.exit, x = ex.x * T + T / 2, y = (ex.y) * T;
    const open = run.bossDead && run.solved.every(Boolean);
    const last = A.lvl === LEVELS.length - 1;
    if (last) {
      // cage with Packet's parents
      ctx.fillStyle = "#7C7C7C"; ctx.fillRect(x - 30, y - 50, 60, 4); ctx.fillRect(x - 30, y + T - 4, 60, 4);
      [[-14, "#0000FE"], [14, "#4d4dff"]].forEach(([dx, col], k) => {
        const by = y - 18 + (open ? Math.sin(now * 8 + k) * 4 : 0);
        ctx.fillStyle = col; rr(ctx, x + dx - 12, by, 24, 30, 7); ctx.fill();
        ctx.fillStyle = "#FFEC01"; ctx.fillRect(x + dx - 12, by + 4, 24, 4);
        ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(x + dx - 5, by + 15, 3.5, 0, 7); ctx.arc(x + dx + 5, by + 15, 3.5, 0, 7); ctx.fill();
        ctx.fillStyle = "#1C1C1C"; ctx.beginPath(); ctx.arc(x + dx - 5, by + 16, 1.6, 0, 7); ctx.arc(x + dx + 5, by + 16, 1.6, 0, 7); ctx.fill();
      });
      if (!open) { ctx.fillStyle = "#7C7C7C"; for (let k = -28; k <= 28; k += 9) ctx.fillRect(x + k, y - 50, 3, 50 + T); }
      return;
    }
    ctx.save(); ctx.translate(x, y);
    for (let k = 0; k < 3; k++) {
      ctx.strokeStyle = ["#FFEC01", "#4d4dff", "#FF008C"][k]; ctx.globalAlpha = open ? 0.9 : 0.35; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(0, 0, 18 + k * 5, 26 + k * 5, 0, now * (k % 2 ? -2 : 2), now * (k % 2 ? -2 : 2) + Math.PI * 1.4); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = open ? "#FFEC01" : "#7C7C7C"; ctx.font = "800 11px 'JetBrains Mono', monospace"; ctx.textAlign = "center"; ctx.fillText("EXIT", 0, -40);
    ctx.restore();
  }
  function drawEnemy(ctx, e, now) {
    if (!e.alive) {
      if ((e.dead || 0) < 0.4) { ctx.globalAlpha = 1 - e.dead / 0.4; ctx.fillStyle = "#FF008C"; ctx.fillRect(e.x, e.y + e.h - 5, e.w, 5); ctx.globalAlpha = 1; }
      return;
    }
    if (e.type === "worm") {
      const dir = Math.sign(e.vx);
      for (let k = 0; k < 4; k++) {
        const sx = e.x + e.w / 2 - dir * (k * 7 - 10), sy = e.y + 9 - Math.abs(Math.sin(e.t * 8 + k)) * 3;
        ctx.fillStyle = k === 0 ? "#FF008C" : k % 2 ? "#d10074" : "#FF008C";
        ctx.beginPath(); ctx.arc(sx, sy, k === 0 ? 7.5 : 6.5, 0, 7); ctx.fill();
      }
      const hx = e.x + e.w / 2 + dir * 10, hy = e.y + 6;
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(hx + dir * 2, hy, 2.8, 0, 7); ctx.fill();
      ctx.fillStyle = "#1C1C1C"; ctx.beginPath(); ctx.arc(hx + dir * 3, hy, 1.4, 0, 7); ctx.fill();
    } else {
      const cx = e.cx;
      ctx.strokeStyle = "#7C7C7C"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(cx, firstSolidAbove(e) ); ctx.lineTo(cx, e.y + 2); ctx.stroke();
      // hook
      ctx.strokeStyle = "#d9d9d9"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx, e.y + 2); ctx.lineTo(cx, e.y + 14); ctx.arc(cx - 5, e.y + 14, 5, 0, Math.PI, false); ctx.stroke();
      // envelope bait
      ctx.fillStyle = "#FFEC01"; ctx.fillRect(cx - 9, e.y + 16, 18, 12);
      ctx.strokeStyle = "#1C1C1C"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(cx - 9, e.y + 16); ctx.lineTo(cx, e.y + 23); ctx.lineTo(cx + 9, e.y + 16); ctx.stroke();
    }
  }
  function firstSolidAbove(e) {
    const c = Math.floor(e.cx / T);
    for (let r = Math.floor(e.y / T); r >= 0; r--) if (solidRaw(c, r)) return (r + 1) * T;
    return 0;
  }
  function drawBoss(ctx, B, now) {
    if (!B.alive && B.deadT > 1) return;
    ctx.save();
    if (!B.alive) { ctx.globalAlpha = Math.max(0, 1 - B.deadT); ctx.translate(0, -B.deadT * 40); }
    if (B.inv > 0 && Math.floor(now * 20) % 2) ctx.globalAlpha *= 0.4;
    const x = B.x, y = B.y;
    // coat
    ctx.fillStyle = "#7C7C7C"; rr(ctx, x + 4, y + 18, B.w - 8, B.h - 18, 8); ctx.fill();
    ctx.fillStyle = "#5e5e5e"; ctx.fillRect(x + B.w / 2 - 2, y + 22, 4, B.h - 24);
    // head
    ctx.fillStyle = "#a8a8a8"; rr(ctx, x + 10, y, B.w - 20, 24, 8); ctx.fill();
    // hat brim
    ctx.fillStyle = "#1C1C1C"; ctx.fillRect(x + 4, y - 2, B.w - 8, 5); ctx.fillRect(x + 12, y - 12, B.w - 24, 11);
    // pink shades
    ctx.fillStyle = "#FF008C"; rr(ctx, x + 12, y + 8, 12, 7, 2); ctx.fill(); rr(ctx, x + B.w - 24, y + 8, 12, 7, 2); ctx.fill(); ctx.fillRect(x + 24, y + 10, B.w - 48, 2);
    ctx.fillStyle = "#FFEC01"; ctx.font = "800 11px 'JetBrains Mono', monospace"; ctx.textAlign = "center"; ctx.fillText("MITM", x + B.w / 2, y + 44);
    ctx.restore();
    if (B.alive) for (let k = 0; k < 3; k++) heartShape(ctx, B.x + B.w / 2 - 14 + k * 14, B.y - 22, 5, k < B.hp ? "#FF008C" : "#3b3b3b");
  }
  function drawPlayer(ctx, now) {
    if (p.inv > 0 && !run.failT && Math.floor(now * 16) % 2) return;
    const sq = p.squash, sx = 1 + sq * 0.18, sy = 1 - sq * 0.15;
    const cx = p.x + p.w / 2, by = p.y + p.h;
    ctx.save(); ctx.translate(cx, by); ctx.scale(sx, sy);
    const bob = p.ground && Math.abs(p.vx) > 20 ? Math.abs(Math.sin(p.anim)) * 2 : 0;
    const w = 24, h = 24, top = -h - 2 - bob;
    // feet
    ctx.fillStyle = "#7C7C7C";
    const step = p.ground ? Math.sin(p.anim) * 3 : 0;
    ctx.fillRect(-9 + step, -4, 7, 4); ctx.fillRect(2 - step, -4, 7, 4);
    // antenna
    ctx.strokeStyle = "#FFEC01"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, top); ctx.lineTo(p.face * 3, top - 7); ctx.stroke();
    ctx.fillStyle = "#FF008C"; ctx.beginPath(); ctx.arc(p.face * 3, top - 8, 3, 0, 7); ctx.fill();
    // body
    ctx.fillStyle = "#0000FE"; rr(ctx, -w / 2, top, w, h, 7); ctx.fill();
    ctx.strokeStyle = "#8792ff"; ctx.lineWidth = 1.5; ctx.stroke();
    // header stripe
    ctx.fillStyle = "#FFEC01"; ctx.fillRect(-w / 2 + 2, top + 4, w - 4, 3);
    // eyes
    const ex = p.face * 2;
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(-5 + ex, top + 14, 4, 0, 7); ctx.arc(5 + ex, top + 14, 4, 0, 7); ctx.fill();
    ctx.fillStyle = "#1C1C1C"; ctx.beginPath(); ctx.arc(-5 + ex + p.face * 1.4, top + 14.5, 2, 0, 7); ctx.arc(5 + ex + p.face * 1.4, top + 14.5, 2, 0, 7); ctx.fill();
    // suction-cup hands
    ctx.fillStyle = "#FF008C";
    if (p.cling) {
      const hx = p.cling * (w / 2 + 2);
      ctx.beginPath(); ctx.arc(hx, top + 6 + (Math.sin(p.anim) * 2), 3.5, 0, 7); ctx.arc(hx, top + 18 - (Math.sin(p.anim) * 2), 3.5, 0, 7); ctx.fill();
    } else {
      const sw = p.ground ? Math.sin(p.anim) * 2 : -3;
      ctx.beginPath(); ctx.arc(-w / 2 - 2, top + 15 + sw, 3.5, 0, 7); ctx.arc(w / 2 + 2, top + 15 - sw, 3.5, 0, 7); ctx.fill();
    }
    ctx.restore();
  }

  // ---------- Input ----------
  const KEYMAP = { ArrowLeft: "left", a: "left", A: "left", ArrowRight: "right", d: "right", D: "right", ArrowUp: "up", w: "up", W: "up", ArrowDown: "down", s: "down", S: "down", " ": "jump", z: "jump", Z: "jump", k: "jump", K: "jump" };
  document.addEventListener("keydown", (e) => {
    if (PP.state.screen !== "adventure") return;
    if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    const ov = !$("#adv-overlay").hidden;
    if (e.key === "p" || e.key === "P" || e.key === "Escape") { if (A.running) { e.preventDefault(); pause(); } return; }
    if (ov && e.key === "Enter") { e.preventDefault(); if (A.paused) pause(false); else start(A.sel); return; }
    if (ov && !A.paused && /^[1-5]$/.test(e.key)) { const i = +e.key - 1; if (i < unlocked()) { A.sel = i; overlay("select"); } return; }
    const k = KEYMAP[e.key];
    if (k) { if (A.running) e.preventDefault(); if (!ov) { if (!keys[k] && k in taps) taps[k] = true; keys[k] = true; } }
  });
  document.addEventListener("keyup", (e) => { const k = KEYMAP[e.key]; if (k) keys[k] = false; });
  window.addEventListener("blur", () => { Object.keys(keys).forEach((k) => (keys[k] = false)); if (A.running && !A.paused && !A.over && PP.state.screen === "adventure") pause(true); });
  document.addEventListener("visibilitychange", () => { if (document.hidden && A.running && !A.paused && !A.over) pause(true); });
  $("#adv-levels").addEventListener("click", (e) => { const b = e.target.closest("[data-lv]"); if (b && !b.disabled) start(+b.dataset.lv); });
  $("#adv-start").addEventListener("click", () => (A.paused ? pause(false) : start(A.sel)));
  $("#adv-pause").addEventListener("click", () => pause());
  // Touch pad
  document.querySelectorAll(".ap[data-k]").forEach((b) => {
    const k = b.dataset.k;
    const on = (e) => { e.preventDefault(); if (k in taps) taps[k] = true; keys[k] = true; b.classList.add("on"); try { b.setPointerCapture(e.pointerId); } catch (x) {} };
    const off = () => { keys[k] = false; b.classList.remove("on"); };
    b.addEventListener("pointerdown", on);
    b.addEventListener("pointerup", off); b.addEventListener("pointercancel", off); b.addEventListener("lostpointercapture", off);
    b.addEventListener("contextmenu", (e) => e.preventDefault());
  });
  $("#adv-wrap").addEventListener("touchmove", (e) => { if (A.running) e.preventDefault(); }, { passive: false });
  window.addEventListener("resize", () => { if (PP.state.screen === "adventure") { size(); draw(); } });

  window.PPAdventure = { open, stop, levels: LEVELS, _dbg: () => ({ A, p, run, keys, view, cam, draw, loadLevel }) };
})();
