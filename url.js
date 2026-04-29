// url.js — depends on generator.js being loaded first
(function (exports) {

  var BASE62 = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

  // Full 6-colour palette: COLOURS[0-4] + BLACK[5]
  function palette() {
    return Generator.COLOURS.concat([Generator.RGB.BLACK]);
  }

  function encodeGrid(grid) {
    var pal = palette();
    var n = BigInt(0);
    for (var r = 0; r < grid.length; r++) {
      for (var c = 0; c < grid[r].length; c++) {
        n = n * BigInt(6) + BigInt(pal.indexOf(grid[r][c]));
      }
    }
    if (n === BigInt(0)) return '0';
    var result = '';
    while (n > BigInt(0)) {
      result = BASE62[Number(n % BigInt(62))] + result;
      n = n / BigInt(62);
    }
    return result;
  }

  function decodeGrid(str, rows, cols) {
    var n = BigInt(0);
    for (var i = 0; i < str.length; i++) {
      n = n * BigInt(62) + BigInt(BASE62.indexOf(str[i]));
    }
    var total = rows * cols;
    var indices = [];
    for (var j = 0; j < total; j++) {
      indices.push(Number(n % BigInt(6)));
      n = n / BigInt(6);
    }
    indices.reverse();
    var pal = palette();
    var grid = [];
    for (var r = 0; r < rows; r++) {
      grid[r] = [];
      for (var c = 0; c < cols; c++) {
        grid[r][c] = pal[indices[r * cols + c]];
      }
    }
    return grid;
  }

  function buildHash(gridSize, sequence, grid) {
    var letters = sequence.map(function (col) { return Generator.RGB.L[col]; }).join('');
    var g = encodeGrid(grid);
    return '#s=' + gridSize + '&c=' + letters + '&g=' + g;
  }

  function parseHash(hash) {
    if (!hash || hash === '#' || hash === '') return null;
    var str = hash.charAt(0) === '#' ? hash.slice(1) : hash;
    var params = {};
    str.split('&').forEach(function (part) {
      var eq = part.indexOf('=');
      if (eq !== -1) params[part.slice(0, eq)] = part.slice(eq + 1);
    });

    var gridSize = parseInt(params.s, 10);
    if (isNaN(gridSize) || gridSize < 1) return null;

    if (!params.c) return null;
    var RGB = Generator.RGB;
    var letterToColour = { R: RGB.RED, Y: RGB.YELLOW, B: RGB.BLUE, G: RGB.GREEN, P: RGB.PURPLE };
    var sequence = [];
    for (var i = 0; i < params.c.length; i++) {
      var col = letterToColour[params.c[i]];
      if (!col) return null;
      sequence.push(col);
    }
    if (sequence.length === 0) return null;

    if (!params.g) return null;

    var grid;
    try {
      grid = decodeGrid(params.g, gridSize, gridSize);
    } catch (e) {
      return null;
    }

    return { gridSize: gridSize, sequence: sequence, grid: grid };
  }

  exports.encodeGrid = encodeGrid;
  exports.decodeGrid = decodeGrid;
  exports.buildHash  = buildHash;
  exports.parseHash  = parseHash;

  if (typeof module !== 'undefined') module.exports = exports;
  else self.MazeURL = exports;

}({}));
