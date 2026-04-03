# New Generator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task.
> Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the generate-then-repair algorithm in `generator.js` with a
constraint-propagation algorithm that guarantees a unique solution by construction,
add a Web Worker for non-blocking generation, and update `game.js` accordingly.

**Why:** The current `repairUniqueness` loop fails for seq-2 on 7×7 grids because
shortcut paths that travel entirely through solution cells cannot be broken by
recolouring non-solution cells. The new algorithm prevents shortcuts from forming
during path generation and blocks alternatives via `cannot` propagation before any
cell colour is chosen.

---

## File Map

| File | Change |
|------|--------|
| `generator.js` | Full rewrite of generation pipeline; keep utilities |
| `generator-worker.js` | New file — thin Web Worker wrapper |
| `game.js` | Replace synchronous `startGame` with Worker-based version |
| `tests/test-generator.js` | Add tests for every new exported function |

---

## Task A — Rewrite `generator.js`

**Files:** `generator.js`

### Overview of the new pipeline

```
generateMaze(rows, cols, seqLen)
  └─ loop until success (max 500 attempts):
       1. generateSolutionPath   → path[]  (or null → retry)
       2. hasShortcut            → boolean (if true → retry)
       3. buildCannot            → cannot[][]
       4. buildDeadEnds          → mutates cellStep[][]
       5. fillRemaining          → mutates cellStep[][]
       6. colour cells from cellStep → grid[][]
       7. return { grid, sequence, rows, cols }
```

### Step-by-step

- [ ] **A-1  Add `BLACK_COLOUR` constant**

  After `SEQUENCE_MAP`, add:

  ```javascript
  var BLACK_COLOUR = '#222222';
  ```

- [ ] **A-2  Change the browser export from `window.Generator` to `self.Generator`**

  At the bottom of the IIFE change:

  ```javascript
  else window.Generator = exports;
  ```
  to:
  ```javascript
  else self.Generator = exports;
  ```

  `self` works in both `window` (main thread) and `DedicatedWorkerGlobalScope`.

- [ ] **A-3  Write `generateSolutionPath(rows, cols, seqLen)`**

  Returns an array of `{row, col}` objects or `null` if no valid path found in
  200 attempts. Rules:
  - Start: `{ row: rows-1, col: 0 }`, End: `{ row: 0, col: cols-1 }`.
  - No cell revisited.
  - Minimum length: `Math.ceil(rows * cols * 0.4)`.
  - **Inline shortcut pruning**: before pushing candidate at index `k`, check
    all path cells `path[j]` with `j < k-1` that are grid-adjacent to the
    candidate. If `(j+1) % seqLen === k % seqLen`, skip this direction.

  Key data structure: `pathIndexAt` object (`cellKey → index`) maintained
  in sync with the path array to enable O(1) index lookup during pruning.

  ```javascript
  function generateSolutionPath(rows, cols, seqLen) {
    var minLen = Math.ceil(rows * cols * 0.4);
    var start  = { row: rows - 1, col: 0 };
    var end    = { row: 0, col: cols - 1 };
    var DIRS   = [[-1,0],[1,0],[0,-1],[0,1]];

    for (var attempt = 0; attempt < 200; attempt++) {
      var pathIndexAt = {};
      var path = [{ row: start.row, col: start.col }];
      pathIndexAt[cellKey(start.row, start.col)] = 0;

      var result = (function dfs(row, col) {
        if (row === end.row && col === end.col) {
          return path.length >= minLen ? path.slice() : null;
        }
        var k = path.length;
        var dirs = shuffle(DIRS);
        for (var i = 0; i < dirs.length; i++) {
          var nr = row + dirs[i][0], nc = col + dirs[i][1];
          var nk = cellKey(nr, nc);
          if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
          if (pathIndexAt[nk] !== undefined) continue;
          // Shortcut pruning: check all grid-neighbours of candidate
          var shortcut = false;
          for (var d = 0; d < DIRS.length && !shortcut; d++) {
            var ar = nr + DIRS[d][0], ac = nc + DIRS[d][1];
            var ak = cellKey(ar, ac);
            if (pathIndexAt[ak] !== undefined) {
              var j = pathIndexAt[ak];
              if (j < k - 1 && (j + 1) % seqLen === k % seqLen) shortcut = true;
            }
          }
          if (shortcut) continue;
          path.push({ row: nr, col: nc });
          pathIndexAt[nk] = k;
          var found = dfs(nr, nc);
          if (found) return found;
          path.pop();
          delete pathIndexAt[nk];
        }
        return null;
      }(start.row, start.col));

      if (result) return result;
    }
    return null;
  }
  ```

