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

  // In browser, exposes window.Generator
  if (typeof module !== 'undefined') module.exports = exports;
  else window.Generator = exports;

}({}));
