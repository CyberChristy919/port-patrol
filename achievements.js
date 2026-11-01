// Port Patrol achievements: ranks, badges, and port mastery rules.
// Each badge has a check(P, g) function. P = lifetime progress, g = the game that just ended (or null).
// Optional progress(P) returns [current, goal] so locked badges can show how close the player is.

window.RANKS = [
  { xp: 0,     name: "Script Kiddie" },
  { xp: 150,   name: "Packet Sniffer" },
  { xp: 400,   name: "Port Scanner" },
  { xp: 800,   name: "Help Desk Hero" },
  { xp: 1400,  name: "Firewall Guardian" },
  { xp: 2200,  name: "SOC Analyst" },
  { xp: 3200,  name: "Threat Hunter" },
  { xp: 4500,  name: "Network Architect" },
  { xp: 6500,  name: "CISO" },
];

// XP rules
window.XP_RULES = { correct: 10, attempt: 2, game: 25, badge: { bronze: 50, silver: 100, gold: 200 } };

// A port is "mastered" after this many correct answers in a row (any mode).
window.MASTERY_STREAK = 3;

window.BADGES = [
  // Getting started
  { id: "first_boot", name: "First Boot", tier: "bronze", glyph: "01", group: "Getting started",
    desc: "Finish your first game.", check: (P) => P.games >= 1 },
  { id: "full_stack", name: "Full Stack", tier: "silver", glyph: "FS", group: "Getting started",
    desc: "Finish a game in all five game modes and open the Study Deck.",
    check: (P) => ["quiz", "rush", "blitz", "match", "snake", "study"].every((m) => P.modes[m]),
    progress: (P) => [["quiz", "rush", "blitz", "match", "snake", "study"].filter((m) => P.modes[m]).length, 6] },
  { id: "dedicated", name: "Dedicated", tier: "silver", glyph: "10", group: "Getting started",
    desc: "Play 10 games.", check: (P) => P.games >= 10, progress: (P) => [P.games, 10] },
  { id: "patch_tuesday", name: "Patch Tuesday", tier: "bronze", glyph: "PT", group: "Getting started",
    desc: "Finish a \"Drill my misses\" round.", check: (P) => P.drills >= 1 },

  // Port Quiz
  { id: "zero_findings", name: "Zero Findings", tier: "gold", glyph: "0F", group: "Port Quiz",
    desc: "Score 100% on a Port Quiz without using a hint.",
    check: (P, g) => g && g.mode === "quiz" && g.pct === 100 && g.hints === 0 },
  { id: "on_a_roll", name: "On a Roll", tier: "silver", glyph: "x10", group: "Port Quiz",
    desc: "Get a 10-answer streak in Port Quiz.", check: (P, g) => g && g.mode === "quiz" && g.best >= 10 },

  // Packet Rush
  { id: "firewall_held", name: "Firewall Held", tier: "silver", glyph: "FW", group: "Packet Rush",
    desc: "Score 300 or more in Packet Rush.", check: (P, g) => g && g.mode === "rush" && g.score >= 300 },
  { id: "under_pressure", name: "Under Pressure", tier: "gold", glyph: "L5", group: "Packet Rush",
    desc: "Reach level 5 in Packet Rush.", check: (P, g) => g && g.mode === "rush" && g.level >= 5 },

  // Port Blitz
  { id: "fast_hands", name: "Fast Hands", tier: "bronze", glyph: "15", group: "Port Blitz",
    desc: "Recall 15 ports in one Port Blitz.", check: (P, g) => g && g.mode === "blitz" && g.score >= 15 },
  { id: "muscle_memory", name: "Muscle Memory", tier: "gold", glyph: "25", group: "Port Blitz",
    desc: "Recall 25 ports in one Port Blitz.", check: (P, g) => g && g.mode === "blitz" && g.score >= 25 },

  // Patch Panel
  { id: "clean_run", name: "Clean Cable Run", tier: "silver", glyph: "0M", group: "Patch Panel",
    desc: "Finish Patch Panel with zero misses.", check: (P, g) => g && g.mode === "match" && g.misses === 0 },
  { id: "speed_patcher", name: "Speed Patcher", tier: "gold", glyph: "40s", group: "Patch Panel",
    desc: "Finish Patch Panel with a final time under 40 seconds.", check: (P, g) => g && g.mode === "match" && g.final < 40 },

  // Cyber Snake
  { id: "packet_eater", name: "Packet Eater", tier: "bronze", glyph: "S10", group: "Cyber Snake",
    desc: "Eat 10 correct ports in one Cyber Snake run.", check: (P, g) => g && g.mode === "snake" && g.eaten >= 10 },
  { id: "need_for_speed", name: "Need for Speed", tier: "silver", glyph: ">>>", group: "Cyber Snake",
    desc: "Eat 5 correct ports in one run on Fast speed.", check: (P, g) => g && g.mode === "snake" && g.speed === "fast" && g.eaten >= 5 },
  { id: "apex_predator", name: "Apex Predator", tier: "gold", glyph: "S20", group: "Cyber Snake",
    desc: "Eat 20 correct ports in one Cyber Snake run.", check: (P, g) => g && g.mode === "snake" && g.eaten >= 20 },

  // Study
  { id: "bookworm", name: "Bookworm", tier: "bronze", glyph: "FC", group: "Study",
    desc: "Flip 25 flashcards.", check: (P) => P.flips >= 25, progress: (P) => [P.flips, 25] },
  { id: "mnemonic_maker", name: "Mnemonic Maker", tier: "silver", glyph: "Mm", group: "Study",
    desc: "Write 3 of your own memory tricks.", check: (P) => P.tricks >= 3, progress: (P) => [P.tricks, 3] },

  // Lifetime
  { id: "centurion", name: "Centurion", tier: "silver", glyph: "100", group: "Lifetime",
    desc: "Answer 100 questions correctly across all modes.", check: (P) => P.correct >= 100, progress: (P) => [P.correct, 100] },
  { id: "port_authority", name: "Port Authority", tier: "gold", glyph: "500", group: "Lifetime",
    desc: "Answer 500 questions correctly across all modes.", check: (P) => P.correct >= 500, progress: (P) => [P.correct, 500] },

  // Mastery
  { id: "ten_down", name: "Ten Ports Down", tier: "bronze", glyph: "M10", group: "Mastery",
    desc: "Master 10 ports.", check: (P, g, M) => M.all >= 10, progress: (P, M) => [M.all, 10] },
  { id: "netplus_ready", name: "Network+ Ready", tier: "gold", glyph: "N+", group: "Mastery",
    desc: "Master every port in the Network+ deck.", check: (P, g, M) => M.N.done === M.N.total, progress: (P, M) => [M.N.done, M.N.total] },
  { id: "secplus_ready", name: "Security+ Ready", tier: "gold", glyph: "S+", group: "Mastery",
    desc: "Master every port in the Security+ deck.", check: (P, g, M) => M.S.done === M.S.total, progress: (P, M) => [M.S.done, M.S.total] },
  { id: "ccna_ready", name: "CCNA Ready", tier: "gold", glyph: "CC", group: "Mastery",
    desc: "Master every port in the CCNA deck.", check: (P, g, M) => M.C.done === M.C.total, progress: (P, M) => [M.C.done, M.C.total] },
  { id: "legend", name: "Port Patrol Legend", tier: "gold", glyph: "*", group: "Mastery",
    desc: "Master every port in the game.", check: (P, g, M) => M.all === M.total, progress: (P, M) => [M.all, M.total] },
];
