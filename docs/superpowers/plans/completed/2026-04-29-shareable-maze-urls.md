# Shareable Maze URLs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Encode every generated maze into a URL hash so users can share or revisit any maze via a direct link.

**Architecture:** A new `url.js` module exposes `MazeURL` (a global object in the browser, a `module.exports` in Node). It converts a maze grid to/from a compact base-62 string using BigInt arithmetic, and reads/writes `location.hash`. `game.js` calls `MazeURL` to push history on every navigation event and restores mazes from the hash on load and on `popstate`.

**Tech Stack:** Vanilla JS (ES2020 BigInt, no build step). Node.js for tests. Browser history API (`pushState`, `popstate`).

**Status:** Complete

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `url.js` | **Create** | `MazeURL` global: encode/decode grid, build/parse hash |
| `tests/test-url.js` | **Create** | Unit tests for `MazeURL` |
| `game.js` | **Modify** | Push history on maze start / menu / win; popstate handler; page-load hash restore |
| `index.html` | **Modify** | Add `<script src="url.js">` before `game.js` |

`generator.js`, `generator-worker.js`, `style.css`, `tests/test-generator.js` are **not changed**.

---

### Task 1: Create `url.js` skeleton and `encodeGrid`

**Files:**
- Create: `url.js`
- Create: `tests/test-url.js`

**Background:**
- `Generator.COLOURS` = `[RED, YELLOW, BLUE, GREEN, PURPLE]` (indices 0–4)
- For encoding, BLACK is index 5. The full 6-colour palette is `[...Generator.COLOURS, Generator.RGB.BLACK]`
- Encoding: flatten grid row-major → base-6 number (first cell = most significant digit) → base-62 string using digits `0-9a-zA-Z`
- BigInt is required: a 12×12 grid = 144 base-6 digits ≈ 10^111
- `url.js` uses the same module pattern as `generator.js` (`module.exports` in Node, `self.MazeURL` in browser)
- Tests set `global.Generator = require('../generator.js')` before requiring `url.js`

**Status:** Not started

- [ ] **Step 1: Write failing tests for `encodeGrid`**

  In `tests/test-url.js`, write a test harness (copy the `test()`/`passed`/`failed` pattern from `tests/test-generator.js`) and require the modules:

  ```js
  global.Generator = require('../generator.js');
  const MazeURL    = require('../url.js');
  ```

  Then add these tests under `console.log('-- encodeGrid --')`:

  - `encodeGrid([[RED]])` → `'0'` (RED is index 0; base-6: `0`; base-62: `'0'`)
  - `encodeGrid([[YELLOW]])` → `'1'` (YELLOW is index 1)
  - `encodeGrid([[BLACK]])` → `'5'` (BLACK is index 5)
  - `encodeGrid([[RED, YELLOW], [BLUE, GREEN]])` → `'P'`
    - Row-major indices: `[0, 1, 2, 3]`
    - BigInt: `0*216n + 1*36n + 2*6n + 3*1n = 51n`
    - Base-62 digit 51: `BASE62 = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'`; `BASE62[51] = 'P'`

  Use `G.RGB.RED`, `G.RGB.YELLOW`, etc. (where `G = global.Generator`) to reference colours in tests.

- [ ] **Step 2: Run tests to confirm they fail**

  ```bash
  node tests/test-url.js
  ```
  Expected: `Error: Cannot find module '../url.js'`

- [ ] **Step 3: Create `url.js` with `encodeGrid` implementation**

  Structure (mirrors `generator.js`):
  ```js
  (function (exports) {

    var BASE62 = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

    // Full 6-colour palette: Generator.COLOURS (0-4) + BLACK (5)
    function palette() {
      return Generator.COLOURS.concat([Generator.RGB.BLACK]);
    }

    function encodeGrid(grid) { ... }
    function decodeGrid(str, rows, cols) { ... }
    function buildHash(gridSize, sequence, grid) { ... }
    function parseHash(hash) { ... }

    exports.encodeGrid  = encodeGrid;
    exports.decodeGrid  = decodeGrid;
    exports.buildHash   = buildHash;
    exports.parseHash   = parseHash;

    if (typeof module !== 'undefined') module.exports = exports;
    else self.MazeURL = exports;

  }({}));
  ```

  Implement `encodeGrid(grid)`:
  1. Call `palette()` to get the 6-colour array.
  2. Flatten `grid` row-major into an `indices` array: for each cell, `palette.indexOf(cell)`.
  3. Convert `indices` to a BigInt by iterating left-to-right: `n = n * 6n + BigInt(indices[i])`.
  4. If `n === 0n`, return `'0'`.
  5. Build the base-62 string: repeatedly `n % 62n` gives the next digit (prepend to result), `n = n / 62n` (integer division with BigInt), until `n === 0n`.
  6. Return the string.

  Leave `decodeGrid`, `buildHash`, `parseHash` as stub functions that throw `'not implemented'`.

