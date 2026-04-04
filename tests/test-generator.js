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
  var path = G._generateSolutionPath(5, 5, 3, G.SEQUENCES[1]);
  assert.ok(path !== null, 'path should not be null');
  assert.deepStrictEqual(path[0], { row: 4, col: 0 });
});

test('path ends at top-right (5x5)', function () {
  var path = G._generateSolutionPath(5, 5, 3, G.SEQUENCES[1]);
  assert.ok(path !== null, 'path should not be null');
  assert.deepStrictEqual(path[path.length - 1], { row: 0, col: 4 });
});

test('all path steps are orthogonal (5x5)', function () {
  var path = G._generateSolutionPath(5, 5, 3, G.SEQUENCES[1]);
  assert.ok(path !== null, 'path should not be null');
  for (var i = 1; i < path.length; i++) {
    var dr = Math.abs(path[i].row - path[i-1].row);
    var dc = Math.abs(path[i].col - path[i-1].col);
    assert.strictEqual(dr + dc, 1, 'step ' + i + ' is not orthogonal');
  }
});

test('path has no repeated cells (5x5)', function () {
  var path = G._generateSolutionPath(5, 5, 3, G.SEQUENCES[1]);
  assert.ok(path !== null, 'path should not be null');
  var seen = {};
  path.forEach(function (c) {
    var k = G._cellKey(c.row, c.col);
    assert.ok(!seen[k], 'cell ' + k + ' appears twice');
    seen[k] = true;
  });
});

test('path meets minimum length (5x5, min=ceil(25*0.4)=10)', function () {
  var path = G._generateSolutionPath(5, 5, 3, G.SEQUENCES[1]);
  assert.ok(path !== null, 'path should not be null');
  assert.ok(path.length >= 10, 'path length ' + path.length + ' < 10');
});

test('path meets minimum length (7x7, min=ceil(49*0.4)=20)', function () {
  var path = G._generateSolutionPath(7, 7, 3, G.SEQUENCES[1]);
  assert.ok(path !== null, 'path should not be null');
  assert.ok(path.length >= 20, 'path length ' + path.length + ' < 20');
});

test('_hasShortcut returns false on a generated path (seqLen 3)', function () {
  var seq  = G.SEQUENCES[1];
  var path = G._generateSolutionPath(5, 5, 3, seq);
  assert.ok(path !== null, 'path should not be null');
  assert.strictEqual(G._hasShortcut(path, 3, seq), false);
});

test('_hasShortcut returns true on a manually crafted shortcut (seqLen 2)', function () {
  // seqLen=2, seq=[R,B]. path[0]=(2,0)step0 (R), path[3]=(2,1)step1 (B), adjacent,
  // |0-3|=3>1, seq[(0+1)%2]=seq[1]=B === seq[3%2]=seq[1]=B => shortcut
  var seq  = G.SEQUENCES[0]; // [R, B]
  var path = [
    { row: 2, col: 0 },
    { row: 1, col: 0 },
    { row: 1, col: 1 },
    { row: 2, col: 1 },
    { row: 2, col: 2 }
  ];
  assert.strictEqual(G._hasShortcut(path, 2, seq), true);
});

test('_hasShortcut detects colour-based shortcut in [R,B,B] (missed by old step-index check)', function () {
  // seqLen=3, seq=[R,B,B]. path[0]=(2,0)step0(R) adjacent to path[2]=(2,1)step2(B).
  // Old check: (0+1)%3=1 !== 2%3=2 — NOT detected.
  // New check: seq[(0+1)%3]=seq[1]=B === seq[2%3]=seq[2]=B — IS detected.
  var seq  = G.SEQUENCES[2]; // [R, B, B]
  var path = [
    { row: 2, col: 0 },
    { row: 1, col: 0 },
    { row: 2, col: 1 },  // adjacent to path[0] AND path[4]
    { row: 2, col: 2 },
    { row: 1, col: 2 },
    { row: 0, col: 2 }
  ];
  // path[0]=(2,0)step0(R), path[2]=(2,1)step2(B): adjacent, |0-2|=2, seq[1]=B === seq[2]=B => shortcut
  assert.strictEqual(G._hasShortcut(path, 3, seq), true);
});

console.log('\n-- Grid Creation --');

test('_createGrid returns correct dimensions', function () {
  var grid = G._createGrid(4, 5);
  assert.strictEqual(grid.length, 4);
  assert.strictEqual(grid[0].length, 5);
  assert.strictEqual(grid[0][0].colour, null);
});

