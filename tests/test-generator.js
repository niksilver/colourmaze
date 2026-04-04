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

console.log('\n-- Utilities --');

test('COLOURS has 5 entries', function () {
  assert.strictEqual(G.COLOURS.length, 5);
});

test('SEQUENCES has 7 entries', function () {
  assert.strictEqual(G.SEQUENCES.length, 7);
});

test('SEQUENCES[0] is [red, blue]', function () {
  assert.deepStrictEqual(G.SEQUENCES[0], ['#e63946', '#4cc9f0']);
});

test('SEQUENCES[1] is [red, yellow, blue]', function () {
  assert.deepStrictEqual(G.SEQUENCES[1], ['#e63946', '#f4d35e', '#4cc9f0']);
});

test('SEQUENCES[2] is [red, blue, blue]', function () {
  assert.deepStrictEqual(G.SEQUENCES[2], ['#e63946', '#4cc9f0', '#4cc9f0']);
});

test('SEQUENCES[4] is [red, blue, yellow, blue]', function () {
  assert.deepStrictEqual(G.SEQUENCES[4], ['#e63946', '#4cc9f0', '#f4d35e', '#4cc9f0']);
});

test('SEQUENCES[5] is [red, yellow, yellow, blue]', function () {
  assert.deepStrictEqual(G.SEQUENCES[5], ['#e63946', '#f4d35e', '#f4d35e', '#4cc9f0']);
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

test('path starts at bottom-left (5x5)', function () {
  var path = G._generateSolutionPath(5, 5, 3);
  assert.ok(path !== null, 'path should not be null');
  assert.deepStrictEqual(path[0], { row: 4, col: 0 });
});

test('path ends at top-right (5x5)', function () {
  var path = G._generateSolutionPath(5, 5, 3);
  assert.ok(path !== null, 'path should not be null');
  assert.deepStrictEqual(path[path.length - 1], { row: 0, col: 4 });
});

test('all path steps are orthogonal (5x5)', function () {
  var path = G._generateSolutionPath(5, 5, 3);
  assert.ok(path !== null, 'path should not be null');
  for (var i = 1; i < path.length; i++) {
    var dr = Math.abs(path[i].row - path[i-1].row);
    var dc = Math.abs(path[i].col - path[i-1].col);
    assert.strictEqual(dr + dc, 1, 'step ' + i + ' is not orthogonal');
  }
});

test('path has no repeated cells (5x5)', function () {
  var path = G._generateSolutionPath(5, 5, 3);
  assert.ok(path !== null, 'path should not be null');
  var seen = {};
  path.forEach(function (c) {
    var k = G._cellKey(c.row, c.col);
    assert.ok(!seen[k], 'cell ' + k + ' appears twice');
    seen[k] = true;
  });
});

test('path meets minimum length (5x5, min=ceil(25*0.4)=10)', function () {
  var path = G._generateSolutionPath(5, 5, 3);
  assert.ok(path !== null, 'path should not be null');
  assert.ok(path.length >= 10, 'path length ' + path.length + ' < 10');
});

test('path meets minimum length (7x7, min=ceil(49*0.4)=20)', function () {
  var path = G._generateSolutionPath(7, 7, 3);
  assert.ok(path !== null, 'path should not be null');
  assert.ok(path.length >= 20, 'path length ' + path.length + ' < 20');
});

test('_hasShortcut returns false on a generated path (seqLen 3)', function () {
  var path = G._generateSolutionPath(5, 5, 3);
  assert.ok(path !== null, 'path should not be null');
  assert.strictEqual(G._hasShortcut(path, 3), false);
});

test('_hasShortcut returns true on a manually crafted shortcut (seqLen 2)', function () {
  // seqLen=2. path[0]=(2,0)step0, path[3]=(2,1)step1, they are adjacent,
  // |0-3|=3>1, (0+1)%2=1 === 3%2=1 => shortcut
  var path = [
    { row: 2, col: 0 },
    { row: 1, col: 0 },
    { row: 1, col: 1 },
    { row: 2, col: 1 },
    { row: 2, col: 2 }
  ];
  assert.strictEqual(G._hasShortcut(path, 2), true);
});

console.log('\n-- Grid Creation --');

test('_createGrid returns correct dimensions', function () {
  var grid = G._createGrid(4, 5);
  assert.strictEqual(grid.length, 4);
  assert.strictEqual(grid[0].length, 5);
  assert.strictEqual(grid[0][0].colour, null);
});

console.log('\n-- Cannot / Constraint Building --');

test('buildCannot: non-sol cell adjacent to End cannot be step endStep-1', function () {
  // 3x3 grid, seqLen 3
  // path = [(2,0),(1,0),(0,0),(0,1),(0,2)]
  // steps:    0     1     2     0     1
  // End=(0,2), endStep=4%3=1, endColour=sequence[1]
  // sequence[1]=sequence[1] => sBefore contains (1-1+3)%3=0
  // Adjacent non-sol cells to (0,2): (1,2) is non-sol
  // So cannot[1][2][0] must be true
  var path = [
    { row: 2, col: 0 },
    { row: 1, col: 0 },
    { row: 0, col: 0 },
    { row: 0, col: 1 },
    { row: 0, col: 2 }
  ];
  var seq = G.SEQUENCES[1];
  var cannot = G._buildCannot(3, 3, path, 3, seq);
  assert.strictEqual(cannot[1][2][0], true,
    'cannot[1][2][0] should be true (step 0 forbidden adjacent to End)');
});

test('buildCannot: non-sol cell (2,1) adjacent to path[0]=(2,0) step 0: before=(0-1+3)%3=2 => cannot[2][1][2]=true', function () {
  var path = [
    { row: 2, col: 0 },
    { row: 1, col: 0 },
    { row: 0, col: 0 },
    { row: 0, col: 1 },
    { row: 0, col: 2 }
  ];
  var seq = G.SEQUENCES[1];
  var cannot = G._buildCannot(3, 3, path, 3, seq);
  assert.strictEqual(cannot[2][1][2], true,
    'cannot[2][1][2] should be true (before-step forbidden adjacent to path[0])');
});

test('buildCannot: sol cell (0,0) has all cannot entries false', function () {
  var path = [
    { row: 2, col: 0 },
    { row: 1, col: 0 },
    { row: 0, col: 0 },
    { row: 0, col: 1 },
    { row: 0, col: 2 }
  ];
  var seq = G.SEQUENCES[1];
  var cannot = G._buildCannot(3, 3, path, 3, seq);
  for (var s = 0; s < 3; s++) {
    assert.strictEqual(cannot[0][0][s], false,
      'cannot[0][0][' + s + '] should be false (sol cell)');
  }
});

console.log('\n-- Dead-end / Fill Pipeline --');

test('after full pipeline no cell remains null in cellStep (5x5, seqLen 3)', function () {
  var rows = 5, cols = 5, seqLen = 3;
  var seq = G.SEQUENCES[1];
  var path = G._generateSolutionPath(rows, cols, seqLen);
  assert.ok(path !== null, 'path should not be null');

  var isSol = {};
  var cellStep = [];
  for (var r = 0; r < rows; r++) {
    cellStep[r] = [];
    for (var c = 0; c < cols; c++) cellStep[r][c] = null;
  }
  for (var i = 0; i < path.length; i++) {
    isSol[G._cellKey(path[i].row, path[i].col)] = true;
    cellStep[path[i].row][path[i].col] = i % seqLen;
  }

  var cannot = G._buildCannot(rows, cols, path, seqLen, seq);
  G._propagateCannot(cannot, rows, cols, seqLen, isSol);
  G._buildDeadEnds(rows, cols, cellStep, cannot, seqLen);
  G._fillRemaining(rows, cols, cellStep, cannot, seqLen);

  for (var r = 0; r < rows; r++) {
    for (var c = 0; c < cols; c++) {
      assert.ok(cellStep[r][c] !== null,
        'cell [' + r + ',' + c + '] is still null after fill');
    }
  }
});

test('all assigned steps are in range [-1, seqLen-1] (5x5, seqLen 3)', function () {
  var rows = 5, cols = 5, seqLen = 3;
  var seq = G.SEQUENCES[1];
  var path = G._generateSolutionPath(rows, cols, seqLen);
  assert.ok(path !== null, 'path should not be null');

  var isSol = {};
  var cellStep = [];
  for (var r = 0; r < rows; r++) {
    cellStep[r] = [];
    for (var c = 0; c < cols; c++) cellStep[r][c] = null;
  }
  for (var i = 0; i < path.length; i++) {
    isSol[G._cellKey(path[i].row, path[i].col)] = true;
    cellStep[path[i].row][path[i].col] = i % seqLen;
  }

  var cannot = G._buildCannot(rows, cols, path, seqLen, seq);
  G._propagateCannot(cannot, rows, cols, seqLen, isSol);
  G._buildDeadEnds(rows, cols, cellStep, cannot, seqLen);
  G._fillRemaining(rows, cols, cellStep, cannot, seqLen);

  for (var r = 0; r < rows; r++) {
    for (var c = 0; c < cols; c++) {
      var s = cellStep[r][c];
      assert.ok(s >= -1 && s <= seqLen - 1,
        'step ' + s + ' at [' + r + ',' + c + '] out of range');
    }
  }
});

console.log('\n-- generateMaze end-to-end --');

test('generateMaze returns correct shape (5x5, seq-3)', function () {
  var maze = G.generateMaze(5, 5, G.SEQUENCES[1]);
  assert.strictEqual(maze.grid.length, 5);
  assert.strictEqual(maze.grid[0].length, 5);
  assert.strictEqual(maze.sequence.length, 3);
  assert.strictEqual(maze.rows, 5);
  assert.strictEqual(maze.cols, 5);
});

test('generateMaze start cell colour equals sequence[0] (5x5, seq-3)', function () {
  var maze = G.generateMaze(5, 5, G.SEQUENCES[1]);
  assert.strictEqual(
    maze.grid[maze.rows - 1][0].colour,
    maze.sequence[0],
    'start cell colour should be sequence[0]'
  );
});

test('generateMaze(7,7, SEQUENCES[0]) completes without error', function () {
  var maze = G.generateMaze(7, 7, G.SEQUENCES[0]);
  assert.ok(maze.grid, 'grid should exist');
  assert.strictEqual(maze.rows, 7);
  assert.strictEqual(maze.cols, 7);
  assert.strictEqual(maze.sequence.length, 2);
});

test('generateMaze(7,7, SEQUENCES[1]) completes without error', function () {
  var maze = G.generateMaze(7, 7, G.SEQUENCES[1]);
  assert.ok(maze.grid, 'grid should exist');
  assert.strictEqual(maze.rows, 7);
  assert.strictEqual(maze.cols, 7);
  assert.strictEqual(maze.sequence.length, 3);
});

test('generateMaze(10,10, SEQUENCES[1]) completes without error', function () {
  var maze = G.generateMaze(10, 10, G.SEQUENCES[1]);
  assert.ok(maze.grid, 'grid should exist');
  assert.strictEqual(maze.rows, 10);
  assert.strictEqual(maze.cols, 10);
});

console.log('\n' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) process.exit(1);
