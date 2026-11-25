# Dapur Kilat — Sizzle & Serve

[![make.fun](https://make.fun/badge/best-cooking-game-20261125-0137.svg)](https://make.fun/c/best-cooking-game-20261125-0137)
[![rank](https://make.fun/badge/best-cooking-game-20261125-0137/HadiSH304/best-cooking-game-entry/rank.svg)](https://make.fun/c/best-cooking-game-20261125-0137)
[![reward](https://make.fun/badge/best-cooking-game-20261125-0137/HadiSH304/best-cooking-game-entry/reward.svg)](https://make.fun/c/best-cooking-game-20261125-0137)

An original fast-paced cooking game for [make.fun's best cooking game bounty](https://make.fun/c/best-cooking-game-20261125-0137). Run a small Indonesian street kitchen: order tickets arrive on the board, you stack each dish layer by layer from the ingredients on the counter, grill the meat, chicken and egg on the pans until the ring turns green, and serve the finished plate before the customer's patience runs out. A 150-second shift, rising pressure, combos for fast service.

## How to play

- **Order board (top):** each ticket shows a dish, its layers in order, a patience bar and its price. Click a ticket (or press Q / W / E) to work on it.
- **Ingredients (bottom):** click a bin — or press 1–8 — to take it. Roti, nasi, selada, tomat and keju go straight onto the plate; daging, ayam and telur must be grilled first.
- **Grill (left):** a raw item cooks on a pan. Click it when the ring turns green — too early and it is raw, too late and it burns.
- **Serve:** when the plate matches the recipe, press the SAJIKAN button or S. Serving fast earns a patience bonus; serving in a row builds a combo.
- **Shift:** the timer at the top right ends the round. Patience running out loses the order and resets your combo.

## Run it

```sh
node serve.ts   # then open http://localhost:8080
```

Static files only — `game/index.html` plus its ES modules, no build step, no network requests. Keyboard and mouse.

## Layout

- `game/src/config.js` — tuning, recipes, ingredients, layout, palette
- `game/src/kitchen.js` — orders, grill, plate, scoring, shift timer
- `game/src/draw.js` — all canvas drawing and food art
- `game/src/input.js` — keyboard and pointer input
- `game/src/shots.js` — staged screenshot scenes (real play, autopilot)
- `game/src/main.js` — boot, game loop, screens
- `game/src/random.js` — seeded random for repeatable games
- `main.ts` — hands the game in: copies `game/` and `screenshots/` and writes `dossier.json`

## License

MIT — see [LICENSE](LICENSE).