console.log('\n-- Cannot / Constraint Building --');

test('buildCannot: non-sol cell adjacent to step-0 (R) sol cell cannot be entry step 2 (B)', function () {
  // path[0]=(2,0) step 0 (R). Entry step = (0-1+3)%3 = 2.
  // Non-sol adjacent: (2,1). cannot[2][1][2] must be true.
  var path = [
    { row: 2, col: 0 },
    { row: 1, col: 0 },
    { row: 0, col: 0 },
    { row: 0, col: 1 },
    { row: 0, col: 2 }
  ];
  var seq = G.SEQUENCES[1]; // [R, Y, B]
  var cannot = G._buildCannot(3, 3, path, 3, seq);
  assert.strictEqual(cannot[2][1][2], true,
    'cannot[2][1][2] should be true (entry step 2 forbidden adjacent to step-0 sol cell)');
});

test('buildCannot: non-sol cell adjacent to step-1 (Y) sol cell cannot be entry step 0 (R)', function () {
  // path[1]=(1,0) step 1 (Y). Entry step = (1-1+3)%3 = 0.
  // Non-sol adjacent: (1,1). cannot[1][1][0] must be true.
  var path = [
    { row: 2, col: 0 },
    { row: 1, col: 0 },
    { row: 0, col: 0 },
    { row: 0, col: 1 },
    { row: 0, col: 2 }
  ];
  var seq = G.SEQUENCES[1]; // [R, Y, B]
  var cannot = G._buildCannot(3, 3, path, 3, seq);
  assert.strictEqual(cannot[1][1][0], true,
    'cannot[1][1][0] should be true (entry step 0 forbidden adjacent to step-1 sol cell)');
});

test('buildCannot: [R,B,B] non-sol cell (1,1) adjacent to two sol cells gets both entry steps forbidden', function () {
  // path[1]=(1,0) step 1 (B): entry step = (1-1+3)%3 = 0. Forbids cannot[1][1][0].
  // path[3]=(0,1) step 0 (R): entry step = (0-1+3)%3 = 2. Forbids cannot[1][1][2].
  // (1,1) is adjacent to both, so steps 0 and 2 are forbidden; step 1 remains allowed.
  var path = [
    { row: 2, col: 0 },
    { row: 1, col: 0 },
    { row: 0, col: 0 },
    { row: 0, col: 1 },
    { row: 0, col: 2 }
  ];
  var seq = G.SEQUENCES[2]; // [R, B, B]
  var cannot = G._buildCannot(3, 3, path, 3, seq);
  assert.strictEqual(cannot[1][1][0], true,
    'cannot[1][1][0] should be true (entry step 0 forbidden: adjacent to path[1] step 1)');
  assert.strictEqual(cannot[1][1][1], false,
    'cannot[1][1][1] should be false (no sol cell has entry step 1 adjacent to (1,1))');
  assert.strictEqual(cannot[1][1][2], true,
    'cannot[1][1][2] should be true (entry step 2 forbidden: adjacent to path[3] step 0)');
});

