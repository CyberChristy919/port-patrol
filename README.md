# Port Patrol

A browser game for learning TCP/UDP port numbers for CompTIA Network+, Security+, CCNA, and networking classes.

## Play locally

No install or build step. Either open `index.html` in a browser, or serve the folder:

```bash
git clone <repo-url> port-patrol
cd port-patrol
python3 -m http.server 8000   # then open http://localhost:8000
```

## Game modes

| Mode | What it trains |
| --- | --- |
| Port Quiz | 15 multiple-choice questions, port → service and service → port, with explanations |
| Packet Rush | Arcade: identify packets before they hit the firewall; speed increases each level |
| Port Blitz | 60-second typed recall of port numbers |
| Patch Panel | Match ports to services across 3 panels, timed |
| Cyber Snake | Classic snake: a protocol name appears, steer into its port number and avoid decoy ports; walls and your tail end the run |
| Study Deck | Flashcards, searchable reference table, secure/insecure pairs |

Every mode ends with a "ports to review" list and a "Drill my misses" button.

## Decks

- **Network+** — the 20 entries in the official N10-009 objective 1.4 list
- **Security+** — commonly tested ports for SY0-701
- **CCNA** — commonly tested ports for 200-301
- **Full deck** — everything (40 entries)

## Add or edit ports

All port data lives in `data.js`. Each entry looks like:

```js
{ id: "https", ports: [443], name: "HTTPS", full: "HTTP Secure", proto: "TCP", exams: "NSC", secure: true, tip: "..." }
```

`exams` uses `N` (Network+), `S` (Security+), and `C` (CCNA).

## Keyboard

- `1`–`4` answer, `Enter` next/start
- Port Blitz: `Enter` submit, `Tab` skip
- Cyber Snake: arrow keys / WASD to steer, `Space` to pause; swipe or on-screen pad on phones
- Flashcards: `Space` flip, arrow keys to move