- [ ] **A-4  Write `hasShortcut(path, seqLen)`**

  Post-generation safety net. Returns `true` if any shortcut exists.

  ```javascript
  function hasShortcut(path, seqLen) {
    var indexAt = {};
    for (var i = 0; i < path.length; i++) {
      indexAt[cellKey(path[i].row, path[i].col)] = i;
    }
    var DIRS = [[-1,0],[1,0],[0,-1],[0,1]];
    for (var i = 0; i < path.length; i++) {
      for (var d = 0; d < DIRS.length; d++) {
        var nr = path[i].row + DIRS[d][0], nc = path[i].col + DIRS[d][1];
        var nk = cellKey(nr, nc);
        if (indexAt[nk] !== undefined) {
          var j = indexAt[nk];
          if (Math.abs(i - j) !== 1 && (i + 1) % seqLen === j % seqLen) return true;
        }
      }
    }
    return false;
  }
  ```

- [ ] **A-5  Write `buildCannot(rows, cols, path, seqLen, sequence)`**

  Returns `cannot[r][c]` — a 2-D array, each element a boolean array of length
  `seqLen`. `true` = forbidden step.

  Rules:
  1. For End cell at step `endStep = (path.length-1) % seqLen`: find all steps
     `s` where `sequence[s] === sequence[endStep]` → `S_CELL`. Compute
     `S_BEFORE = { (s-1+seqLen)%seqLen : s in S_CELL }`. Mark those steps
     forbidden in every non-sol cell adjacent to End.
  2. For every other sol cell at path index `i`, step `s = i % seqLen`:
     `before = (s-1+seqLen) % seqLen`. Mark `before` forbidden in adjacent
     non-sol cells.

  ```javascript
  function buildCannot(rows, cols, path, seqLen, sequence) {
    var DIRS = [[-1,0],[1,0],[0,-1],[0,1]];
    var isSol = {};
    for (var i = 0; i < path.length; i++) {
      isSol[cellKey(path[i].row, path[i].col)] = true;
    }

    var cannot = [];
    for (var r = 0; r < rows; r++) {
      cannot[r] = [];
      for (var c = 0; c < cols; c++) {
        cannot[r][c] = [];
        for (var s = 0; s < seqLen; s++) cannot[r][c][s] = false;
      }
    }

    function forbidAdjacent(row, col, steps) {
      for (var d = 0; d < DIRS.length; d++) {
        var nr = row + DIRS[d][0], nc = col + DIRS[d][1];
        if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
        if (isSol[cellKey(nr, nc)]) continue;
        for (var si = 0; si < steps.length; si++) cannot[nr][nc][steps[si]] = true;
      }
    }

    // End cell
    var endIdx  = path.length - 1;
    var endStep = endIdx % seqLen;
    var endColour = sequence[endStep];
    var sBefore = [];
    for (var s = 0; s < seqLen; s++) {
      if (sequence[s] === endColour) sBefore.push((s - 1 + seqLen) % seqLen);
    }
    forbidAdjacent(path[endIdx].row, path[endIdx].col, sBefore);

    // All other sol cells
    for (var i = 0; i < endIdx; i++) {
      var step   = i % seqLen;
      var before = (step - 1 + seqLen) % seqLen;
      forbidAdjacent(path[i].row, path[i].col, [before]);
    }

    return cannot;
  }
  ```

- [ ] **A-6  Write `buildDeadEnds(rows, cols, cellStep, cannot, seqLen)`**

  `cellStep[r][c]` is pre-populated for sol cells; `null` elsewhere. Repeatedly
  extends assigned steps into adjacent unassigned cells where the next step is
  permitted.

  ```javascript
  function buildDeadEnds(rows, cols, cellStep, cannot, seqLen) {
    var DIRS = [[-1,0],[1,0],[0,-1],[0,1]];
    var changed = true;
    while (changed) {
      changed = false;
      for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
          if (cellStep[r][c] === null) continue;
          var next = (cellStep[r][c] + 1) % seqLen;
          for (var d = 0; d < DIRS.length; d++) {
            var nr = r + DIRS[d][0], nc = c + DIRS[d][1];
            if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
            if (cellStep[nr][nc] !== null) continue;
            if (!cannot[nr][nc][next]) {
              cellStep[nr][nc] = next;
              changed = true;
            }
          }
        }
      }
    }
  }
  ```

