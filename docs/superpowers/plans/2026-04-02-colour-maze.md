# Colour Maze Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a browser-based colour maze puzzle game where the player navigates a grid by following a repeating colour sequence, with procedurally generated mazes guaranteed to have exactly one solution.

**Architecture:** Four plain JS/HTML/CSS files with no build step. `generator.js` handles all maze logic (path generation, colouring, uniqueness verification and repair) and exposes a single `generateMaze(rows, cols, seqLength)` function. `game.js` handles all UI, state, and interaction. Generator logic is pure and testable with Node.js.

**Tech Stack:** Plain HTML5, CSS3, JavaScript (ES5-compatible, no modules, no build step). Tests run with `node` using the built-in `assert` module — no npm required.

---

## File Map

| File | Responsibility |
|------|---------------|
| `index.html` | Shell, menu screen markup, game screen markup, `<script>` tags |
| `style.css` | Dark theme, grid layout, cell styles, sequence bar, overlays |
| `generator.js` | Maze generation: path DFS, colouring, fill, uniqueness repair. Exports via `module.exports` for testing |
| `game.js` | Menu logic, grid rendering, move handling, win/dead-end detection |
| `tests/test-generator.js` | Node.js unit tests for all generator functions |

---

## Task 1: Project Scaffold

**Files:**
- Create: `index.html`
- Create: `style.css`
- Create: `generator.js`
- Create: `game.js`
- Create: `tests/test-generator.js`
- Create: `.gitignore`

- [ ] **Step 1: Create `.gitignore`**

```
.superpowers/
node_modules/
```

- [ ] **Step 2: Create empty `style.css`**

```css
/* styles added in Task 7 */
```

- [ ] **Step 3: Create `generator.js` shell**

```javascript
// generator.js
// Maze generation logic.

(function (root) {

  // populated in later tasks

  if (typeof module !== 'undefined') {
    module.exports = root;
  } else {
    root.Generator = root;
  }

}({
  generateMaze:    null,
  getLabelColour:  null,
  COLOURS:         null,
}));
```

- [ ] **Step 4: Create `game.js` shell**

```javascript
// game.js
// UI, state, and interaction.
```

- [ ] **Step 5: Create `index.html` shell**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Colour Maze</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <!-- screens added in Task 8 -->
  <script src="generator.js"></script>
  <script src="game.js"></script>
</body>
</html>
```

- [ ] **Step 6: Create `tests/test-generator.js` shell**

```javascript
// tests/test-generator.js
const assert = require('assert');
const G = require('../generator.js');

let passed = 0, failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log('  \u2713 ' + name);
    passed++;
  } catch (e) {
    console.log('  \u2717 ' + name + ': ' + e.message);
    failed++;
  }
}

// tests added in later tasks

console.log('\n' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) process.exit(1);
```

- [ ] **Step 7: Verify node can load the file**

Run: `node tests/test-generator.js`
Expected output:
```
0 passed, 0 failed
```

- [ ] **Step 8: Commit**

```bash
git add index.html style.css generator.js game.js tests/test-generator.js .gitignore
git commit -m "feat: scaffold project files"
```

---

## Task 2: Generator — Utilities and `getLabelColour`

**Files:**
- Modify: `generator.js`
- Modify: `tests/test-generator.js`

The colour palette maps sequence length to an ordered list of hex colours. `getLabelColour` computes whether black or white text contrasts better against a given cell colour.

- [ ] **Step 1: Write failing tests**

Add to `tests/test-generator.js` (above the final `console.log`):

```javascript
console.log('\n-- Utilities --');

test('COLOURS has 5 entries', function () {
  assert.strictEqual(G.COLOURS.length, 5);
});

test('getSequence(2) returns [red, blue]', function () {
  var seq = G.getSequence(2);
  assert.deepStrictEqual(seq, ['#e63946', '#4cc9f0']);
});

test('getSequence(3) returns [red, yellow, blue]', function () {
  var seq = G.getSequence(3);
  assert.deepStrictEqual(seq, ['#e63946', '#f4d35e', '#4cc9f0']);
});

test('getLabelColour returns "black" for yellow (#f4d35e)', function () {
  assert.strictEqual(G.getLabelColour('#f4d35e'), 'black');
});

test('getLabelColour returns "white" for red (#e63946)', function () {
  assert.strictEqual(G.getLabelColour('#e63946'), 'white');
});

