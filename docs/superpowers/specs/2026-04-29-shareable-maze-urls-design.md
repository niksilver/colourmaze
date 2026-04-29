# Shareable Maze URLs — Design Spec

**Date:** 2026-04-29

## Overview

Each generated maze gets a unique URL via the hash fragment. If the user navigates away (Menu, Another, browser Back, accidental navigation) they can return to the exact same maze using browser Back/Forward or by sharing the URL.

## URL Format

```
#s=12&c=RYB&g=aB3xZqT...
```

| Param | Meaning | Example |
|-------|---------|---------|
| `s`   | Grid size (rows = cols) | `7` |
| `c`   | Colour sequence as single letters: `R`ed `Y`ellow `B`lue `G`reen `P`urple | `RYB` |
| `g`   | Grid encoded as base-62 string | `aB3xZqT...` |

### Grid encoding

The maze grid is a 2D array of hex colour strings. Encoding:

First, `RGB.BLACK` is appended to `COLOURS` in `generator.js` as index 5, making `COLOURS` a complete 6-entry palette `[RED, YELLOW, BLUE, GREEN, PURPLE, BLACK]`. Encoding then proceeds:

1. Map each cell's hex colour to its index in `COLOURS` (0–5).
2. Flatten the grid to a sequence of indices in row-major order (top-left first, row by row).
3. Treat the sequence as a base-6 number (first cell = most significant digit).
4. Convert to base-62 using digits `0-9a-zA-Z`.

Decoding reverses these steps: convert base-62 back to base-6 digits, then map each index to `COLOURS[i]`. The sequence param `c` is not needed for grid decoding — it is only needed to initialise gameplay.

Approximate encoded lengths:

| Grid | Base-62 chars |
|------|--------------|
| 5×5  | ~11 |
| 7×7  | ~22 |
| 10×10 | ~44 |
| 12×12 | ~63 |

## History Management

| User action | `history` call | Hash after |
|-------------|---------------|------------|
| New maze generated | `pushState` | `#s=...&c=...&g=...` |
| Another button clicked | `pushState` | new `#s=...&c=...&g=...` |
| Menu button clicked | `pushState` | `#` |
| Win overlay OK clicked | `pushState` | `#` |
| Browser Back/Forward | (browser fires `popstate`) | restored by browser |

The `popstate` handler reads `location.hash` and either restores the game screen (valid maze hash) or the menu screen (empty/invalid hash).

## Page Load Behaviour

On `DOMContentLoaded`, before showing any screen:

- Parse `location.hash`.
- If it contains valid `s`, `c`, `g` params: render game screen with that maze directly (no generation needed — grid is fully encoded).
- Otherwise: show menu screen as normal.

## New File: `url.js`

Loaded before `game.js`. Exposes a global `MazeURL` object with:

```js
MazeURL.encodeGrid(grid)                    → string
MazeURL.decodeGrid(str, rows, cols)         → grid (2D array)
MazeURL.buildHash(gridSize, sequence, grid) → string  // e.g. "#s=7&c=RYB&g=..."
MazeURL.parseHash(hash)                     → { gridSize, sequence, grid } | null
```

`encodeGrid` and `decodeGrid` use `Generator.COLOURS` (indices 0–5) as the colour palette. `url.js` depends on `generator.js` being loaded first.

## Changes to `game.js`

- `startGame()`: after the worker returns a maze and `renderGrid()` is called, call `history.pushState(null, '', MazeURL.buildHash(...))`.
- Menu button handler: add `history.pushState(null, '', '#')` before `showScreen('menu-screen')`.
- Win overlay OK handler: add `history.pushState(null, '', '#')` before dismissing the overlay.
- New `popstate` handler registered in `initMenu()`: parses hash and either restores maze or menu.
- `initMenu()` / `DOMContentLoaded`: check hash on load and restore maze if present.

## Changes to `index.html`

Add `<script src="url.js"></script>` before `game.js`.

## No Changes To

- `generator.js` — generation algorithm unchanged
- `generator-worker.js` — unchanged
- `style.css` — unchanged
- `tests/test-generator.js` — unchanged; new tests for `url.js` go in `tests/test-url.js`