- [ ] **A-7  Write `fillRemaining(rows, cols, cellStep, cannot, seqLen)`**

  For each still-`null` cell: pick a random allowed step; assign `-1` if all
  steps are forbidden.

  ```javascript
  function fillRemaining(rows, cols, cellStep, cannot, seqLen) {
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        if (cellStep[r][c] !== null) continue;
        var allowed = [];
        for (var s = 0; s < seqLen; s++) {
          if (!cannot[r][c][s]) allowed.push(s);
        }
        cellStep[r][c] = allowed.length > 0
          ? allowed[Math.floor(Math.random() * allowed.length)]
          : -1;
      }
    }
  }
  ```

- [ ] **A-8  Rewrite `generateMaze(rows, cols, seqLength)`**

  ```javascript
  function generateMaze(rows, cols, seqLength) {
    var sequence = getSequence(seqLength);
    var MAX = 500;
    for (var attempt = 0; attempt < MAX; attempt++) {
      var path = generateSolutionPath(rows, cols, seqLength);
      if (!path) continue;
      if (hasShortcut(path, seqLength)) continue;

      var isSol = {};
      var cellStep = [];
      for (var r = 0; r < rows; r++) { cellStep[r] = []; for (var c = 0; c < cols; c++) cellStep[r][c] = null; }
      for (var i = 0; i < path.length; i++) {
        isSol[cellKey(path[i].row, path[i].col)] = true;
        cellStep[path[i].row][path[i].col] = i % seqLength;
      }

      var cannot = buildCannot(rows, cols, path, seqLength, sequence);
      buildDeadEnds(rows, cols, cellStep, cannot, seqLength);
      fillRemaining(rows, cols, cellStep, cannot, seqLength);

      var grid = createGrid(rows, cols);
      for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
          var s = cellStep[r][c];
          grid[r][c].colour = (s === -1) ? BLACK_COLOUR : sequence[s];
        }
      }
      return { grid: grid, sequence: sequence, rows: rows, cols: cols };
    }
    // Fallback: return last attempt regardless
    var path = generateSolutionPath(rows, cols, seqLength) || [{ row: rows-1, col: 0 }, { row: 0, col: cols-1 }];
    var grid = createGrid(rows, cols);
    for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) grid[r][c].colour = sequence[0];
    grid[rows-1][0].colour   = sequence[0];
    grid[0][cols-1].colour   = sequence[path.length > 1 ? (path.length-1) % seqLength : 0];
    return { grid: grid, sequence: sequence, rows: rows, cols: cols };
  }
  ```

  Note: the fallback should be unreachable in practice. It exists only to satisfy
  the "never return null" contract.

- [ ] **A-9  Update exports**

  Replace old exports with:

  ```javascript
  exports.COLOURS               = COLOURS;
  exports.BLACK_COLOUR          = BLACK_COLOUR;
  exports.getSequence           = getSequence;
  exports.getLabelColour        = getLabelColour;
  exports.generateMaze          = generateMaze;
  exports._shuffle              = shuffle;
  exports._cellKey              = cellKey;
  exports._createGrid           = createGrid;
  exports._generateSolutionPath = generateSolutionPath;
  exports._hasShortcut          = hasShortcut;
  exports._buildCannot          = buildCannot;
  exports._buildDeadEnds        = buildDeadEnds;
  exports._fillRemaining        = fillRemaining;
  ```

  Remove old exports: `_generatePath`, `_assignPathColours`, `_fillGrid`,
  `_countPaths`, `_repairUniqueness`, `_findAnyPath`.

- [ ] **A-10  Remove old functions**

  Delete the bodies of `generatePath`, `assignPathColours`, `fillGrid`,
  `smartFillGrid`, `countPaths`, `findAnyPath`, `findAlternativePath`,
  `repairUniqueness`.

**Success criteria:**
- `node tests/test-generator.js` passes.
- `generateMaze(7,7,2)` called 10 times in Node never throws or hangs.

---

## Task B — Create `generator-worker.js`

**Files:** `generator-worker.js` (new)

- [ ] **B-1  Create the file**

  ```javascript
  // generator-worker.js
  importScripts('generator.js');

  self.addEventListener('message', function (e) {
    var d    = e.data;
    var maze = self.Generator.generateMaze(d.rows, d.cols, d.seqLen);
    self.postMessage({ maze: maze });
  });
  ```

