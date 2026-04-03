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
    if (!SEQUENCE_MAP[length]) {
      throw new Error('getSequence: unsupported length ' + length);
    }
    return SEQUENCE_MAP[length].slice();
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

  // Returns the first complete valid path that differs from solutionPath, or null.
  // "differs" means it contains at least one cell not in solSet.
  function findAlternativePath(grid, sequence, solutionPath, rows, cols) {
    var start = { row: rows - 1, col: 0 };
    var end   = { row: 0,        col: cols - 1 };
    var DIRS  = [[-1,0],[1,0],[0,-1],[0,1]];

    // Build set of solution path cell keys
    var solSet = {};
    for (var si = 0; si < solutionPath.length; si++) {
      solSet[cellKey(solutionPath[si].row, solutionPath[si].col)] = true;
    }

    var visited = {};
    visited[cellKey(start.row, start.col)] = true;

    return (function dfs(row, col, step, path, hasNonSol) {
      if (row === end.row && col === end.col) {
        return hasNonSol ? path.slice() : null;
      }
      var nextColour = sequence[step % sequence.length];
      for (var i = 0; i < DIRS.length; i++) {
        var nr = row + DIRS[i][0];
        var nc = col + DIRS[i][1];
        var nk = cellKey(nr, nc);
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols
            && !visited[nk]
            && grid[nr][nc].colour === nextColour) {
          var nextHasNonSol = hasNonSol || !solSet[nk];
          visited[nk] = true;
          path.push({ row: nr, col: nc });
          var result = dfs(nr, nc, step + 1, path, nextHasNonSol);
          if (result) return result;
          path.pop();
          delete visited[nk];
        }
      }
      return null;
    }(start.row, start.col, 1, [{ row: start.row, col: start.col }], false));
  }

  function repairUniqueness(grid, sequence, solutionPath, rows, cols) {
    var DIRS = [[-1,0],[1,0],[0,-1],[0,1]];

    // Build set of solution path cell keys
    var solSet = {};
    for (var i = 0; i < solutionPath.length; i++) {
      solSet[cellKey(solutionPath[i].row, solutionPath[i].col)] = true;
    }

    var maxIterations = 200;
    while (maxIterations-- > 0) {
      if (countPaths(grid, sequence, rows, cols) <= 1) break;

      var altPath = findAlternativePath(grid, sequence, solutionPath, rows, cols);
      if (!altPath) {
        // No alt path uses non-sol cells. All remaining alternatives reroute through
        // sol cells only (different traversal order). Find the shortcut edge and break it.
        // Strategy: find two sol cells that are grid-adjacent but not sol-path-adjacent.
        // Then ensure a non-sol cell adjacent to the earlier sol cell has the wrong colour
        // to prevent the alt path from going there, forcing it to use the solution order.
        var fixed = false;
        for (var si = 0; si < solutionPath.length && !fixed; si++) {
          var sc = solutionPath[si];
          for (var di = 0; di < DIRS.length && !fixed; di++) {
            var nr = sc.row + DIRS[di][0];
            var nc = sc.col + DIRS[di][1];
            var nk = cellKey(nr, nc);
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && solSet[nk]) {
              // Check if this is a "shortcut": adjacent in grid but not consecutive in sol path
              var nIdx = -1;
              for (var sx = 0; sx < solutionPath.length; sx++) {
                if (solutionPath[sx].row === nr && solutionPath[sx].col === nc) {
                  nIdx = sx; break;
                }
              }
              if (Math.abs(nIdx - si) !== 1) {
                // Shortcut found! Look for a non-sol cell adjacent to sc that we can change
                // to force any path that "shortcuts" from si to nIdx to fail
                for (var di2 = 0; di2 < DIRS.length && !fixed; di2++) {
                  var br = sc.row + DIRS[di2][0];
                  var bc = sc.col + DIRS[di2][1];
                  var bk = cellKey(br, bc);
                  if (br >= 0 && br < rows && bc >= 0 && bc < cols && !solSet[bk]) {
                    // Change this cell to a colour that doesn't match the step AFTER si
                    var targetStep = si + 1;
                    var neededColour = sequence[targetStep % sequence.length];
                    // Assign a colour that's NOT neededColour
                    var wrongColour = sequence[(targetStep + 1) % sequence.length];
                    if (grid[br][bc].colour !== wrongColour) {
                      grid[br][bc].colour = wrongColour;
                      fixed = true;
                    }
                  }
                }
              }
            }
          }
        }
        if (!fixed) break; // Can't fix: give up
        continue;
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

      // Safety: if no non-sol cell was found (shouldn't happen given findAlternativePath guarantee)
      if (!broken && altPath.length > 2) {
        var cell = altPath[altPath.length - 2];
        var step = altPath.length - 2;
        if (!solSet[cellKey(cell.row, cell.col)]) {
          grid[cell.row][cell.col].colour = sequence[(step + 1) % sequence.length];
        }
      }
    }
  }

  // Fill non-sol cells with colours that minimize shortcuts from sol path.
  // For each non-sol cell, find colours needed to enter it from adjacent sol cells,
  // then prefer a colour NOT in that forbidden set.
  function smartFillGrid(grid, path, sequence, rows, cols) {
    var DIRS = [[-1,0],[1,0],[0,-1],[0,1]];

    // Build map: cellKey -> step index in solution path
    var solStepMap = {};
    for (var i = 0; i < path.length; i++) {
      solStepMap[cellKey(path[i].row, path[i].col)] = i;
    }

    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        if (grid[r][c].colour !== null) continue; // already assigned (sol cell)
        var ck = cellKey(r, c);

        // Collect "forbidden" colours: colours that would let this cell be entered
        // from an adjacent sol cell at the correct step
        var forbidden = {};
        for (var di = 0; di < DIRS.length; di++) {
          var nr = r + DIRS[di][0];
          var nc = c + DIRS[di][1];
          var nk = cellKey(nr, nc);
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols
              && solStepMap[nk] !== undefined) {
            // Adjacent sol cell at step solStepMap[nk].
            // To enter (r,c) after this sol cell, (r,c) must have sequence[(solStepMap[nk]+1) % len]
            var neededColour = sequence[(solStepMap[nk] + 1) % sequence.length];
            forbidden[neededColour] = true;
          }
        }

        // Pick a colour not in forbidden, if possible
        var chosen = null;
        var shuffled = shuffle(sequence);
        for (var si = 0; si < shuffled.length; si++) {
          if (!forbidden[shuffled[si]]) {
            chosen = shuffled[si];
            break;
          }
        }
        // If all colours forbidden, fall back to random
        if (chosen === null) {
          chosen = sequence[Math.floor(Math.random() * sequence.length)];
        }
        grid[r][c].colour = chosen;
      }
    }
  }

  function generateMaze(rows, cols, seqLength) {
    var sequence = getSequence(seqLength);
    for (var attempt = 0; attempt < 1000; attempt++) {
      var path = generatePath(rows, cols);
      var grid = createGrid(rows, cols);
      assignPathColours(grid, path, sequence);
      smartFillGrid(grid, path, sequence, rows, cols);
      repairUniqueness(grid, sequence, path, rows, cols);
      if (countPaths(grid, sequence, rows, cols) === 1) {
        return { grid: grid, sequence: sequence, rows: rows, cols: cols };
      }
    }
    // Fallback: best-effort with smart fill (same as main loop)
    var path = generatePath(rows, cols);
    var grid = createGrid(rows, cols);
    assignPathColours(grid, path, sequence);
    smartFillGrid(grid, path, sequence, rows, cols);
    repairUniqueness(grid, sequence, path, rows, cols);
    return { grid: grid, sequence: sequence, rows: rows, cols: cols };
  }

  exports.COLOURS          = COLOURS;
  exports.getSequence      = getSequence;
  exports.getLabelColour   = getLabelColour;
  exports._shuffle         = shuffle;
  exports._cellKey         = cellKey;
  exports._generatePath    = generatePath;
  exports._createGrid      = createGrid;
  exports._assignPathColours = assignPathColours;
  exports._fillGrid        = fillGrid;
  exports._countPaths      = countPaths;
  exports.generateMaze         = generateMaze;
  exports._repairUniqueness    = repairUniqueness;
  exports._findAnyPath         = findAnyPath;

  // In browser, exposes window.Generator
  if (typeof module !== 'undefined') module.exports = exports;
  else window.Generator = exports;

}({}));
