// generator.js
(function (exports) {

  var COLOURS = [
    '#e63946', // red
    '#f4d35e', // yellow
    '#4cc9f0', // blue
    '#4ade80', // green
    '#c084fc', // purple
  ];

  var BLACK_COLOUR = '#000000';

  var SEQUENCES = [
    ['#e63946', '#4cc9f0'],                                       // red, blue
    ['#e63946', '#f4d35e', '#4cc9f0'],                           // red, yellow, blue
    ['#e63946', '#4cc9f0', '#4cc9f0'],                           // red, blue, blue
    ['#e63946', '#f4d35e', '#4cc9f0', '#4ade80'],                // red, yellow, blue, green
    ['#e63946', '#4cc9f0', '#f4d35e', '#4cc9f0'],                // red, blue, yellow, blue
    ['#e63946', '#f4d35e', '#f4d35e', '#4cc9f0'],                // red, yellow, yellow, blue
    ['#e63946', '#f4d35e', '#4cc9f0', '#4ade80', '#c084fc'],     // red, yellow, blue, green, purple
  ];

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

  // Returns a new array with the same elements in a random order.
  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  // Returns a unique string key for a grid cell, used as an object property.
  function cellKey(row, col) {
    return row + ',' + col;
  }

  // Allocates a rows×cols 2D array of cells, each with colour initialised to null.
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

  // Finds a random non-self-intersecting path from bottom-left to top-right of at
  // least 40% of cells, with no colour-based shortcuts between non-consecutive cells.
  // Returns the path as an array of {row, col} objects, or null after 200 failed attempts.
  function generateSolutionPath(rows, cols, seqLen, sequence) {
    var minLen = Math.ceil(rows * cols * 0.4);
    var start  = { row: rows - 1, col: 0 };
    var end    = { row: 0, col: cols - 1 };
    var DIRS   = [[-1,0],[1,0],[0,-1],[0,1]];

    // Cap nodes visited per DFS attempt so each attempt fails fast,
    // enabling the 200-attempt loop to cycle efficiently on large grids.
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
          // Shortcut pruning: compare colours (not step indices) so that
          // repeated-colour sequences like [R,B,B] are handled correctly.
          // (a) earlier cell j can shortcut TO candidate k:
          //     colour needed after j === colour of k
          // (b) candidate k can shortcut TO earlier cell j:
          //     colour needed after k === colour of j
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

  // Returns true if any two non-consecutive adjacent path cells form a shortcut —
  // i.e. a player at cell i could jump directly to cell j because j's colour matches
  // what the player needs next. Uses colour comparison to handle repeated-colour sequences.
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
          // Compare colours, not step indices, so repeated-colour sequences
          // like [R,B,B] don't create undetected shortcuts.
          if (Math.abs(i - j) !== 1 && sequence[(i + 1) % seqLen] === sequence[j % seqLen]) return true;
        }
      }
    }
    return false;
  }

  // Builds the accessFrom data structure and returns an object exposing three
  // functions: canAccessFrom, setAccessFrom, removeAccessFrom.
  //
  // The backing store is a dict keyed by cellKey(r,c).  Each value is an object
  // whose keys are solution-path indices p and whose values are arrays of steps s,
  // meaning there is a path from solution cell p to (r,c) arriving at step s.
  //
  // Solution cells are seeded at initialisation: path cell at index p with step
  // p%seqLen gets entry {p: [p%seqLen]}.
  function buildAccessFrom(rows, cols, path, seqLen) {
    var store = {};

    // Seed each solution cell with its own path index and step.
    for (var i = 0; i < path.length; i++) {
      var k = cellKey(path[i].row, path[i].col);
      store[k] = {};
      store[k][i] = [i % seqLen];
    }

    // Returns the live dict {p: [s, ...], ...} for cell (r,c), or {} if unknown.
    function canAccessFrom(r, c) {
      return store[cellKey(r, c)] || {};
    }

    // Adds step s to the sList for key p at cell (r,c).
    // Returns true if s was new to that list, false if already present.
    function setAccessFrom(p, r, c, s) {
      var k = cellKey(r, c);
      if (!store[k])    store[k]    = {};
      if (!store[k][p]) store[k][p] = [];
      if (store[k][p].indexOf(s) !== -1) return false;
      store[k][p].push(s);
      return true;
    }

    // Removes step s from the sList for key p at cell (r,c).
    // Returns true if s was present, false if p or s was not found.
    // Removes the p key if its sList becomes empty.
    function removeAccessFrom(p, r, c, s) {
      var k = cellKey(r, c);
      if (!store[k] || !store[k][p]) return false;
      var idx = store[k][p].indexOf(s);
      if (idx === -1) return false;
      store[k][p].splice(idx, 1);
      if (store[k][p].length === 0) delete store[k][p];
      return true;
    }

    return { canAccessFrom: canAccessFrom, setAccessFrom: setAccessFrom, removeAccessFrom: removeAccessFrom };
  }

  // Allocates a rows×cols×seqLen array of booleans, all initialised to false.
  // forbidden[r][c][s] is set to true during dead-end extension whenever
  // attemptCandidateStep determines that assigning step s to cell (r,c) would
  // create a second solution path.
  function buildForbidden(rows, cols, seqLen) {
    var forbidden = [];
    for (var r = 0; r < rows; r++) {
      forbidden[r] = [];
      for (var c = 0; c < cols; c++) {
        forbidden[r][c] = [];
        for (var s = 0; s < seqLen; s++) forbidden[r][c][s] = false;
      }
    }
    return forbidden;
  }

