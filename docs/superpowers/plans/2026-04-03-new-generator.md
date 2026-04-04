# New Generator Implementation Plan

> **Status: Completed** — All tasks implemented as of 2026-04-04. Tasks are marked `[x]`.

**Goal:** Replace the generate-then-repair algorithm in `generator.js` with a
constraint-propagation algorithm that guarantees a unique solution by construction,
add a Web Worker for non-blocking generation, and update `game.js` accordingly.

**Why:** The previous `repairUniqueness` loop failed for repeated-colour sequences
(e.g. [R,B,B]) on larger grids because shortcut paths that travel entirely through
solution cells could not be broken by recolouring non-solution cells. The new
algorithm prevents shortcuts from forming during path generation (using colour
comparison, not step-index comparison) and blocks alternatives via `cannot`
constraints before any non-solution cell colour is chosen.

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

### Overview of the pipeline

```
generateMaze(rows, cols, sequence)
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

- [x] **A-1  Add `BLACK_COLOUR` constant**

  ```javascript
  var BLACK_COLOUR = '#000000';
  ```

- [x] **A-2  Change the browser export from `window.Generator` to `self.Generator`**

  ```javascript
  else self.Generator = exports;
  ```

  `self` works in both `window` (main thread) and `DedicatedWorkerGlobalScope`.

- [x] **A-3  Write `generateSolutionPath(rows, cols, seqLen, sequence)`**

  Returns an array of `{row, col}` objects or `null` if no valid path found in
  200 attempts. Rules:
  - Start: `{ row: rows-1, col: 0 }`, End: `{ row: 0, col: cols-1 }`.
  - No cell revisited.
  - Minimum length: `Math.ceil(rows * cols * 0.4)`.
  - **Inline shortcut pruning**: before pushing candidate at index `k`, check
    all path cells `path[j]` with `j < k-1` that are grid-adjacent to the
    candidate. Reject if `sequence[(j+1) % seqLen] === sequence[k % seqLen]`
    OR `sequence[(k+1) % seqLen] === sequence[j % seqLen]`.
    Uses **colour comparison** (not step-index) so repeated-colour sequences
    like [R,B,B] are handled correctly.
  - A per-attempt node limit (`rows * cols * 20`) allows fast retries.

  Key data structure: `pathIndexAt` object (`cellKey → index`) maintained
  in sync with the path array to enable O(1) index lookup during pruning.

  ```javascript
  function generateSolutionPath(rows, cols, seqLen, sequence) {
    var minLen = Math.ceil(rows * cols * 0.4);
    var start  = { row: rows - 1, col: 0 };
    var end    = { row: 0, col: cols - 1 };
    var DIRS   = [[-1,0],[1,0],[0,-1],[0,1]];
    var nodeLimit = rows * cols * 20;

    for (var attempt = 0; attempt < 200; attempt++) {
      var pathIndexAt = {};
      var path = [{ row: start.row, col: start.col }];
      pathIndexAt[cellKey(start.row, start.col)] = 0;
      var nodesVisited = 0;

      var result = (function dfs(row, col) {
        if (++nodesVisited > nodeLimit) return null;
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
          var shortcut = false;
          for (var d = 0; d < DIRS.length && !shortcut; d++) {
            var ar = nr + DIRS[d][0], ac = nc + DIRS[d][1];
            var ak = cellKey(ar, ac);
            if (pathIndexAt[ak] !== undefined) {
              var j = pathIndexAt[ak];
              if (j < k - 1) {
                if (sequence[(j + 1) % seqLen] === sequence[k % seqLen]) shortcut = true;
                if (sequence[(k + 1) % seqLen] === sequence[j % seqLen]) shortcut = true;
              }
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

- [x] **A-4  Write `hasShortcut(path, seqLen, sequence)`**

  Post-generation safety net. Returns `true` if any shortcut exists.
  Compares colours (not step indices) to correctly handle repeated-colour sequences.

  ```javascript
  function hasShortcut(path, seqLen, sequence) {
    var indexAt = {};
    for (var p = 0; p < path.length; p++) {
      indexAt[cellKey(path[p].row, path[p].col)] = p;
    }
    var DIRS = [[-1,0],[1,0],[0,-1],[0,1]];
    for (var i = 0; i < path.length; i++) {
      for (var d = 0; d < DIRS.length; d++) {
        var nr = path[i].row + DIRS[d][0], nc = path[i].col + DIRS[d][1];
        var nk = cellKey(nr, nc);
        if (indexAt[nk] !== undefined) {
          var j = indexAt[nk];
          if (Math.abs(i - j) !== 1 && sequence[(i + 1) % seqLen] === sequence[j % seqLen]) return true;
        }
      }
    }
    return false;
  }
  ```

- [x] **A-5  Write `buildCannot(rows, cols, path, seqLen, sequence)`**

  Returns `cannot[r][c]` — a 2-D array, each element a boolean array of length
  `seqLen`. `true` = forbidden step.

  For each non-End solution cell at path index i:
  1. Compute **exit colour**: `sequence[(i % seqLen + 1) % seqLen]`.
  2. Find **all steps s** where `sequence[s] === exitColour`.
  3. Mark those steps forbidden on every adjacent non-solution cell.

  This ensures the player cannot leave the solution path: from every solution cell,
  the only adjacent cell with the exit colour is the next solution cell.

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

    var endIdx = path.length - 1;
    for (var i = 0; i < endIdx; i++) {
      var exitColour = sequence[(i % seqLen + 1) % seqLen];
      for (var d = 0; d < DIRS.length; d++) {
        var nr = path[i].row + DIRS[d][0], nc = path[i].col + DIRS[d][1];
        if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
        if (isSol[cellKey(nr, nc)]) continue;
        for (var s = 0; s < seqLen; s++) {
          if (sequence[s] === exitColour) cannot[nr][nc][s] = true;
        }
      }
    }

    return cannot;
  }
  ```

- [x] **A-5b  Write `propagateCannot(cannot, rows, cols, seqLen, isSol)`** *(exported, not called in pipeline)*

  Spreads cannot constraints transitively: if cell C cannot be step t, adjacent
  non-solution cells cannot be step `(t-1+seqLen)%seqLen`. Iterates to fixpoint.
  Exported as `_propagateCannot` for testing but not called in `generateMaze`.

- [x] **A-6  Write `buildDeadEnds(rows, cols, cellStep, cannot, seqLen)`**

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

- [x] **A-7  Write `fillRemaining(rows, cols, cellStep, cannot, seqLen)`**

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

- [x] **A-8  Rewrite `generateMaze(rows, cols, sequence)`**

  Takes the full `sequence` array (not an integer seqLength). There is no
  `getSequence()` helper; callers pass the sequence directly from `Generator.SEQUENCES`.

  ```javascript
  function generateMaze(rows, cols, sequence) {
    var seqLength = sequence.length;
    for (var attempt = 0; attempt < 500; attempt++) {
      var path = generateSolutionPath(rows, cols, seqLength, sequence);
      if (!path) continue;
      if (hasShortcut(path, seqLength, sequence)) continue;

      var isSol = {};
      var cellStep = [];
      for (var r = 0; r < rows; r++) {
        cellStep[r] = [];
        for (var c = 0; c < cols; c++) cellStep[r][c] = null;
      }
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
    // Unreachable in practice — minimal fallback
    var grid = createGrid(rows, cols);
    for (var r = 0; r < rows; r++)
      for (var c = 0; c < cols; c++)
        grid[r][c].colour = sequence[0];
    return { grid: grid, sequence: sequence, rows: rows, cols: cols };
  }
  ```

- [x] **A-9  Update exports**

  ```javascript
  exports.COLOURS               = COLOURS;
  exports.SEQUENCES             = SEQUENCES;
  exports.BLACK_COLOUR          = BLACK_COLOUR;
  exports.getLabelColour        = getLabelColour;
  exports.generateMaze          = generateMaze;
  exports._shuffle              = shuffle;
  exports._cellKey              = cellKey;
  exports._createGrid           = createGrid;
  exports._generateSolutionPath = generateSolutionPath;
  exports._hasShortcut          = hasShortcut;
  exports._buildCannot          = buildCannot;
  exports._propagateCannot      = propagateCannot;
  exports._buildDeadEnds        = buildDeadEnds;
  exports._fillRemaining        = fillRemaining;
  ```

  Note: no `getSequence` export — sequences are accessed via `SEQUENCES` array.

**Success criteria:** ✓
- `node tests/test-generator.js` passes (34 tests).
- All 7 sequences generate without hanging on 5×5 through 10×10.

---

## Task B — Create `generator-worker.js`

**Files:** `generator-worker.js` (new)

- [x] **B-1  Create the file**

  ```javascript
  // generator-worker.js
  importScripts('generator.js');

  self.addEventListener('message', function (e) {
    var d    = e.data;
    var maze = self.Generator.generateMaze(d.rows, d.cols, d.sequence);
    self.postMessage({ maze: maze });
  });
  ```

  Note: the worker receives `{ rows, cols, sequence }` (not `seqLen`) and passes
  the sequence array directly to `generateMaze`.

**Success criteria:** ✓

---

## Task C — Update `game.js` to use the Web Worker

**Files:** `game.js`, `style.css`

- [x] **C-1  Add module-level worker variable**

  ```javascript
  var mazeWorker = null;
  ```

- [x] **C-2  Add `.generating-msg` CSS rule to `style.css`**

- [x] **C-3  Rewrite `startGame()`**

  ```javascript
  function startGame() {
    showScreen('game-screen');

    var gridEl = document.getElementById('maze-grid');
    gridEl.style.gridTemplateColumns = '';
    gridEl.innerHTML = '<div class="generating-msg">Generating\u2026</div>';
    document.getElementById('sequence-bar').innerHTML = '';

    if (mazeWorker) { mazeWorker.terminate(); mazeWorker = null; }

    mazeWorker = new Worker('generator-worker.js');
    mazeWorker.addEventListener('message', function (e) {
      mazeWorker = null;
      var maze = e.data.maze;
      state.maze        = maze;
      state.currentPos  = { row: maze.rows - 1, col: 0 };
      state.currentStep = 1;
      state.path        = [{ row: maze.rows - 1, col: 0 }];
      state.visited     = {};
      state.visited[(maze.rows - 1) + ',0'] = true;
      renderSequenceBar();
      renderGrid();
    });

    mazeWorker.postMessage({ rows: state.gridSize, cols: state.gridSize, sequence: state.sequence });
  }
  ```

  Note: posts `sequence` (the full array from `state.sequence`) not `seqLen`.
  Also initialises `state.path` for backtrack support.

**Success criteria:** ✓

---

## Task D — Update `tests/test-generator.js`

**Files:** `tests/test-generator.js`

- [x] **D-1  Utility tests** — COLOURS, SEQUENCES (7 entries), getLabelColour.

- [x] **D-2  Path generation tests** — start/end positions, orthogonality, no
  repeated cells, minimum length. All `_generateSolutionPath` calls pass a
  `sequence` argument.

- [x] **D-3  `hasShortcut` tests** — false on generated path, true on manually
  crafted shortcut (seqLen 2), true on colour-based shortcut in [R,B,B] that
  the old step-index check missed.

- [x] **D-4  Cannot / fill tests** — exit colour forbidden on adjacent non-sol
  cells; all B steps forbidden for [R,B,B]; sol cells have no cannot entries;
  no cell null after full pipeline; all steps in range.

- [x] **D-5  `generateMaze` end-to-end tests** — shape, start colour, 7×7 and
  10×10 completion.

- [x] **D-6  Uniqueness solver + 50-run test** — `countSolutions` unit tests
  (returns 1 / returns 2 on hand-crafted grids); 50-run uniqueness test for
  [R,B,B] on 5×5.

**Success criteria:** ✓ — 34 tests, 0 failures.

---

## Task E — End-to-end browser verification

Serve from a local HTTP server (Web Workers require same-origin):

```bash
python3 -m http.server 8080
```

- [x] **E-1** No console errors on page load.
- [x] **E-2** 5×5 / seq-1 (RYB): "Generating…" → grid renders → can navigate to win.
- [x] **E-3** 7×7 / seq-0 (RB, the known prior failure case): generates without hanging.
- [x] **E-4** Rapid "New Game" clicks: only one grid ultimately appears.
- [x] **E-5** 10×10 / seq-6 (RYBGP): no crash; black cells render if present.
- [x] **E-6** Final `node tests/test-generator.js` run: 0 failures.