test('buildCannot: [R,B,B] End cell sBefore covers all entry routes (steps 0 and 1 forbidden)', function () {
  // path[4]=(0,2) is End. endStep=4%3=1 (B). endColour=B.
  // Steps s with seq[s]=B: s=1,2. sBefore={(1-1+3)%3,(2-1+3)%3}={0,1}.
  // Adjacent non-sol to End: (1,2). cannot[1][2][0] and cannot[1][2][1] must both be true.
  var path = [
    { row: 2, col: 0 },
    { row: 1, col: 0 },
    { row: 0, col: 0 },
    { row: 0, col: 1 },
    { row: 0, col: 2 }
  ];
  var seq = G.SEQUENCES[2]; // [R, B, B]
  var cannot = G._buildCannot(3, 3, path, 3, seq);
  assert.strictEqual(cannot[1][2][0], true,
    'cannot[1][2][0] should be true (sBefore step 0 forbidden adjacent to End)');
  assert.strictEqual(cannot[1][2][1], true,
    'cannot[1][2][1] should be true (sBefore step 1 forbidden adjacent to End)');
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

console.log('\n-- buildSolutionMaps --');

test('buildSolutionMaps: isSol marks exactly the path cells', function () {
  var path = [
    { row: 2, col: 0 },
    { row: 1, col: 0 },
    { row: 0, col: 0 },
    { row: 0, col: 1 },
    { row: 0, col: 2 }
  ];
  var result = G._buildSolutionMaps(3, 3, path, 3);
  assert.strictEqual(result.isSol['2,0'], true);
  assert.strictEqual(result.isSol['1,0'], true);
  assert.strictEqual(result.isSol['0,0'], true);
  assert.strictEqual(result.isSol['0,1'], true);
  assert.strictEqual(result.isSol['0,2'], true);
  assert.strictEqual(result.isSol['1,1'], undefined);
  assert.strictEqual(result.isSol['2,2'], undefined);
});

test('buildSolutionMaps: cellStep assigns correct sequence steps to path cells', function () {
  // path of length 5, seqLen 3: steps 0,1,2,0,1
  var path = [
    { row: 2, col: 0 },
    { row: 1, col: 0 },
    { row: 0, col: 0 },
    { row: 0, col: 1 },
    { row: 0, col: 2 }
  ];
  var result = G._buildSolutionMaps(3, 3, path, 3);
  assert.strictEqual(result.cellStep[2][0], 0);
  assert.strictEqual(result.cellStep[1][0], 1);
  assert.strictEqual(result.cellStep[0][0], 2);
  assert.strictEqual(result.cellStep[0][1], 0); // 3 % 3 = 0
  assert.strictEqual(result.cellStep[0][2], 1); // 4 % 3 = 1
});

test('buildSolutionMaps: cellStep is null for non-path cells', function () {
  var path = [
    { row: 2, col: 0 },
    { row: 1, col: 0 },
    { row: 0, col: 0 },
    { row: 0, col: 1 },
    { row: 0, col: 2 }
  ];
  var result = G._buildSolutionMaps(3, 3, path, 3);
  assert.strictEqual(result.cellStep[1][1], null);
  assert.strictEqual(result.cellStep[2][1], null);
  assert.strictEqual(result.cellStep[2][2], null);
  assert.strictEqual(result.cellStep[1][2], null);
});

console.log('\n-- buildGrid --');

test('buildGrid: cell colour matches sequence[cellStep]', function () {
  var seq = G.SEQUENCES[1]; // [R, Y, B]
  var cellStep = [[0, 1], [2, 0]];
  var grid = G._buildGrid(2, 2, cellStep, seq);
  assert.strictEqual(grid[0][0].colour, seq[0]); // R
  assert.strictEqual(grid[0][1].colour, seq[1]); // Y
  assert.strictEqual(grid[1][0].colour, seq[2]); // B
  assert.strictEqual(grid[1][1].colour, seq[0]); // R
});

test('buildGrid: cellStep -1 produces BLACK_COLOUR', function () {
  var seq = G.SEQUENCES[1];
  var cellStep = [[0, -1], [-1, 1]];
  var grid = G._buildGrid(2, 2, cellStep, seq);
  assert.strictEqual(grid[0][1].colour, G.BLACK_COLOUR);
  assert.strictEqual(grid[1][0].colour, G.BLACK_COLOUR);
});

test('buildGrid: returns correct dimensions', function () {
  var seq = G.SEQUENCES[0]; // [R, B]
  var cellStep = [[0, 1, 0], [1, 0, 1]];
  var grid = G._buildGrid(2, 3, cellStep, seq);
  assert.strictEqual(grid.length, 2);
  assert.strictEqual(grid[0].length, 3);
});

console.log('\n-- expandDeadEndsOnce --');

test('expandDeadEndsOnce: assigns next step to a null neighbour', function () {
  // 1x2 grid: cell (0,0) has step 0, cell (0,1) is null and step 1 is allowed
  var cellStep = [[0, null]];
  var cannot   = [[[false, false, false], [false, false, false]]];
  G._expandDeadEndsOnce(1, 2, cellStep, cannot, 3);
  assert.strictEqual(cellStep[0][1], 1, 'cell (0,1) should be assigned step 1');
});

test('expandDeadEndsOnce: returns true when an assignment was made', function () {
  var cellStep = [[0, null]];
  var cannot   = [[[false, false, false], [false, false, false]]];
  var changed  = G._expandDeadEndsOnce(1, 2, cellStep, cannot, 3);
  assert.strictEqual(changed, true);
});

test('expandDeadEndsOnce: returns false when no assignment was made', function () {
  // cell (0,1) already assigned — nothing to do
  var cellStep = [[0, 1]];
  var cannot   = [[[false, false, false], [false, false, false]]];
  var changed  = G._expandDeadEndsOnce(1, 2, cellStep, cannot, 3);
  assert.strictEqual(changed, false);
});

test('expandDeadEndsOnce: does not assign a forbidden step', function () {
  // cell (0,0) step 0, next=1; cell (0,1) null but step 1 is forbidden
  var cellStep = [[0, null]];
  var cannot   = [[[false, false, false], [false, true, false]]];
  G._expandDeadEndsOnce(1, 2, cellStep, cannot, 3);
  assert.strictEqual(cellStep[0][1], null, 'cell (0,1) should remain null');
});

test('expandDeadEndsOnce: wraps step seqLen-1 to step 0', function () {
  // seqLen=3, cell (0,0) has step 2, next = (2+1)%3 = 0
  var cellStep = [[2, null]];
  var cannot   = [[[false, false, false], [false, false, false]]];
  G._expandDeadEndsOnce(1, 2, cellStep, cannot, 3);
  assert.strictEqual(cellStep[0][1], 0, 'step should wrap to 0');
});

test('expandDeadEndsOnce: does not overwrite an already-assigned cell', function () {
  // cell (0,0) step 0, cell (0,1) already step 2 — must not be overwritten
  var cellStep = [[0, 2]];
  var cannot   = [[[false, false, false], [false, false, false]]];
  G._expandDeadEndsOnce(1, 2, cellStep, cannot, 3);
  assert.strictEqual(cellStep[0][1], 2, 'cell (0,1) should keep its original step');
});

test('expandDeadEndsOnce: scan-order means a backward chain needs a second pass', function () {
  // 1x3: (0,2)=step 0. Scan goes left-to-right, so (0,0) and (0,1) are visited
  // before (0,2) is processed. One pass assigns (0,1)=1 from (0,2); (0,0) is
  // only reachable from (0,1) in a second pass.
  var cellStep = [[null, null, 0]];
  var cannot   = [[[false,false,false],[false,false,false],[false,false,false]]];
  G._expandDeadEndsOnce(1, 3, cellStep, cannot, 3);
  assert.strictEqual(cellStep[0][1], 1,    'cell (0,1) should be assigned step 1');
  assert.strictEqual(cellStep[0][0], null, 'cell (0,0) should still be null after one pass');
});

console.log('\n-- buildDeadEnds --');

test('buildDeadEnds: chains propagation across multiple cells', function () {
  // 1x3: (0,0)=step 0; one call should chain through (0,1) and (0,2)
  var cellStep = [[0, null, null]];
  var cannot   = [[[false,false,false],[false,false,false],[false,false,false]]];
  G._buildDeadEnds(1, 3, cellStep, cannot, 3);
  assert.strictEqual(cellStep[0][1], 1, 'cell (0,1) should be step 1');
  assert.strictEqual(cellStep[0][2], 2, 'cell (0,2) should be step 2');
});

test('buildDeadEnds: stops when forbidden step blocks propagation', function () {
  // 1x3: (0,0)=step 0; (0,1) allows step 1; (0,2) forbids step 2
  var cellStep = [[0, null, null]];
  var cannot   = [[[false,false,false],[false,false,false],[false,false,true]]];
  G._buildDeadEnds(1, 3, cellStep, cannot, 3);
  assert.strictEqual(cellStep[0][1], 1,    'cell (0,1) should be step 1');
  assert.strictEqual(cellStep[0][2], null, 'cell (0,2) should remain null');
});

test('buildDeadEnds: propagates in all four directions from a seed cell', function () {
  // 3x3 grid, centre (1,1) seeded at step 0; all neighbours null and unconstrained
  var cellStep = [[null,null,null],[null,0,null],[null,null,null]];
  var cannot   = [];
  for (var r=0;r<3;r++){cannot[r]=[];for(var c=0;c<3;c++)cannot[r][c]=[false,false,false];}
  G._buildDeadEnds(3, 3, cellStep, cannot, 3);
  assert.strictEqual(cellStep[0][1], 1, 'north neighbour gets step 1');
  assert.strictEqual(cellStep[2][1], 1, 'south neighbour gets step 1');
  assert.strictEqual(cellStep[1][0], 1, 'west neighbour gets step 1');
  assert.strictEqual(cellStep[1][2], 1, 'east neighbour gets step 1');
});

console.log('\n-- Dead-end / Fill Pipeline --');

test('after full pipeline no cell remains null in cellStep (5x5, seqLen 3)', function () {
  var rows = 5, cols = 5, seqLen = 3;
  var seq = G.SEQUENCES[1];
  var path = G._generateSolutionPath(rows, cols, seqLen, seq);
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
  var path = G._generateSolutionPath(rows, cols, seqLen, seq);
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

console.log('\n-- Uniqueness solver --');

function countSolutions(maze) {
  var seq     = maze.sequence;
  var seqLen  = seq.length;
  var rows    = maze.rows;
  var cols    = maze.cols;
  var DIRS    = [[-1,0],[1,0],[0,-1],[0,1]];
  var visited = {};
  var count   = 0;

  visited[(rows - 1) + ',0'] = true;

  (function dfs(r, c, step) {
    if (count > 1) return;
    if (r === 0 && c === cols - 1) { count++; return; }
    var needed = seq[step % seqLen];
    for (var i = 0; i < DIRS.length; i++) {
      var nr = r + DIRS[i][0], nc = c + DIRS[i][1];
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
      var key = nr + ',' + nc;
      if (visited[key]) continue;
      if (maze.grid[nr][nc].colour !== needed) continue;
      visited[key] = true;
      dfs(nr, nc, step + 1);
      delete visited[key];
    }
  }(rows - 1, 0, 1));

  return count;
}

test('countSolutions returns 1 for a hand-crafted unique 3x3 maze', function () {
  // Straight path (2,0)→(1,0)→(0,0)→(0,1)→(0,2), seq=[R,B]
  // Non-sol cells all coloured to be unreachable
  var seq  = G.SEQUENCES[0]; // [red, blue]
  var grid = G._createGrid(3, 3);
  // solution path colours: step%2 → 0=red,1=blue,0=red,1=blue,0=red
  grid[2][0].colour = seq[0]; // red  (step 0)
  grid[1][0].colour = seq[1]; // blue (step 1)
  grid[0][0].colour = seq[0]; // red  (step 2)
  grid[0][1].colour = seq[1]; // blue (step 3)
  grid[0][2].colour = seq[0]; // red  (step 4) — end cell
  // All other cells: colour them black (unreachable)
  grid[2][1].colour = '#000000';
  grid[2][2].colour = '#000000';
  grid[1][1].colour = '#000000';
  grid[1][2].colour = '#000000';
  var maze = { grid: grid, sequence: seq, rows: 3, cols: 3 };
  assert.strictEqual(countSolutions(maze), 1);
});

test('countSolutions returns 2 when two paths exist', function () {
  // 3x3, seq=[R,B]. From start (2,0) the only first move is (1,0) (black
  // blocks (2,1)), then two routes diverge via (0,0) or (1,1):
  // path A: (2,0)→(1,0)→(0,0)→(0,1)→(0,2)
  // path B: (2,0)→(1,0)→(1,1)→(0,1)→(0,2)
  var seq  = G.SEQUENCES[0]; // [R, B]
  var grid = G._createGrid(3, 3);
  grid[2][0].colour = seq[0]; // R  step 0  (start)
  grid[1][0].colour = seq[1]; // B  step 1
  grid[0][0].colour = seq[0]; // R  step 2
  grid[0][1].colour = seq[1]; // B  step 3
  grid[0][2].colour = seq[0]; // R  step 4  (end)
  grid[1][1].colour = seq[0]; // R  step 2 — alternate branch
  grid[2][1].colour = '#000000'; // blocked so start has only one B neighbour
  grid[2][2].colour = '#000000';
  grid[1][2].colour = '#000000';
  var maze = { grid: grid, sequence: seq, rows: 3, cols: 3 };
  assert.strictEqual(countSolutions(maze), 2);
});

console.log('\n-- Uniqueness (50 runs, 5×5, red-blue-blue) --');

test('5×5 red-blue-blue maze has exactly one solution (50 runs)', function () {
  var seq = G.SEQUENCES[2]; // [red, blue, blue]
  for (var i = 0; i < 50; i++) {
    var maze = G.generateMaze(5, 5, seq);
    var n    = countSolutions(maze);
    assert.strictEqual(n, 1,
      'run ' + (i + 1) + ': expected 1 solution, got ' + n);
  }
});

console.log('\n' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) process.exit(1);