// Builds two lookup structures from the solution path: isSol (set of solution cell keys)
  // and cellStep (rows×cols array with each solution cell's sequence step, null elsewhere).
  function buildSolutionMaps(rows, cols, path, seqLen) {
    var isSol = {};
    var cellStep = [];
    for (var r = 0; r < rows; r++) {
      cellStep[r] = [];
      for (var c = 0; c < cols; c++) cellStep[r][c] = null;
    }
    for (var i = 0; i < path.length; i++) {
      isSol[cellKey(path[i].row, path[i].col)] = true;
      cellStep[path[i].row][path[i].col] = i % seqLen;
    }
    return { isSol: isSol, cellStep: cellStep };
  }

  // Creates a coloured grid from a completed cellStep array.
  // Each cell gets sequence[step] as its colour; step -1 maps to BLACK_COLOUR.
  function buildGrid(rows, cols, cellStep, sequence) {
    var grid = createGrid(rows, cols);
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        var s = cellStep[r][c];
        grid[r][c].colour = (s === -1) ? BLACK_COLOUR : sequence[s];
      }
    }
    return grid;
  }

  // Bundles all mutable maze state and methods that operate on it, so those
  // methods only need (p, r, c, s) style arguments via closure.
  function buildMazeState(rows, cols, path, sequence) {
    var seqLen   = sequence.length;
    var maps     = buildSolutionMaps(rows, cols, path, seqLen);
    var isSol    = maps.isSol;
    var cellStep = maps.cellStep;
    var forbidden = buildForbidden(rows, cols, seqLen);
    var af        = buildAccessFrom(rows, cols, path, seqLen);

    // Key of the end cell (top-right corner).
    var endKey = cellKey(0, cols - 1);

    var DIRS = [[-1,0],[1,0],[0,-1],[0,1]];

    // Assigns step s to unassigned cell (r,c) from solution path index p.
    // Propagates reachability and detects second routes to End.
    // Returns true on success (no second solution created), false otherwise.
    // On failure, undoes all changes and resets cellStep[r][c] to null.
    function attemptCandidateStep(p, r, c, s) {
      cellStep[r][c] = s;
      af.setAccessFrom(p, r, c, s);

      var progress = true;
      while (progress) {
        progress = false;
        // Outer scan: visit every assigned cell in the grid.
        for (var r0 = 0; r0 < rows; r0++) {
          for (var c0 = 0; c0 < cols; c0++) {
            if (cellStep[r0][c0] === null) continue;
            var r0Key   = cellKey(r0, c0);
            var accDict = af.canAccessFrom(r0, c0);
            // For each (p0, s0) recorded as reaching (r0,c0).
            for (var p0str in accDict) {
              var p0    = parseInt(p0str, 10);
              var sList = accDict[p0];
              // For each step s0 in the live sList.
              for (var si = 0; si < sList.length; si++) {
                var s0   = sList[si];
                var sAdj = (s0 + 1) % seqLen;
                // Inner loop: check each neighbour of (r0,c0).
                for (var d = 0; d < DIRS.length; d++) {
                  var rAdj = r0 + DIRS[d][0], cAdj = c0 + DIRS[d][1];
                  if (rAdj < 0 || rAdj >= rows || cAdj < 0 || cAdj >= cols) continue;
                  if (cellStep[rAdj][cAdj] === null) continue;
                  var adjKey = cellKey(rAdj, cAdj);
                  var colAdj = cellStep[rAdj][cAdj] === -1
                    ? BLACK_COLOUR : sequence[cellStep[rAdj][cAdj]];

                  // Condition 1: both cells are consecutive solution-path cells —
                  // this is the intended route, not a new one; skip.
                  if (isSol[r0Key] && cellStep[r0][c0] === s0 &&
                      isSol[adjKey] && cellStep[rAdj][cAdj] === sAdj) {
                    continue;
                  }

                  // Condition 2: adj is End and its colour matches what the player
                  // needs next — a second route to End has been found; fail.
                  if (adjKey === endKey && sequence[sAdj] === colAdj) {
                    cellStep[r][c] = null;
                    return false;
                  }

                  // Propagate reachability.
                  if (sequence[sAdj] === colAdj) {
                    var added = af.setAccessFrom(p0, rAdj, cAdj, sAdj);
                    if (added) progress = true;
                  }
                }
              }
            }
          }
        }
      }

      return true;
    }

    // Returns the union of all steps reachable at (r,c) across every solution
    // path origin, derived directly from the accessFrom data structure.
    // Returns [] if the cell has not been assigned any step.
    function cellSteps(r, c) {
      var accDict = af.canAccessFrom(r, c);
      var steps = [];
      for (var pStr in accDict) {
        var sList = accDict[pStr];
        for (var i = 0; i < sList.length; i++) {
          if (steps.indexOf(sList[i]) === -1) steps.push(sList[i]);
        }
      }
      return steps;
    }

    return {
      cellStep:             cellStep,
      forbidden:            forbidden,
      isSol:                isSol,
      canAccessFrom:        af.canAccessFrom,
      cellSteps:            cellSteps,
      attemptCandidateStep: attemptCandidateStep,
    };
  }

  // Top-level pipeline: generates a maze with a unique solution path from bottom-left
  // to top-right. Tries up to 500 times to find a valid solution path.
  // Returns { grid, sequence, rows, cols }.
  function generateMaze(rows, cols, sequence) {
    var seqLength = sequence.length;
    for (var attempt = 0; attempt < 500; attempt++) {
      var path = generateSolutionPath(rows, cols, seqLength, sequence);
      if (!path) continue;
      if (hasShortcut(path, seqLength, sequence)) continue;

      var maps     = buildSolutionMaps(rows, cols, path, seqLength);
      var cellStep = maps.cellStep;

      return {
        grid:     buildGrid(rows, cols, cellStep, sequence),
        sequence: sequence,
        rows:     rows,
        cols:     cols,
      };
    }
    // Unreachable in practice — minimal fallback
    var grid = createGrid(rows, cols);
    for (var r = 0; r < rows; r++)
      for (var c = 0; c < cols; c++)
        grid[r][c].colour = sequence[0];
    return { grid: grid, sequence: sequence, rows: rows, cols: cols };
  }

  exports.COLOURS               = COLOURS;
  exports.SEQUENCES             = SEQUENCES;
  exports.BLACK_COLOUR          = BLACK_COLOUR;
  exports.getLabelColour        = getLabelColour;
  exports.generateMaze          = generateMaze;
  exports._shuffle              = shuffle;
  exports._cellKey              = cellKey;
  exports._createGrid           = createGrid;
  exports._generateSolutionPath = generateSolutionPath;
  exports._buildSolutionMaps    = buildSolutionMaps;
  exports._buildGrid            = buildGrid;
  exports._hasShortcut          = hasShortcut;
  exports._buildAccessFrom      = buildAccessFrom;
  exports._buildForbidden       = buildForbidden;
  exports._buildMazeState       = buildMazeState;

  if (typeof module !== 'undefined') module.exports = exports;
  else self.Generator = exports;   // self works in both Web Worker and browser window

}({}));
