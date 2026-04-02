// tests/test-generator.js
const assert = require('assert');
const G = require('../generator.js');

let passed = 0, failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log('  ✓ ' + name);
    passed++;
  } catch (e) {
    console.log('  ✗ ' + name + ': ' + e.message);
    failed++;
  }
}

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

console.log('\n' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) process.exit(1);
