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

  // Assigns a random permitted step to every still-unassigned cell.
  // If all steps are forbidden for a cell, assigns -1 (rendered black).
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
  exports._buildForbidden       = buildForbidden;
  exports._fillRemaining        = fillRemaining;

  if (typeof module !== 'undefined') module.exports = exports;
  else self.Generator = exports;   // self works in both Web Worker and browser window

}({}));
