// generator.js
(function (exports) {

  var DEBUG = false;
  function setDebug(b) {
    DEBUG = b;
  }
  function debug(s) {
    if (DEBUG) console.log(s);
  }

  var RGB = {
    RED:    '#e63946', // red
    YELLOW: '#f4d35e', // yellow
    BLUE:   '#4cc9f0', // blue
    GREEN:  '#4ade80', // green
    PURPLE: '#c084fc', // purple
    BLACK:  '#000000',
    L: {               // From RGB to letter
      '#e63946': 'R',
      '#f4d35e': 'Y',
      '#4cc9f0': 'B',
      '#4ade80': 'G',
      '#c084fc': 'P',
      '#000000': '-',
    }
  };

  var COLOURS = [
    RGB.RED,
    RGB.YELLOW,
    RGB.BLUE,
    RGB.GREEN,
    RGB.PURPLE,
  ];

  var SEQUENCES = [
    [RGB.RED, RGB.BLUE],                                       // red, blue
    [RGB.RED, RGB.YELLOW, RGB.BLUE],                           // red, yellow, blue
    [RGB.RED, RGB.BLUE,   RGB.BLUE],                           // red, blue, blue
    [RGB.RED, RGB.YELLOW, RGB.BLUE,   RGB.GREEN],                // red, yellow, blue, green
    [RGB.RED, RGB.BLUE,   RGB.YELLOW, RGB.BLUE],                // red, blue, yellow, blue
    [RGB.RED, RGB.YELLOW, RGB.YELLOW, RGB.BLUE],                // red, yellow, yellow, blue
    [RGB.RED, RGB.YELLOW, RGB.BLUE,   RGB.GREEN, RGB.PURPLE],     // red, yellow, blue, green, purple
  ];

  var DIRS = [[-1,0],[1,0],[0,-1],[0,1]];

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

  // Allocates a rows×cols 2D array of cells, each with its value (colour) initialised to null.
  function createGrid(rows, cols) {
    var grid = [];
    for (var r = 0; r < rows; r++) {
      grid[r] = [];
      for (var c = 0; c < cols; c++) {
        grid[r][c] = null;
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

  // Builds the accessFrom data structure and returns an object exposing three
  // functions: canAccessFrom, setAccessFrom, removeAccessFrom.
  //
  // The backing store is a dict keyed by cellKey(r,c).  Each value is an object
  // whose keys are solution-path indices p and whose values are arrays of steps s,
  // meaning there is a path from solution cell p to (r,c) arriving at step s.
  //
  // Solution cells are seeded at initialisation: path cell at index p with step
  // p%seqLen gets entry {p: [p%seqLen]}.
  function buildAccessFrom(rows, cols, path, sequence) {
    var seqLen = sequence.length;
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

    // Returns the union of all steps reachable at (r,c) across every path origin.
    // Returns [] if the cell has not been assigned any step.
    function cellSteps(r, c) {
      var accDict = canAccessFrom(r, c);
      var steps = [];
      for (var pStr in accDict) {
        var sList = accDict[pStr];
        for (var i = 0; i < sList.length; i++) {
          if (steps.indexOf(sList[i]) === -1) steps.push(sList[i]);
        }
      }
      return steps;
    }

    // Returns the colour of (r,c), or null if unassigned.
    // Throws if the cell's steps map to more than one colour.
    function colour(r, c) {
      var steps = cellSteps(r, c);
      if (steps.length === 0) return null;
      var col = sequence[steps[0]];
      for (var i = 1; i < steps.length; i++) {
        if (sequence[steps[i]] !== col)
          throw new Error('colour conflict at (' + r + ',' + c + '): step ' + steps[0] + ' is ' + col + ' but step ' + steps[i] + ' is ' + sequence[steps[i]]);
      }
      return col;
    }

    // Adds step s to the sList for key p at cell (r,c).
    // Returns true if s was new to that list, false if already present.
    // Throws if s has a different colour from steps already recorded for this cell.
    function setAccessFrom(p, r, c, s) {
      var existing = colour(r, c);
      if (existing !== null && existing !== sequence[s])
        throw new Error('colour conflict at (' + r + ',' + c + '): existing colour is ' + existing + ' but new step ' + s + ' is ' + sequence[s]);
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

    // Sets cell (r,c) to colour k by recording all matching steps under p=-1.
    // Throws if k conflicts with the cell's existing colour, or is not in the sequence.
    function setColour(r, c, k) {
      var gotColour = false;
      for (var s = 0; s < seqLen; s++) {
        if (sequence[s] === k) {
          gotColour = true;
          setAccessFrom(-1, r, c, s);
        }
      }
      if (!gotColour) throw new Error('Colour ' + k + ' is not in sequence');
    }

    // Removes the p=-1 entries for cell (r,c), uncolouring it.
    function unsetColour(r, c) {
      for (var s = 0; s < seqLen; s++) {
        removeAccessFrom(-1, r, c, s);
      }
    }
    return {
      canAccessFrom:  canAccessFrom,
      setAccessFrom:  setAccessFrom,
      removeAccessFrom: removeAccessFrom,
      cellSteps:      cellSteps,
      colour:         colour,
      setColour:      setColour,
      unsetColour:    unsetColour,
    };
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

  // Bundles all mutable maze state and methods that operate on it, so those
  // methods only need (p, r, c, s) style arguments via closure.
  function mazeContext(rows, cols, path, sequence) {
    var seqLen   = sequence.length;
    var forbidden = buildForbidden(rows, cols, seqLen);
    var af        = buildAccessFrom(rows, cols, path, sequence);

    var canAccessFrom  = af.canAccessFrom;
    var setAccessFrom  = af.setAccessFrom;
    var removeAccessFrom = af.removeAccessFrom;
    var cellSteps      = af.cellSteps;
    var colour         = af.colour;

    // Key of the end cell (top-right corner).
    var endKey = cellKey(0, cols - 1);

    var solIndex = {}; // Maps each solution-cell key to its path index.
    var isSol    = {}; // Maps each solution-cell key to true.
    for (var i = 0; i < path.length; i++) {
      key =cellKey(path[i].row, path[i].col);
      solIndex[key] = i;
      isSol[key]    = true;
    }

    function noNewPaths() {

      function undoAll() {
        for (var ui = 0; ui < undoList.length; ui++)
          removeAccessFrom(undoList[ui][0], undoList[ui][1], undoList[ui][2], undoList[ui][3]);
      }

      var undoList = [];
      var progress = true;

      while (progress) {
        progress = false;
        // Outer scan: visit every assigned cell in the grid.
        for (var r0 = 0; r0 < rows; r0++) {
          for (var c0 = 0; c0 < cols; c0++) {
            if (cellSteps(r0, c0).length === 0) continue;
            var r0Key   = cellKey(r0, c0);
            var accDict = canAccessFrom(r0, c0);
            // For each (p0, s0) recorded as reaching (r0,c0).
            for (var p0str in accDict) {
              var p0    = parseInt(p0str, 10);
              if (p0 < 0) continue;
              var sList = accDict[p0];
              // For each step s0 in the live sList.
              for (var si = 0; si < sList.length; si++) {
                var s0   = sList[si];
                var sAdj = (s0 + 1) % seqLen;
                // Inner loop: check each neighbour of (r0,c0).
                for (var d = 0; d < DIRS.length; d++) {
                  var rAdj = r0 + DIRS[d][0], cAdj = c0 + DIRS[d][1];
                  if (rAdj < 0 || rAdj >= rows || cAdj < 0 || cAdj >= cols) continue;
                  var colAdj = colour(rAdj, cAdj);
                  if (colAdj === null) continue;
                  var adjKey = cellKey(rAdj, cAdj);

                  // Condition 1: both cells are consecutive solution-path cells —
                  // this is the intended route, not a new one; skip.
                  if (isSol[r0Key] && isSol[adjKey] &&
                      cellSteps(rAdj, cAdj).includes(sAdj)) {
                    continue;
                  }

                  // Condition 2: adj is End and its colour matches what the player
                  // needs next — a second route to End has been found; fail.
                  if (adjKey === endKey && sequence[sAdj] === colAdj) {
                    undoAll();
                    return false;
                  }

                  // Condition 3: dead-end would rejoin the solution path at a
                  // different index — a second route through the solution exists; fail.
                  if (isSol[adjKey] && solIndex[adjKey] !== p0 &&
                      cellSteps(rAdj, cAdj).includes(sAdj)) {
                    undoAll();
                    return false;
                  }

                  // Condition 4: It's okay to access another cell, and then we
                  // can propagate reachability.
                  if (sequence[sAdj] === colAdj) {
                    var added = setAccessFrom(p0, rAdj, cAdj, sAdj);
                    if (added) {
                      undoList.push([p0, rAdj, cAdj, sAdj]);
                      progress = true;
                    }
                  }
                }
              }
            }
          }
        }
      }

      return true;
    }


    // Assigns step s to unassigned cell (r,c) from solution path index p.
    // Propagates reachability and detects second routes to End.
    // Returns true on success (no second solution created), false otherwise.
    // On failure, undoes all canAccessFrom changes made during this call.
    // Throws (via setAccessFrom) if s conflicts in colour with existing steps.
    function attemptCandidateStep(p, r, c, s) {
      setAccessFrom(p, r, c, s);
      var success = noNewPaths();
      if (success) return true;
      removeAccessFrom(p, r, c, s);
      return false;
    }

    // Fill the maze with sequence colours, without creating any new paths
    function fillRemaining() {
      var colours = [];
      for (var k of sequence) {
        if (!(k in colours)) colours.push(k);
      }

      for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
          if (af.colour(r, c)) continue;

          // Try each colour in turn.
          // Would ideally shuffle the colours, but probably won't make much difference.
          for (var k of colours) {
            af.setColour(r, c, k);
            if (noNewPaths()) {
              // We've found a suitable colour
              break;
            }
            af.unsetColour(r, c);
          }
          // Possible issue here - there may be no appropriate colours
          // but we've not said a colour/step is forbidden.

        }
      }
    }

    // Creates a coloured grid just from colours in the maze.
    // Each cell gets a colour, which may be RGB.BLACK.
    function toGrid() {
      var grid = createGrid(rows, cols);
      for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
          grid[r][c] = colour(r, c) || RGB.BLACK;
        }
      }
      return grid;
    }

    return {
      forbidden:            forbidden,
      isSol:                isSol,
      canAccessFrom:        canAccessFrom,
      setAccessFrom:        setAccessFrom,
      cellSteps:            cellSteps,
      colour:               colour,
      setColour:            af.setColour,
      unsetColour:          af.unsetColour,
      noNewPaths:           noNewPaths,
      attemptCandidateStep: attemptCandidateStep,
      fillRemaining:        fillRemaining,
      toGrid:               toGrid,
    };
  }

  // Pretty output format of a grid as a string.
  function format(grid) {
    var out = '';
    for (var r = 0; r < grid.length; r++) {
      for (var c = 0; c < grid[r].length; c++) {
        var rgb = grid[r][c];
        var ltr = RGB.L[rgb];    // Translate RGB string to a letter
        if (typeof ltr == 'undefined') ltr = '.';
        out += ltr + ' ';
      }
      out += '\n';
    }
    return out;
  }

  // Top-level pipeline: generates a maze with a unique solution path from bottom-left
  // to top-right. Tries up to 500 times to find a valid solution path.
  // Returns dict with keys { grid, sequence, rows, cols }.
  function generateMaze(rows, cols, sequence) {
    var seqLength = sequence.length;
    for (var attempt = 0; attempt < 500; attempt++) {
      debug('sequence is ' + sequence);
      var path = generateSolutionPath(rows, cols, seqLength, sequence);
      if (!path) continue;

      var ctx  = mazeContext(rows, cols, path, sequence);
      var grid = ctx.toGrid();

      if (countSolutions(grid, sequence) > 1) continue;

      ctx.fillRemaining();
      grid = ctx.toGrid(rows, cols, ctx, sequence);

      if (countSolutions(grid, sequence) > 1) {
        // We've filled the grid but there is still more than one solution.
        // That shouldn't happen
        throw new Error('More than one solution after filling grid');
        //continue;
      }
      return {
        grid:     grid,
        sequence: sequence,
        rows:     rows,
        cols:     cols,
      };
    }
    // Unreachable in practice — minimal fallback
    var grid = createGrid(rows, cols);
    for (var r = 0; r < rows; r++)
      for (var c = 0; c < cols; c++)
        grid[r][c] = sequence[0];
    return { grid: grid, sequence: sequence, rows: rows, cols: cols };
  }

  // Count if there is more than one solution in a grid of colours.
  // Will stop at second solution; won't count any more.
  // This is a standalone function so that we can pass in a grid
  // of our our devising.
  // endKey is the string key of the end cell, e.g. '0,2'.
  // If left undefined it defaults to the top right cell as string.
  function countSolutions(grid, sequence, endKey) {
    var rows    = grid.length;
    var cols    = grid[0].length;
    var seqLen  = sequence.length;
    var visited = {};
    var count   = 0;

    if (typeof endKey === 'undefined') {
      endKey = '0,' + (cols - 1)
    }

    // We define an xKey to be an extended key: row,col,step

    visited[(rows - 1) + ',0,0'] = true;

    (function dfs(r, c, step) {
      debug('Now at ' + r + ',' + c);

      if (count > 1) return;
      if (r + ',' + c === endKey) { count++; return; }

      var needed = sequence[step % seqLen];
      for (var i = 0; i < DIRS.length; i++) {
        var nr = r + DIRS[i][0], nc = c + DIRS[i][1];
        if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;

        var xKey = nr + ',' + nc + ',' + (step % seqLen);
        debug('  from ' + r + ',' + c + ' considering ' + xKey);
        if (visited[xKey]) {debug('  Continuing - visited'); continue; }

        if (grid[nr][nc] !== needed) {
          debug('  Continuing - wanted ' + needed + ' but got ' + grid[nr][nc]);
          continue;
        }

        visited[xKey] = true;
        dfs(nr, nc, step + 1);
        delete visited[xKey];
        debug('Stepping back from ' + xKey);
      }
    }(rows - 1, 0, 1));

    debug('Returning count ' + count);
    return count;
  }

  exports.setDebug              = setDebug;
  exports.debug                 = debug;
  exports.COLOURS               = COLOURS;
  exports.SEQUENCES             = SEQUENCES;
  exports.RGB                   = RGB;
  exports.getLabelColour        = getLabelColour;
  exports.generateMaze          = generateMaze;
  exports.format                = format;
  exports.countSolutions        = countSolutions;
  exports._shuffle              = shuffle;
  exports._cellKey              = cellKey;
  exports._createGrid           = createGrid;
  exports._generateSolutionPath = generateSolutionPath;
  exports._buildAccessFrom      = buildAccessFrom;
  exports._buildForbidden       = buildForbidden;
  exports._mazeContext          = mazeContext;

  if (typeof module !== 'undefined') module.exports = exports;
  else self.Generator = exports;   // self works in both Web Worker and browser window

}({}));