**Success criteria:**
- File exists. Worker responds to a `{ rows, cols, seqLen }` message with
  `{ maze }`. No console errors on load.

---

## Task C — Update `game.js` to use the Web Worker

**Files:** `game.js`, `style.css`

- [ ] **C-1  Add module-level worker variable**

  After the `state` object add:

  ```javascript
  var mazeWorker = null;
  ```

- [ ] **C-2  Add `.generating-msg` CSS rule to `style.css`**

  ```css
  .generating-msg {
    grid-column: 1 / -1;
    padding: 40px 0;
    text-align: center;
    color: #888;
    font-size: 18px;
  }
  ```

- [ ] **C-3  Rewrite `startGame()`**

  ```javascript
  function startGame() {
    showScreen('game-screen');

    // Show spinner immediately
    var gridEl = document.getElementById('maze-grid');
    gridEl.style.gridTemplateColumns = '';
    gridEl.innerHTML = '<div class="generating-msg">Generating\u2026</div>';
    document.getElementById('sequence-bar').innerHTML = '';

    // Terminate any previous worker
    if (mazeWorker) { mazeWorker.terminate(); mazeWorker = null; }

    mazeWorker = new Worker('generator-worker.js');
    mazeWorker.addEventListener('message', function (e) {
      mazeWorker = null;
      var maze = e.data.maze;
      state.maze        = maze;
      state.currentPos  = { row: maze.rows - 1, col: 0 };
      state.currentStep = 1;
      state.visited     = {};
      state.visited[(maze.rows - 1) + ',0'] = true;
      renderSequenceBar();
      renderGrid();
    });

    mazeWorker.postMessage({ rows: state.gridSize, cols: state.gridSize, seqLen: state.seqLength });
  }
  ```

**Success criteria:**
- "Generating…" appears immediately on click.
- Grid renders after worker responds.
- Rapid double-click does not produce two concurrent workers.

---

## Task D — Update `tests/test-generator.js`

**Files:** `tests/test-generator.js`

- [ ] **D-1  Keep utility tests unchanged** (`COLOURS`, `getSequence`, `getLabelColour`).

- [ ] **D-2  Replace "Path Generation" tests** with tests for `_generateSolutionPath`:
  - path starts at `{row: rows-1, col: 0}`
  - path ends at `{row: 0, col: cols-1}`
  - all moves are orthogonal
  - no cell repeated
  - length ≥ 40% of grid
  - `_hasShortcut` returns false on a generated path
  - `_hasShortcut` returns true on a manually crafted shortcut

- [ ] **D-3  Add cannot / propagation / dead-end / fill tests**:
  - `buildCannot`: non-sol cell adjacent to End has correct before-step forbidden
  - `buildCannot`: non-sol cell adjacent to other sol cells has correct before-step forbidden
  - `buildCannot`: sol cells have no cannot entries
  - `fillRemaining`: no cell remains null after the full pipeline
  - `fillRemaining`: all steps are in range `[-1, seqLen-1]`

- [ ] **D-4  Update `generateMaze` end-to-end tests**:
  - shape is correct (rows/cols/seqLen)
  - start cell has colour `sequence[0]`
  - `generateMaze(7,7,2)` completes without error
  - `generateMaze(7,7,3)` completes without error
  - `generateMaze(10,10,3)` completes without error

- [ ] **D-5  Remove references to deleted exports**:
  `_generatePath`, `_assignPathColours`, `_fillGrid`, `_repairUniqueness`,
  `_findAnyPath`, `_countPaths`.

**Success criteria:**
- `node tests/test-generator.js` exits with 0 failures.

---

## Task E — End-to-end browser verification

Serve from a local HTTP server (Web Workers require same-origin):

```bash
python3 -m http.server 8080
```

- [ ] **E-1** No console errors on page load.
- [ ] **E-2** 5×5 / seq-3: "Generating…" → grid renders → can navigate to win.
- [ ] **E-3** 7×7 / seq-2 (the known failure case): generates 5 times without hanging.
- [ ] **E-4** Rapid "New Game" clicks: only one grid ultimately appears.
- [ ] **E-5** 10×10 / seq-5: no crash; black cells render if present.
- [ ] **E-6** Final `node tests/test-generator.js` run: 0 failures.