- [ ] **Step 4: Run tests and confirm they pass**

  ```bash
  node tests/test-url.js
  ```
  Expected: all `encodeGrid` tests pass, stubs throw (those tests don't exist yet — only encodeGrid tests run).

- [ ] **Step 5: Commit**

  ```bash
  git add url.js tests/test-url.js
  git commit -m "feat: add url.js skeleton with encodeGrid"
  ```

---

### Task 2: Implement `decodeGrid`

**Files:**
- Modify: `url.js`
- Modify: `tests/test-url.js`

**Status:** Not started

- [ ] **Step 1: Write failing tests for `decodeGrid`**

  Under `console.log('-- decodeGrid --')` in `tests/test-url.js`:

  - `decodeGrid('0', 1, 1)` → `[[RED]]`
  - `decodeGrid('1', 1, 1)` → `[[YELLOW]]`
  - `decodeGrid('5', 1, 1)` → `[[BLACK]]`
  - `decodeGrid('P', 2, 2)` → `[[RED, YELLOW], [BLUE, GREEN]]`
  - Round-trip: `encodeGrid` then `decodeGrid` with a 3×3 grid containing all five colours plus BLACK.

  For the round-trip, build a 3×3 grid manually (3 rows × 3 cols = 9 cells), fill with some mix of palette colours, encode it, decode it, and `assert.deepStrictEqual` the result to the original.

- [ ] **Step 2: Run tests to confirm they fail**

  ```bash
  node tests/test-url.js
  ```
  Expected: decodeGrid tests fail with `'not implemented'`.

- [ ] **Step 3: Implement `decodeGrid(str, rows, cols)` in `url.js`**

  1. Convert the base-62 string to a BigInt: for each character, `n = n * 62n + BigInt(BASE62.indexOf(char))`.
  2. Extract `rows * cols` base-6 digits from the BigInt (LSB first, so collect into an array and reverse):
     - Create `indices = []`, loop `rows * cols` times: `indices.push(Number(n % 6n)); n = n / 6n`.
     - Reverse `indices` so index 0 = top-left cell.
  3. Build the 2D grid: for row `r`, col `c`, set `grid[r][c] = palette()[indices[r * cols + c]]`.
  4. Return the grid.

- [ ] **Step 4: Run tests and confirm they pass**

  ```bash
  node tests/test-url.js
  ```
  Expected: all encodeGrid and decodeGrid tests pass.

- [ ] **Step 5: Commit**

  ```bash
  git add url.js tests/test-url.js
  git commit -m "feat: implement decodeGrid in url.js"
  ```

---

### Task 3: Implement `buildHash` and `parseHash`

**Files:**
- Modify: `url.js`
- Modify: `tests/test-url.js`

**Background:**
- Sequence letters come from `Generator.RGB.L` which maps hex → letter (`R`, `Y`, `B`, `G`, `P`).
- Reverse mapping for parseHash: `{ R: RGB.RED, Y: RGB.YELLOW, B: RGB.BLUE, G: RGB.GREEN, P: RGB.PURPLE }`.
- `parseHash` returns `null` for empty/invalid hash; `{ gridSize, sequence, grid }` for valid.

**Status:** Not started

- [ ] **Step 1: Write failing tests for `buildHash` and `parseHash`**

  Under `console.log('-- buildHash --')`:

  - `buildHash(7, [RED, YELLOW, BLUE], [[RED]])` returns a string starting with `'#s=7&c=RYB&g='`
  - `buildHash(5, [RED, BLUE], [[BLACK]])` returns `'#s=5&c=RB&g=5'` (BLACK→index 5→`'5'`)
  - The `g` part of `buildHash(5, [RED, BLUE], [[RED]])` equals `'0'`

  Under `console.log('-- parseHash --')`:

  - `parseHash('')` → `null`
  - `parseHash('#')` → `null`
  - `parseHash('#s=5&c=RB&g=5')` → `{ gridSize: 5, sequence: [RED, BLUE], grid: [[BLACK]] }`
  - `parseHash('#s=5&c=RB')` (no `g`) → `null`
  - `parseHash('#s=5&g=0')` (no `c`) → `null`
  - `parseHash('#s=5&c=RX&g=0')` (invalid letter `X`) → `null`
  - Round-trip: `parseHash(buildHash(7, [RED, YELLOW, BLUE], threeByThreeGrid))` deep-equals `{ gridSize: 7, sequence: [RED, YELLOW, BLUE], grid: threeByThreeGrid }` — use any 7×7 grid you like, but keep it small for test clarity; a 3×3 grid with `gridSize=3` is fine.

- [ ] **Step 2: Run tests to confirm they fail**

  ```bash
  node tests/test-url.js
  ```
  Expected: buildHash and parseHash tests fail with `'not implemented'`.

- [ ] **Step 3: Implement `buildHash(gridSize, sequence, grid)` in `url.js`**

  1. Map each colour in `sequence` to its letter via `Generator.RGB.L[colour]` and join into a string (e.g. `[RED, YELLOW, BLUE]` → `'RYB'`).
  2. Encode the grid: `var g = encodeGrid(grid)`.
  3. Return `'#s=' + gridSize + '&c=' + letters + '&g=' + g`.

- [ ] **Step 4: Implement `parseHash(hash)` in `url.js`**

  ```
  letterToColour = { R: RGB.RED, Y: RGB.YELLOW, B: RGB.BLUE, G: RGB.GREEN, P: RGB.PURPLE }
  ```
  where `RGB = Generator.RGB`.

  1. If `hash` is falsy or equal to `'#'` or `''`, return `null`.
  2. Strip the leading `#`: `var str = hash.charAt(0) === '#' ? hash.slice(1) : hash`.
  3. Split on `'&'` and split each part on `'='` to build a `params` object.
  4. Parse `gridSize = parseInt(params.s, 10)`. If `isNaN(gridSize)` or `gridSize < 1`, return `null`.
  5. If `!params.c`, return `null`. Map each character of `params.c` through `letterToColour`; if any character is not in the map, return `null`. If the resulting sequence is empty, return `null`.
  6. If `!params.g`, return `null`.
  7. Decode the grid: `var grid = decodeGrid(params.g, gridSize, gridSize)`. Wrap in try/catch; return `null` on error.
  8. Return `{ gridSize: gridSize, sequence: sequence, grid: grid }`.

- [ ] **Step 5: Run tests and confirm they pass**

  ```bash
  node tests/test-url.js
  ```
  Expected: all tests pass.

- [ ] **Step 6: Also run the generator tests to confirm no regression**

  ```bash
  node tests/test-generator.js
  ```
  Expected: 71 passed, 0 failed.

- [ ] **Step 7: Commit**

  ```bash
  git add url.js tests/test-url.js
  git commit -m "feat: implement buildHash and parseHash in url.js"
  ```

---

### Task 4: `game.js` — push history on maze generation and navigation

**Files:**
- Modify: `game.js`

**Background:** `MazeURL` is available as a global because `url.js` is loaded before `game.js`.

**Status:** Not started

- [ ] **Step 1: Add `history.pushState` to `startGame` after `renderGrid()`**

  In `game.js`, in the `mazeWorker` message handler, after the call to `renderGrid()` (currently the last line of the handler), add:

  ```js
  history.pushState(null, '', MazeURL.buildHash(state.gridSize, state.sequence, maze.grid));
  ```

  (`maze` is already in scope as the local variable from `e.data.maze`.)

- [ ] **Step 2: Add `history.pushState` to the menu button handler**

  In `initMenu()`, the menu button handler currently reads:
  ```js
  document.getElementById('menu-btn').addEventListener('click', function () { showScreen('menu-screen'); });
  ```

  Change it to:
  ```js
  document.getElementById('menu-btn').addEventListener('click', function () {
    history.pushState(null, '', '#');
    showScreen('menu-screen');
  });
  ```

- [ ] **Step 3: Add `history.pushState` to the win overlay OK handler**

  In `initMenu()`, the win-ok handler currently reads:
  ```js
  document.getElementById('win-ok-btn').addEventListener('click', function () {
    document.getElementById('win-overlay').classList.remove('active');
  });
  ```

  Change it to:
  ```js
  document.getElementById('win-ok-btn').addEventListener('click', function () {
    history.pushState(null, '', '#');
    document.getElementById('win-overlay').classList.remove('active');
  });
  ```

- [ ] **Step 4: Commit**

  ```bash
  git add game.js
  git commit -m "feat: push URL hash on maze start and navigation"
  ```

---

### Task 5: `game.js` — popstate handler and page-load hash restore

**Files:**
- Modify: `game.js`

**Status:** Not started

- [ ] **Step 1: Add `restoreMaze` function to `game.js`**

  Add this function before `initMenu`:

  ```js
  function restoreMaze(parsed) {
    var maze = {
      grid:     parsed.grid,
      sequence: parsed.sequence,
      rows:     parsed.gridSize,
      cols:     parsed.gridSize,
    };
    state.maze        = maze;
    state.gridSize    = parsed.gridSize;
    state.sequence    = parsed.sequence;
    state.currentPos  = { row: maze.rows - 1, col: 0 };
    state.currentStep = 1;
    state.path        = [{ row: maze.rows - 1, col: 0 }];
    state.visited     = {};
    state.visited[(maze.rows - 1) + ',0'] = true;
    renderSequenceBar();
    renderGrid();
    showScreen('game-screen');
  }
  ```

- [ ] **Step 2: Register a `popstate` handler inside `initMenu`**

  At the end of `initMenu()` (after the existing event listener registrations), add:

  ```js
  window.addEventListener('popstate', function () {
    var parsed = MazeURL.parseHash(location.hash);
    if (parsed) {
      restoreMaze(parsed);
    } else {
      showScreen('menu-screen');
    }
  });
  ```

- [ ] **Step 3: Check hash on page load inside `initMenu`**

  At the very end of `initMenu()` (after the `popstate` registration), add:

  ```js
  var parsed = MazeURL.parseHash(location.hash);
  if (parsed) {
    restoreMaze(parsed);
  }
  ```

  This means: if the user navigates directly to `index.html#s=7&c=RYB&g=...`, the game screen is shown immediately with that maze — no generation needed.

- [ ] **Step 4: Commit**

  ```bash
  git add game.js
  git commit -m "feat: restore maze from URL hash on load and popstate"
  ```

---

### Task 6: `index.html` — add `url.js` script tag

**Files:**
- Modify: `index.html`

**Status:** Not started

- [ ] **Step 1: Add the `url.js` script tag**

  In `index.html`, the current script block near the bottom reads:
  ```html
  <script src="generator.js"></script>
    <script src="game.js"></script>
  ```

  Change it to:
  ```html
  <script src="generator.js"></script>
  <script src="url.js"></script>
  <script src="game.js"></script>
  ```

  Load order matters: `generator.js` → `url.js` → `game.js`.

- [ ] **Step 2: Run all unit tests to confirm nothing is broken**

  ```bash
  node tests/test-generator.js && node tests/test-url.js
  ```
  Expected: all tests pass.

- [ ] **Step 3: Commit**

  ```bash
  git add index.html
  git commit -m "feat: load url.js in index.html"
  ```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Task |
|-----------------|------|
| URL format `#s=...&c=...&g=...` | Task 3 (buildHash) |
| Grid encoding (base-6 → base-62) | Task 1 (encodeGrid) |
| Grid decoding | Task 2 (decodeGrid) |
| BLACK appended as index 5 | Task 1 (palette fn) |
| `MazeURL.encodeGrid`, `.decodeGrid`, `.buildHash`, `.parseHash` | Tasks 1–3 |
| pushState on new maze | Task 4 |
| pushState on Another (new-game-btn-2) | Task 4 — `new-game-btn-2` calls `startGame`, which already pushes state after Task 4 |
| pushState on Menu button | Task 4 |
| pushState on Win overlay OK | Task 4 |
| popstate handler | Task 5 |
| Page load: restore maze from hash | Task 5 |
| `<script src="url.js">` before `game.js` | Task 6 |
| `url.js` depends on `generator.js` | All tasks — tests set `global.Generator` first |
| No changes to generator.js, generator-worker.js, style.css, test-generator.js | All tasks ✓ |
| Tests in `tests/test-url.js` | Tasks 1–3 |