test('getLabelColour returns "black" for blue (#4cc9f0)', function () {
  assert.strictEqual(G.getLabelColour('#4cc9f0'), 'black');
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node tests/test-generator.js`
Expected: failures mentioning `COLOURS` and `getLabelColour` not found.

- [ ] **Step 3: Implement utilities in `generator.js`**

Replace the shell content with:

```javascript
// generator.js
(function (exports) {

  var COLOURS = [
    '#e63946', // red
    '#f4d35e', // yellow
    '#4cc9f0', // blue
    '#4ade80', // green
    '#c084fc', // purple
  ];

  // Sequences per length match the spec colour table.
  // Length 2 skips yellow so red/blue are visually distinct.
  var SEQUENCE_MAP = {
    2: ['#e63946', '#4cc9f0'],
    3: ['#e63946', '#f4d35e', '#4cc9f0'],
    4: ['#e63946', '#f4d35e', '#4cc9f0', '#4ade80'],
    5: ['#e63946', '#f4d35e', '#4cc9f0', '#4ade80', '#c084fc'],
  };

  function getSequence(length) {
    return SEQUENCE_MAP[length];
  }

  // Returns 'black' or 'white' for readable contrast against a hex cell colour.
  // Uses perceived luminance: luma = 0.299R + 0.587G + 0.114B (0-255 scale).
  // Threshold: luma > 140 => black text, else white.
  function getLabelColour(hex) {
    var r = parseInt(hex.slice(1, 3), 16);
    var g = parseInt(hex.slice(3, 5), 16);
    var b = parseInt(hex.slice(5, 7), 16);
    var luma = 0.299 * r + 0.587 * g + 0.114 * b;
    return luma > 140 ? 'black' : 'white';
  }

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  function cellKey(row, col) {
    return row + ',' + col;
  }

  exports.COLOURS          = COLOURS;
  exports.getSequence      = getSequence;
  exports.getLabelColour   = getLabelColour;
  exports._shuffle         = shuffle;
  exports._cellKey         = cellKey;
  exports.generateMaze     = null; // added in Task 6

  if (typeof module !== 'undefined') module.exports = exports;
  else window.Generator = exports;

}({}));
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node tests/test-generator.js`
Expected:
```
-- Utilities --
  ✓ COLOURS has 5 entries
  ✓ getSequence(3) returns first 3 colours
  ✓ getLabelColour returns "black" for yellow (#f4d35e)
  ✓ getLabelColour returns "white" for red (#e63946)
  ✓ getLabelColour returns "black" for blue (#4cc9f0)

5 passed, 0 failed
```

- [ ] **Step 5: Commit**

```bash
git add generator.js tests/test-generator.js
git commit -m "feat: generator utilities and getLabelColour"
```

---

## Task 3: Generator — Path Generation

**Files:**
- Modify: `generator.js`
- Modify: `tests/test-generator.js`

`_generatePath(rows, cols)` returns an array of `{row, col}` objects from bottom-left `{row: rows-1, col: 0}` to top-right `{row: 0, col: cols-1}` using a random DFS with backtracking. Retries until path length ≥ `Math.floor(rows * cols * 0.4)` (up to 200 attempts, then accepts any valid path).

- [ ] **Step 1: Write failing tests**

Add to `tests/test-generator.js`:

```javascript
console.log('\n-- Path Generation --');

test('path starts at bottom-left and ends at top-right (5x5)', function () {
  var path = G._generatePath(5, 5);
  assert.deepStrictEqual(path[0], { row: 4, col: 0 });
  assert.deepStrictEqual(path[path.length - 1], { row: 0, col: 4 });
});

test('all path steps are orthogonal (5x5)', function () {
  var path = G._generatePath(5, 5);
  for (var i = 1; i < path.length; i++) {
    var dr = Math.abs(path[i].row - path[i-1].row);
    var dc = Math.abs(path[i].col - path[i-1].col);
    assert.strictEqual(dr + dc, 1, 'step ' + i + ' is not orthogonal');
  }
});

test('path has no repeated cells (5x5)', function () {
  var path = G._generatePath(5, 5);
  var seen = {};
  path.forEach(function (c) {
    var k = G._cellKey(c.row, c.col);
    assert.ok(!seen[k], 'cell ' + k + ' appears twice');
    seen[k] = true;
  });
});

test('path meets minimum length (5x5, min=10)', function () {
  var path = G._generatePath(5, 5);
  assert.ok(path.length >= 10, 'path length ' + path.length + ' < 10');
});

test('path meets minimum length (7x7, min=19)', function () {
  var path = G._generatePath(7, 7);
  assert.ok(path.length >= 19, 'path length ' + path.length + ' < 19');
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node tests/test-generator.js`
Expected: failures on `_generatePath` not being a function.

- [ ] **Step 3: Implement `_generatePath` in `generator.js`**

Add inside the `(function(exports) { ... })` block, before the `exports` assignments:

```javascript
function generatePath(rows, cols) {
  var minLen = Math.floor(rows * cols * 0.4);
  var start = { row: rows - 1, col: 0 };
  var end   = { row: 0,        col: cols - 1 };
  var DIRS  = [[-1,0],[1,0],[0,-1],[0,1]];
  var best  = null;

  for (var attempt = 0; attempt < 200; attempt++) {
    var visited = {};
    visited[cellKey(start.row, start.col)] = true;

    var result = (function dfs(row, col, path) {
      if (row === end.row && col === end.col) return path;
      var dirs = shuffle(DIRS);
      for (var i = 0; i < dirs.length; i++) {
        var nr = row + dirs[i][0];
        var nc = col + dirs[i][1];
        var nk = cellKey(nr, nc);
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !visited[nk]) {
          visited[nk] = true;
          path.push({ row: nr, col: nc });
          var found = dfs(nr, nc, path);
          if (found) return found;
          path.pop();
          delete visited[nk];
        }
      }
      return null;
    }(start.row, start.col, [{ row: start.row, col: start.col }]));

    if (result && result.length >= minLen) return result;
    if (result && (!best || result.length > best.length)) best = result;
  }

  return best; // fallback: best path found even if under minLen
}
```

Update `exports._generatePath = generatePath;`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `node tests/test-generator.js`
Expected:
```
-- Path Generation --
  ✓ path starts at bottom-left and ends at top-right (5x5)
  ✓ all path steps are orthogonal (5x5)
  ✓ path has no repeated cells (5x5)
  ✓ path meets minimum length (5x5, min=10)
  ✓ path meets minimum length (7x7, min=19)

10 passed, 0 failed
```

- [ ] **Step 5: Commit**

```bash
git add generator.js tests/test-generator.js
git commit -m "feat: generator path generation (random DFS)"
```

---

## Task 4: Generator — Grid Creation and Colouring

**Files:**
- Modify: `generator.js`
- Modify: `tests/test-generator.js`

`_createGrid(rows, cols)` returns a 2D array of `{ colour: null }`. `_assignPathColours(grid, path, sequence)` colours path cells in sequence order. `_fillGrid(grid, sequence)` assigns random sequence colours to all remaining `null` cells.

- [ ] **Step 1: Write failing tests**

```javascript
console.log('\n-- Grid Creation and Colouring --');

test('createGrid returns correct dimensions', function () {
  var grid = G._createGrid(4, 5);
  assert.strictEqual(grid.length, 4);
  assert.strictEqual(grid[0].length, 5);
  assert.strictEqual(grid[0][0].colour, null);
});

test('assignPathColours sets path[0] to seq[0]', function () {
  var grid = G._createGrid(5, 5);
  var path = G._generatePath(5, 5);
  var seq  = G.getSequence(3);
  G._assignPathColours(grid, path, seq);
  assert.strictEqual(grid[path[0].row][path[0].col].colour, seq[0]);
});

test('assignPathColours wraps sequence correctly', function () {
  var grid = G._createGrid(5, 5);
  var path = G._generatePath(5, 5);
  var seq  = G.getSequence(3);
  G._assignPathColours(grid, path, seq);
  for (var i = 0; i < path.length; i++) {
    var cell = path[i];
    assert.strictEqual(
      grid[cell.row][cell.col].colour,
      seq[i % seq.length],
      'path step ' + i + ' has wrong colour'
    );
  }
});

test('fillGrid leaves no null cells', function () {
  var grid = G._createGrid(5, 5);
  var path = G._generatePath(5, 5);
  var seq  = G.getSequence(3);
  G._assignPathColours(grid, path, seq);
  G._fillGrid(grid, seq);
  for (var r = 0; r < 5; r++) {
    for (var c = 0; c < 5; c++) {
      assert.ok(grid[r][c].colour !== null, 'cell [' + r + ',' + c + '] is null');
    }
  }
});

test('fillGrid only uses colours from the sequence', function () {
  var grid = G._createGrid(5, 5);
  var path = G._generatePath(5, 5);
  var seq  = G.getSequence(3);
  G._assignPathColours(grid, path, seq);
  G._fillGrid(grid, seq);
  for (var r = 0; r < 5; r++) {
    for (var c = 0; c < 5; c++) {
      assert.ok(seq.indexOf(grid[r][c].colour) !== -1, 'unknown colour at [' + r + ',' + c + ']');
    }
  }
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node tests/test-generator.js`
Expected: failures on `_createGrid`, `_assignPathColours`, `_fillGrid`.

- [ ] **Step 3: Implement the three functions in `generator.js`**

```javascript
function createGrid(rows, cols) {
  var grid = [];
  for (var r = 0; r < rows; r++) {
    grid[r] = [];
    for (var c = 0; c < cols; c++) {
      grid[r][c] = { colour: null };
    }
  }
  return grid;
}

function assignPathColours(grid, path, sequence) {
  for (var i = 0; i < path.length; i++) {
    var cell = path[i];
    grid[cell.row][cell.col].colour = sequence[i % sequence.length];
  }
}

function fillGrid(grid, sequence) {
  for (var r = 0; r < grid.length; r++) {
    for (var c = 0; c < grid[r].length; c++) {
      if (grid[r][c].colour === null) {
        grid[r][c].colour = sequence[Math.floor(Math.random() * sequence.length)];
      }
    }
  }
}
```

Add to `exports`:
```javascript
exports._createGrid         = createGrid;
exports._assignPathColours  = assignPathColours;
exports._fillGrid           = fillGrid;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node tests/test-generator.js`
Expected:
```
-- Grid Creation and Colouring --
  ✓ createGrid returns correct dimensions
  ✓ assignPathColours sets path[0] to seq[0]
  ✓ assignPathColours wraps sequence correctly
  ✓ fillGrid leaves no null cells
  ✓ fillGrid only uses colours from the sequence

15 passed, 0 failed
```

- [ ] **Step 5: Commit**

```bash
git add generator.js tests/test-generator.js
git commit -m "feat: generator grid creation and colouring"
```

---

## Task 5: Generator — Path Counter

**Files:**
- Modify: `generator.js`
- Modify: `tests/test-generator.js`

`_countPaths(grid, sequence, rows, cols)` returns the number of valid complete paths from bottom-left to top-right (stops counting at 2 for efficiency).

A valid path: starts at `{row: rows-1, col: 0}`, ends at `{row: 0, col: cols-1}`, each cell visited at step `i` has colour `sequence[i % sequence.length]`, no cell revisited, moves are orthogonal.

- [ ] **Step 1: Write failing tests**

```javascript
console.log('\n-- Path Counter --');

// Helper: build a minimal 3x3 grid with exactly one known path
// Sequence: [red, yellow, blue] => ['#e63946','#f4d35e','#4cc9f0']
// Solution path (bottom-left to top-right):
//   (2,0)->(1,0)->(0,0)->(0,1)->(0,2)
//   step:    0     1      2      3      4
//   colour:  R     Y      B      R      Y
// Grid (row 0 = top):
//   [B][R][Y]   row 0   path cells at (0,0),(0,1),(0,2)
//   [Y][R][R]   row 1   path cell at (1,0); non-path blocked
//   [R][B][B]   row 2   path cell at (2,0); non-path blocked
// Verified: no alternative path reaches (0,2) given these non-path colours.
function makeGrid3x3Single() {
  var R = '#e63946', Y = '#f4d35e', B = '#4cc9f0';
  return [
    [{ colour: B }, { colour: R }, { colour: Y }],
    [{ colour: Y }, { colour: R }, { colour: R }],
    [{ colour: R }, { colour: B }, { colour: B }],
  ];
}

test('countPaths returns 1 for single-solution 3x3 grid', function () {
  var seq  = ['#e63946', '#f4d35e', '#4cc9f0'];
  var grid = makeGrid3x3Single();
  assert.strictEqual(G._countPaths(grid, seq, 3, 3), 1);
});

// Multi-solution grid: open up (0,1) to yellow so there are two paths
// Path 2: (2,0)->(1,0)->(0,0)->(0,1)->(0,2) — same as above
// Wait, we need a second distinct path. Let's make (1,1) = yellow:
//   [R][B][Y]   row 0
//   [Y][Y][R]   row 1  (1,1) changed to Y
//   [R][B][B]   row 2
// Path 2: (2,0)->(1,0)->(1,1)->(0,1)... (0,1)=B, need R at step 3 => no
// Let's try: (1,2) = blue
//   [R][B][Y]   row 0
//   [Y][R][B]   row 1  (1,2) = B
//   [R][B][B]   row 2
// Path 2: (2,0)->(1,0)->(0,0)->(0,1)... (0,1)=B=seq[3%3=0]=R? No.
// This is tricky. Let's build it directly:
// Path 1: (2,0)R->(1,0)Y->(0,0)B... wait seq is R,Y,B
// step0=R, step1=Y, step2=B, step3=R, step4=Y
// Path 1: (2,0)R->(1,0)Y->(0,0)B->(0,1)R->(0,2)Y ✓ (4 steps, step0..4)
// For path 2: (2,0)R->(2,1)?->(2,2)?->(1,2)?->(0,2)?
// Need (2,1)=Y, (2,2)=B, (1,2)=R, (0,2)=Y
function makeGrid3x3Double() {
  var R = '#e63946', Y = '#f4d35e', B = '#4cc9f0';
  return [
    [{ colour: R }, { colour: B }, { colour: Y }],  // (0,1) must be R for path1 step3...
    [{ colour: Y }, { colour: R }, { colour: R }],
    [{ colour: R }, { colour: Y }, { colour: B }],  // (2,1)=Y, (2,2)=B
  ];
  // Path 1: (2,0)R step0 -> (1,0)Y step1 -> (0,0)B... (0,0)=R, not B.
  // Hmm, let me reconsider.
}
// The grid-building for double paths is complex. Use a known-good approach:
// Build grid from two explicit paths and verify manually.
// Path A: (2,0)->(1,0)->(0,0)->(0,1)->(0,2)  colours: R Y B R Y
// Path B: (2,0)->(2,1)->(2,2)->(1,2)->(0,2)  colours: R Y B R Y
// Grid cells on either path:
//   (2,0)=R, (1,0)=Y, (0,0)=B, (0,1)=R, (0,2)=Y
//   (2,1)=Y, (2,2)=B, (1,2)=R
// Non-path cells: (0,0) is on both, etc.
// Full grid:
//   row0: (0,0)=B (0,1)=R (0,2)=Y
//   row1: (1,0)=Y (1,1)=? (1,2)=R
//   row2: (2,0)=R (2,1)=Y (2,2)=B
// Set (1,1) to anything (won't be on either path): use B
function makeGrid3x3Double() {
  var R = '#e63946', Y = '#f4d35e', B = '#4cc9f0';
  return [
    [{ colour: B }, { colour: R }, { colour: Y }],
    [{ colour: Y }, { colour: B }, { colour: R }],
    [{ colour: R }, { colour: Y }, { colour: B }],
  ];
}

test('countPaths returns 2 for dual-solution 3x3 grid', function () {
  var seq  = ['#e63946', '#f4d35e', '#4cc9f0'];
  var grid = makeGrid3x3Double();
  assert.strictEqual(G._countPaths(grid, seq, 3, 3), 2);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node tests/test-generator.js`
Expected: failures on `_countPaths`.

- [ ] **Step 3: Implement `_countPaths` in `generator.js`**

```javascript
function countPaths(grid, sequence, rows, cols) {
  var start = { row: rows - 1, col: 0 };
  var end   = { row: 0,        col: cols - 1 };
  var DIRS  = [[-1,0],[1,0],[0,-1],[0,1]];
  var count = 0;
  var visited = {};
  visited[cellKey(start.row, start.col)] = true;

  (function dfs(row, col, step) {
    if (count > 1) return; // early exit
    if (row === end.row && col === end.col) { count++; return; }
    var nextColour = sequence[step % sequence.length];
    for (var i = 0; i < DIRS.length; i++) {
      var nr = row + DIRS[i][0];
      var nc = col + DIRS[i][1];
      var nk = cellKey(nr, nc);
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols
          && !visited[nk]
          && grid[nr][nc].colour === nextColour) {
        visited[nk] = true;
        dfs(nr, nc, step + 1);
        delete visited[nk];
      }
    }
  }(start.row, start.col, 1));

  return count;
}
```

Add `exports._countPaths = countPaths;`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `node tests/test-generator.js`
Expected:
```
-- Path Counter --
  ✓ countPaths returns 1 for single-solution 3x3 grid
  ✓ countPaths returns 2 for dual-solution 3x3 grid

17 passed, 0 failed
```

- [ ] **Step 5: Commit**

```bash
git add generator.js tests/test-generator.js
git commit -m "feat: generator path counter (DFS with early exit)"
```

---

## Task 6: Generator — Repair and `generateMaze`

**Files:**
- Modify: `generator.js`
- Modify: `tests/test-generator.js`

`_repairUniqueness(grid, sequence, solutionPath, rows, cols)` finds alternative paths and breaks them. `generateMaze(rows, cols, seqLength)` is the public API, returning `{ grid, sequence, rows, cols }`.

Repair strategy: find any valid complete path different from `solutionPath`; find the first cell in that alternative path not in the solution path set; assign it a colour that does not match `sequence[step % seqLen]` at that step.

- [ ] **Step 1: Write failing tests**

```javascript
console.log('\n-- Repair and generateMaze --');

test('generateMaze returns grid with correct dimensions (5x5, seq 3)', function () {
  var maze = G.generateMaze(5, 5, 3);
  assert.strictEqual(maze.grid.length, 5);
  assert.strictEqual(maze.grid[0].length, 5);
  assert.strictEqual(maze.sequence.length, 3);
  assert.strictEqual(maze.rows, 5);
  assert.strictEqual(maze.cols, 5);
});

test('generateMaze(5,5,3) produces exactly one solution', function () {
  var maze = G.generateMaze(5, 5, 3);
  assert.strictEqual(G._countPaths(maze.grid, maze.sequence, 5, 5), 1);
});

test('generateMaze(7,7,4) produces exactly one solution', function () {
  var maze = G.generateMaze(7, 7, 4);
  assert.strictEqual(G._countPaths(maze.grid, maze.sequence, 7, 7), 1);
});

test('generateMaze(5,5,2) produces exactly one solution', function () {
  var maze = G.generateMaze(5, 5, 2);
  assert.strictEqual(G._countPaths(maze.grid, maze.sequence, 5, 5), 1);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node tests/test-generator.js`
Expected: failures on `generateMaze`.

- [ ] **Step 3: Implement repair and `generateMaze` in `generator.js`**

```javascript
// Returns the first complete valid path from start to end, or null if none.
function findAnyPath(grid, sequence, rows, cols) {
  var start = { row: rows - 1, col: 0 };
  var end   = { row: 0,        col: cols - 1 };
  var DIRS  = [[-1,0],[1,0],[0,-1],[0,1]];
  var visited = {};
  visited[cellKey(start.row, start.col)] = true;

  return (function dfs(row, col, step, path) {
    if (row === end.row && col === end.col) return path.slice();
    var nextColour = sequence[step % sequence.length];
    for (var i = 0; i < DIRS.length; i++) {
      var nr = row + DIRS[i][0];
      var nc = col + DIRS[i][1];
      var nk = cellKey(nr, nc);
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols
          && !visited[nk]
          && grid[nr][nc].colour === nextColour) {
        visited[nk] = true;
        path.push({ row: nr, col: nc });
        var result = dfs(nr, nc, step + 1, path);
        if (result) return result;
        path.pop();
        delete visited[nk];
      }
    }
    return null;
  }(start.row, start.col, 1, [{ row: start.row, col: start.col }]));
}

function repairUniqueness(grid, sequence, solutionPath, rows, cols) {
  // Build set of solution path cell keys
  var solSet = {};
  for (var i = 0; i < solutionPath.length; i++) {
    solSet[cellKey(solutionPath[i].row, solutionPath[i].col)] = true;
  }

  var maxIterations = 200;
  while (maxIterations-- > 0) {
    if (countPaths(grid, sequence, rows, cols) <= 1) break;

    var altPath = findAnyPath(grid, sequence, rows, cols);
    if (!altPath) break;

    // Check if altPath === solutionPath (same cells in same order)
    var same = altPath.length === solutionPath.length && altPath.every(function (c, idx) {
      return c.row === solutionPath[idx].row && c.col === solutionPath[idx].col;
    });
    if (same) {
      // The only path found is the solution — we're done
      break;
    }

    // Find first cell in altPath not in solutionPath (skip start and end)
    var broken = false;
    for (var j = 1; j < altPath.length - 1; j++) {
      var cell = altPath[j];
      var k    = cellKey(cell.row, cell.col);
      if (!solSet[k]) {
        // Change colour so it doesn't match sequence[j % seqLen]
        var wrongColour = sequence[(j + 1) % sequence.length]; // guaranteed different
        grid[cell.row][cell.col].colour = wrongColour;
        broken = true;
        break;
      }
    }

    // Safety: if all alt path cells are on solution path, pick last non-start/end cell of alt
    if (!broken && altPath.length > 2) {
      var cell = altPath[altPath.length - 2];
      var step = altPath.length - 2;
      grid[cell.row][cell.col].colour = sequence[(step + 1) % sequence.length];
    }
  }
}

function generateMaze(rows, cols, seqLength) {
  var sequence = getSequence(seqLength);
  var path     = generatePath(rows, cols);
  var grid     = createGrid(rows, cols);
  assignPathColours(grid, path, sequence);
  fillGrid(grid, sequence);
  repairUniqueness(grid, sequence, path, rows, cols);
  return { grid: grid, sequence: sequence, rows: rows, cols: cols };
}
```

Update exports to include all new functions:
```javascript
exports.generateMaze         = generateMaze;
exports._repairUniqueness    = repairUniqueness;
exports._findAnyPath         = findAnyPath;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node tests/test-generator.js`
Expected:
```
-- Repair and generateMaze --
  ✓ generateMaze returns grid with correct dimensions (5x5, seq 3)
  ✓ generateMaze(5,5,3) produces exactly one solution
  ✓ generateMaze(7,7,4) produces exactly one solution
  ✓ generateMaze(5,5,2) produces exactly one solution

21 passed, 0 failed
```

- [ ] **Step 5: Commit**

```bash
git add generator.js tests/test-generator.js
git commit -m "feat: generator repair and generateMaze public API"
```

---

## Task 7: CSS — Dark Theme

**Files:**
- Modify: `style.css`

Full dark theme. Grid uses CSS custom properties for cell size so it can adapt to grid dimensions set from JS.

- [ ] **Step 1: Write `style.css`**

```css
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  background: #0f0f1a;
  color: #fff;
  font-family: system-ui, sans-serif;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ── Screen management ─────────────────────────────────── */
.screen { display: none; width: 100%; max-width: 480px; padding: 24px; }
.screen.active { display: flex; flex-direction: column; align-items: center; gap: 20px; }

/* ── Title ─────────────────────────────────────────────── */
.title {
  font-size: 28px;
  font-weight: 700;
  letter-spacing: 3px;
  text-transform: uppercase;
}

/* ── Selector groups ───────────────────────────────────── */
.selector-group { width: 100%; display: flex; flex-direction: column; gap: 8px; }
.selector-label { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #888; }
.selector-options { display: flex; gap: 8px; }

.selector-option {
  flex: 1;
  padding: 10px 4px;
  background: #1e1e2e;
  border: 1px solid #444;
  border-radius: 6px;
  color: #aaa;
  font-size: 13px;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s, color 0.15s;
  user-select: none;
}
.selector-option:hover { border-color: #666; color: #ccc; }
.selector-option.selected {
  background: #4cc9f0;
  border-color: #4cc9f0;
  color: #000;
  font-weight: 600;
}

/* ── Sequence preview ──────────────────────────────────── */
.sequence-preview {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #1e1e2e;
  padding: 12px;
  border-radius: 8px;
  width: 100%;
}
.preview-swatch {
  width: 22px;
  height: 22px;
  border-radius: 4px;
  flex-shrink: 0;
}
.preview-arrow { color: #555; font-size: 14px; }
.preview-label { color: #666; font-size: 12px; margin-left: 4px; }

/* ── Buttons ───────────────────────────────────────────── */
.btn {
  width: 100%;
  padding: 14px;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  letter-spacing: 1px;
  text-transform: uppercase;
  transition: opacity 0.15s;
}
.btn:hover { opacity: 0.85; }
.btn-primary { background: #e63946; color: #fff; }
.btn-secondary {
  background: #1e1e2e;
  color: #888;
  border: 1px solid #333;
  font-weight: 400;
  font-size: 13px;
  padding: 10px;
}

/* ── Game screen layout ────────────────────────────────── */
#game-screen { gap: 16px; }

/* ── Sequence bar ──────────────────────────────────────── */
.sequence-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #1e1e2e;
  padding: 10px 14px;
  border-radius: 8px;
  width: 100%;
  justify-content: center;
}
.seq-swatch {
  width: 20px;
  height: 20px;
  border-radius: 3px;
  flex-shrink: 0;
  opacity: 0.4;
  transition: opacity 0.2s, box-shadow 0.2s, transform 0.2s;
}
.seq-swatch.active {
  opacity: 1;
  border: 2px solid #fff;
  box-shadow: 0 0 8px currentColor;
  transform: scale(1.2);
  width: 24px;
  height: 24px;
}
.seq-arrow { color: #555; font-size: 10px; }
.seq-label { color: #666; font-size: 11px; margin-left: 4px; }

/* ── Grid ──────────────────────────────────────────────── */
.grid-wrapper { width: 100%; display: flex; justify-content: center; }

.maze-grid {
  display: grid;
  gap: 4px;
  /* grid-template-columns set by JS */
}

.cell {
  width: var(--cell-size, 44px);
  height: var(--cell-size, 44px);
  border-radius: 5px;
  border: 2px solid transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: calc(var(--cell-size, 44px) * 0.45);
  font-weight: 400;
  transition: border-color 0.1s, box-shadow 0.1s;
  user-select: none;
  position: relative;
}
.cell:hover { border-color: rgba(255,255,255,0.3); }

.cell.empty {
  background: #1e1e2e;
  border-color: #2a2a3e;
  cursor: default;
}
.cell.empty:hover { border-color: #2a2a3e; }

.cell.current {
  border-color: #fff !important;
  box-shadow: 0 0 10px rgba(255,255,255,0.35);
}

.cell.visited::after {
  content: '✓';
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: calc(var(--cell-size, 44px) * 0.38);
  opacity: 0.35;
  color: inherit;
}

.cell.end-cell { border-color: #4ade80 !important; }

/* ── Game buttons row ──────────────────────────────────── */
.game-buttons { display: flex; gap: 8px; width: 100%; }
.game-buttons .btn { width: auto; flex: 1; }

/* ── Win overlay ───────────────────────────────────────── */
.overlay {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.75);
  align-items: center;
  justify-content: center;
  z-index: 10;
}
.overlay.active { display: flex; }
.overlay-box {
  background: #1e1e2e;
  border: 1px solid #444;
  border-radius: 12px;
  padding: 36px 40px;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.overlay-title { font-size: 32px; font-weight: 700; letter-spacing: 2px; }
```

- [ ] **Step 2: Open `index.html` in browser and confirm body is dark (`#0f0f1a`)**

No errors in console.

- [ ] **Step 3: Commit**

```bash
git add style.css
git commit -m "feat: CSS dark theme"
```

---

## Task 8: HTML — Screen Markup

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Replace `index.html` body content**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Colour Maze</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>

  <!-- ── Menu screen ──────────────────────────────────── -->
  <div id="menu-screen" class="screen active">
    <h1 class="title">Colour Maze</h1>

    <div class="selector-group">
      <div class="selector-label">Grid Size</div>
      <div class="selector-options" id="grid-size-options">
        <div class="selector-option" data-value="5">5×5</div>
        <div class="selector-option selected" data-value="7">7×7</div>
        <div class="selector-option" data-value="10">10×10</div>
        <div class="selector-option" data-value="12">12×12</div>
      </div>
    </div>

    <div class="selector-group">
      <div class="selector-label">Sequence Length</div>
      <div class="selector-options" id="seq-length-options">
        <div class="selector-option" data-value="2">2</div>
        <div class="selector-option selected" data-value="3">3</div>
        <div class="selector-option" data-value="4">4</div>
        <div class="selector-option" data-value="5">5</div>
      </div>
    </div>

    <div class="selector-group">
      <div class="selector-label">Sequence Preview</div>
      <div class="sequence-preview" id="sequence-preview"></div>
    </div>

    <button class="btn btn-primary" id="new-game-btn">New Game</button>
  </div>

  <!-- ── Game screen ──────────────────────────────────── -->
  <div id="game-screen" class="screen">
    <div class="sequence-bar" id="sequence-bar"></div>
    <div class="grid-wrapper">
      <div class="maze-grid" id="maze-grid"></div>
    </div>
    <div class="game-buttons">
      <button class="btn btn-secondary" id="menu-btn">Menu</button>
      <button class="btn btn-secondary" id="new-game-btn-2">New Game</button>
    </div>
  </div>

  <!-- ── Win overlay ──────────────────────────────────── -->
  <div class="overlay" id="win-overlay">
    <div class="overlay-box">
      <div class="overlay-title">Solved!</div>
      <button class="btn btn-primary" id="win-new-game-btn">New Game</button>
    </div>
  </div>

  <script src="generator.js"></script>
  <script src="game.js"></script>
</body>
</html>
```

- [ ] **Step 2: Open `index.html` in browser**

Menu screen visible with title, selector groups, preview area, and New Game button. No console errors.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: HTML screen markup"
```

---

## Task 9: game.js — Menu Screen Logic

**Files:**
- Modify: `game.js`

Selector pill behaviour (one selected at a time per group), sequence preview updates when sequence length changes, New Game button initiates game.

- [ ] **Step 1: Implement menu logic in `game.js`**

```javascript
// game.js

var state = {
  gridSize:   7,
  seqLength:  3,
  maze:       null,   // { grid, sequence, rows, cols }
  currentPos: null,   // { row, col }
  currentStep: 1,
  visited:    null,   // Set of "row,col" keys
};

// ── Selector helpers ─────────────────────────────────────

function setupSelector(containerId, onSelect) {
  var container = document.getElementById(containerId);
  var options   = container.querySelectorAll('.selector-option');
  options.forEach(function (opt) {
    opt.addEventListener('click', function () {
      options.forEach(function (o) { o.classList.remove('selected'); });
      opt.classList.add('selected');
      onSelect(parseInt(opt.dataset.value, 10));
    });
  });
}

function updateSequencePreview() {
  var seq      = Generator.getSequence(state.seqLength);
  var preview  = document.getElementById('sequence-preview');
  preview.innerHTML = '';
  seq.forEach(function (colour, i) {
    var swatch       = document.createElement('div');
    swatch.className = 'preview-swatch';
    swatch.style.background = colour;
    preview.appendChild(swatch);
    if (i < seq.length - 1) {
      var arrow       = document.createElement('span');
      arrow.className = 'preview-arrow';
      arrow.textContent = '→';
      preview.appendChild(arrow);
    }
  });
  var label       = document.createElement('span');
  label.className = 'preview-label';
  label.textContent = 'repeats';
  preview.appendChild(label);
}

// ── Screen transitions ───────────────────────────────────

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(function (s) {
    s.classList.remove('active');
  });
  document.getElementById(id).classList.add('active');
}

// ── Init menu ────────────────────────────────────────────

function initMenu() {
  setupSelector('grid-size-options', function (val) { state.gridSize = val; });
  setupSelector('seq-length-options', function (val) {
    state.seqLength = val;
    updateSequencePreview();
  });

  updateSequencePreview();

  document.getElementById('new-game-btn').addEventListener('click', startGame);
  document.getElementById('menu-btn').addEventListener('click', function () { showScreen('menu-screen'); });
  document.getElementById('new-game-btn-2').addEventListener('click', startGame);
  document.getElementById('win-new-game-btn').addEventListener('click', function () {
    document.getElementById('win-overlay').classList.remove('active');
    startGame();
  });
}

function startGame() {
  showScreen('game-screen');
  var maze = Generator.generateMaze(state.gridSize, state.gridSize, state.seqLength);
  state.maze        = maze;
  state.currentPos  = { row: maze.rows - 1, col: 0 };
  state.currentStep = 1;
  state.visited     = {};
  state.visited[maze.rows - 1 + ',0'] = true;
  renderSequenceBar();
  renderGrid();
}

document.addEventListener('DOMContentLoaded', initMenu);
```

- [ ] **Step 2: Open `index.html` in browser**

- Click selector pills — active pill highlights in cyan
- Change sequence length — preview updates with correct coloured swatches
- New Game button switches to game screen (grid area empty for now)

- [ ] **Step 3: Commit**

```bash
git add game.js
git commit -m "feat: menu screen selectors and navigation"
```

---

## Task 10: game.js — Grid Rendering and Sequence Bar

**Files:**
- Modify: `game.js`

`renderGrid()` creates DOM cells sized to fit. `renderSequenceBar()` shows the sequence with the active colour highlighted.

- [ ] **Step 1: Add `renderSequenceBar` and `renderGrid` to `game.js`**

Add these functions before `initMenu`:

```javascript
// ── Sequence bar ─────────────────────────────────────────

function renderSequenceBar() {
  var seq    = state.maze.sequence;
  var bar    = document.getElementById('sequence-bar');
  var active = state.currentStep % seq.length;
  bar.innerHTML = '';

  seq.forEach(function (colour, i) {
    var swatch        = document.createElement('div');
    swatch.className  = 'seq-swatch' + (i === active ? ' active' : '');
    swatch.style.background = colour;
    if (i === active) swatch.style.boxShadow = '0 0 8px ' + colour;
    bar.appendChild(swatch);

    if (i < seq.length - 1) {
      var arrow       = document.createElement('span');
      arrow.className = 'seq-arrow';
      arrow.textContent = '→';
      bar.appendChild(arrow);
    }
  });

  var label       = document.createElement('span');
  label.className = 'seq-label';
  label.textContent = 'next';
  bar.appendChild(label);
}

// ── Grid rendering ───────────────────────────────────────

function cellKey(row, col) { return row + ',' + col; }

function computeCellSize(gridSize) {
  // Target: grid fits within ~380px. Max cell size 52px, min 24px.
  var maxWidth  = Math.min(window.innerWidth - 48, 420);
  var size      = Math.floor((maxWidth - (gridSize - 1) * 4) / gridSize);
  return Math.max(24, Math.min(52, size));
}

function renderGrid() {
  var maze    = state.maze;
  var grid    = document.getElementById('maze-grid');
  var size    = computeCellSize(maze.cols);
  var endRow  = 0;
  var endCol  = maze.cols - 1;

  grid.style.gridTemplateColumns = 'repeat(' + maze.cols + ', ' + size + 'px)';
  grid.style.setProperty('--cell-size', size + 'px');
  grid.innerHTML = '';

  for (var r = 0; r < maze.rows; r++) {
    for (var c = 0; c < maze.cols; c++) {
      var cell   = maze.grid[r][c];
      var div    = document.createElement('div');
      var key    = cellKey(r, c);
      var isStart = (r === maze.rows - 1 && c === 0);
      var isEnd   = (r === endRow && c === endCol);
      var isCurrent = (r === state.currentPos.row && c === state.currentPos.col);
      var isVisited = !!state.visited[key];

      div.className  = 'cell';
      div.dataset.row = r;
      div.dataset.col = c;
      div.style.background = cell.colour;

      if (isEnd)     div.classList.add('end-cell');
      if (isCurrent) div.classList.add('current');
      if (isVisited && !isCurrent) div.classList.add('visited');

      // S / E labels
      if (isStart || isEnd) {
        div.textContent = isStart ? 'S' : 'E';
        div.style.color = Generator.getLabelColour(cell.colour);
      }

      div.addEventListener('click', onCellClick);
      grid.appendChild(div);
    }
  }
}
```

- [ ] **Step 2: Open `index.html`, start a game**

Grid renders with correct size. Start cell (bottom-left) shows "S", end cell (top-right) shows "E" with green border. Sequence bar shows the sequence with the first required colour glowing.

- [ ] **Step 3: Commit**

```bash
git add game.js
git commit -m "feat: grid rendering and sequence bar"
```

---

## Task 11: game.js — Move Handling

**Files:**
- Modify: `game.js`

`onCellClick` validates a move, updates state, re-renders, checks for dead ends.

- [ ] **Step 1: Add `onCellClick` and dead-end check to `game.js`**

```javascript
// ── Move handling ────────────────────────────────────────

function isOrthogonalNeighbour(pos, row, col) {
  var dr = Math.abs(pos.row - row);
  var dc = Math.abs(pos.col - col);
  return (dr + dc) === 1;
}

function hasValidMoves() {
  var maze    = state.maze;
  var pos     = state.currentPos;
  var needed  = maze.sequence[state.currentStep % maze.sequence.length];
  var DIRS    = [[-1,0],[1,0],[0,-1],[0,1]];
  for (var i = 0; i < DIRS.length; i++) {
    var nr = pos.row + DIRS[i][0];
    var nc = pos.col + DIRS[i][1];
    var nk = cellKey(nr, nc);
    if (nr >= 0 && nr < maze.rows && nc >= 0 && nc < maze.cols
        && !state.visited[nk]
        && maze.grid[nr][nc].colour === needed) {
      return true;
    }
  }
  return false;
}

function onCellClick(e) {
  var row = parseInt(e.currentTarget.dataset.row, 10);
  var col = parseInt(e.currentTarget.dataset.col, 10);
  var maze   = state.maze;
  var pos    = state.currentPos;
  var key    = cellKey(row, col);
  var needed = maze.sequence[state.currentStep % maze.sequence.length];

  // Must be an unvisited orthogonal neighbour with the right colour
  if (!isOrthogonalNeighbour(pos, row, col)) return;
  if (state.visited[key]) return;
  if (maze.grid[row][col].colour !== needed) return;

  // Valid move
  state.visited[key]  = true;
  state.currentPos    = { row: row, col: col };
  state.currentStep  += 1;

  // Win condition
  if (row === 0 && col === maze.cols - 1) {
    renderGrid();
    renderSequenceBar();
    document.getElementById('win-overlay').classList.add('active');
    return;
  }

  renderGrid();
  renderSequenceBar();

  // Dead-end detection
  if (!hasValidMoves()) {
    setTimeout(function () {
      alert('No valid moves — starting a new game!');
      startGame();
    }, 300);
  }
}
```

- [ ] **Step 2: Open `index.html`, start a game, test moving**

- Clicking a non-adjacent cell does nothing
- Clicking an adjacent cell with the wrong colour does nothing
- Clicking a valid adjacent cell moves the player (border highlights, trail shows)
- Sequence bar updates after each move
- Reaching the end triggers the win overlay
- Reaching a dead end alerts and restarts

- [ ] **Step 3: Commit**

```bash
git add game.js
git commit -m "feat: move handling, win detection, dead-end detection"
```

---

## Task 12: Final Polish and Integration Verification

**Files:**
- Modify: `game.js`
- Modify: `style.css`

Replace the `alert()` dead-end notification with a proper overlay. Verify all wiring is correct end-to-end.

- [ ] **Step 1: Add a dead-end overlay to `index.html`**

Add before `</body>`:

```html
  <!-- ── Dead end overlay ─────────────────────────────── -->
  <div class="overlay" id="dead-end-overlay">
    <div class="overlay-box">
      <div class="overlay-title" style="font-size:22px;">Dead End</div>
      <p style="color:#888;font-size:14px;">No valid moves remaining.</p>
      <button class="btn btn-primary" id="dead-end-new-game-btn">New Game</button>
    </div>
  </div>
```

- [ ] **Step 2: Replace `alert()` in `onCellClick` with the overlay**

Replace the `setTimeout(function () { alert(...) ... })` block with:

```javascript
  if (!hasValidMoves()) {
    setTimeout(function () {
      document.getElementById('dead-end-overlay').classList.add('active');
    }, 300);
  }
```

- [ ] **Step 3: Wire up the dead-end overlay button in `initMenu`**

Add inside `initMenu()`:

```javascript
  document.getElementById('dead-end-new-game-btn').addEventListener('click', function () {
    document.getElementById('dead-end-overlay').classList.remove('active');
    startGame();
  });
```

- [ ] **Step 4: Run full generator test suite one final time**

Run: `node tests/test-generator.js`
Expected: all 21 tests pass, 0 failed.

- [ ] **Step 5: Manual end-to-end browser test**

Open `index.html` and verify:
1. Menu shows with default 7×7 / 3-colour selected
2. Changing sequence length updates the preview
3. New Game generates a maze and transitions to game screen
4. S is bottom-left, E is top-right with green border
5. S/E label text is readable (black or white based on cell colour)
6. Valid moves accepted, trail shown, sequence bar advances
7. Invalid clicks (wrong colour, non-adjacent, already visited) do nothing
8. Reaching E shows "Solved!" overlay
9. Dead end shows "Dead End" overlay
10. "Menu" button returns to menu with settings intact
11. Test all 4 grid sizes and all 4 sequence lengths

- [ ] **Step 6: Commit**

```bash
git add index.html game.js
git commit -m "feat: dead-end overlay, full integration complete"
```
