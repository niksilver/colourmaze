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

  exports.COLOURS          = COLOURS;
  exports.getSequence      = getSequence;
  exports.getLabelColour   = getLabelColour;
  exports._shuffle         = shuffle;
  exports._cellKey         = cellKey;
  exports._generatePath    = generatePath;
  exports._createGrid      = createGrid;
  exports._assignPathColours = assignPathColours;
  exports._fillGrid        = fillGrid;
  exports.generateMaze     = null; // added in Task 6

  // In browser, exposes window.Generator
  if (typeof module !== 'undefined') module.exports = exports;
  else window.Generator = exports;

}({}));
