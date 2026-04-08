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

console.log('\n-- buildForbidden --');

test('buildForbidden: returns rows×cols array', function () {
  var f = G._buildForbidden(3, 4, 2);
  assert.strictEqual(f.length, 3);
  assert.strictEqual(f[0].length, 4);
});

test('buildForbidden: each cell has seqLen entries', function () {
  var f = G._buildForbidden(2, 2, 5);
  assert.strictEqual(f[0][0].length, 5);
  assert.strictEqual(f[1][1].length, 5);
});

test('buildForbidden: all entries are initially false', function () {
  var f = G._buildForbidden(2, 3, 3);
  for (var r = 0; r < 2; r++)
    for (var c = 0; c < 3; c++)
      for (var s = 0; s < 3; s++)
        assert.strictEqual(f[r][c][s], false, 'f[' + r + '][' + c + '][' + s + '] should be false');
});

console.log('\n-- accessFrom --');

// Shared path for all accessFrom tests: 3-cell column, seqLen 3.
// path[0]=(2,0) step 0, path[1]=(1,0) step 1, path[2]=(0,0) step 2.
var AF_PATH = [{ row: 2, col: 0 }, { row: 1, col: 0 }, { row: 0, col: 0 }];

test('canAccessFrom: after initialisation, returns {} for a non-solution cell', function () {
  var af = G._buildAccessFrom(3, 2, AF_PATH, G.SEQUENCES[2]);
  assert.deepStrictEqual(af.canAccessFrom(2, 1), {});
});

test('canAccessFrom: after initialisation, returns {p:[s]} for each solution cell', function () {
  var af = G._buildAccessFrom(3, 2, AF_PATH, G.SEQUENCES[2]);
  assert.deepStrictEqual(af.canAccessFrom(2, 0), { 0: [0] });
  assert.deepStrictEqual(af.canAccessFrom(1, 0), { 1: [1] });
  assert.deepStrictEqual(af.canAccessFrom(0, 0), { 2: [2] });
});

test('setAccessFrom: returns true when s is new (new p key)', function () {
  var af = G._buildAccessFrom(3, 2, AF_PATH, G.SEQUENCES[2]);
  assert.strictEqual(af.setAccessFrom(0, 2, 1, 1), true);
});

test('setAccessFrom: returns false when s already present', function () {
  var af = G._buildAccessFrom(3, 2, AF_PATH, G.SEQUENCES[2]);
  af.setAccessFrom(0, 2, 1, 1);
  assert.strictEqual(af.setAccessFrom(0, 2, 1, 1), false);
});

test('setAccessFrom: canAccessFrom reflects the addition', function () {
  var af = G._buildAccessFrom(3, 2, AF_PATH, G.SEQUENCES[2]);
  af.setAccessFrom(0, 2, 1, 1);
  assert.deepStrictEqual(af.canAccessFrom(2, 1), { 0: [1] });
});

test('setAccessFrom: multiple steps accumulate for same p', function () {
  var af = G._buildAccessFrom(3, 2, AF_PATH, G.SEQUENCES[2]);
  af.setAccessFrom(0, 2, 1, 1);
  af.setAccessFrom(0, 2, 1, 2);
  var entry = af.canAccessFrom(2, 1);
  assert.ok(entry[0].indexOf(1) !== -1, 'step 1 should be present');
  assert.ok(entry[0].indexOf(2) !== -1, 'step 2 should be present');
});

test('setAccessFrom: multiple p keys coexist', function () {
  var af = G._buildAccessFrom(3, 2, AF_PATH, G.SEQUENCES[2]);
  af.setAccessFrom(0, 2, 1, 1);
  af.setAccessFrom(1, 2, 1, 2);
  var entry = af.canAccessFrom(2, 1);
  assert.ok(entry[0] !== undefined, 'p=0 key should exist');
  assert.ok(entry[1] !== undefined, 'p=1 key should exist');
});

test('removeAccessFrom: returns true when s was present and removes it', function () {
  var af = G._buildAccessFrom(3, 2, AF_PATH, G.SEQUENCES[2]);
  af.setAccessFrom(0, 2, 1, 1);
  assert.strictEqual(af.removeAccessFrom(0, 2, 1, 1), true);
  assert.deepStrictEqual(af.canAccessFrom(2, 1), {});
});

test('removeAccessFrom: removes p key when sList becomes empty', function () {
  var af = G._buildAccessFrom(3, 2, AF_PATH, G.SEQUENCES[2]);
  af.setAccessFrom(0, 2, 1, 1);
  af.removeAccessFrom(0, 2, 1, 1);
  var entry = af.canAccessFrom(2, 1);
  assert.strictEqual(entry[0], undefined, 'p=0 key should be gone');
});

test('removeAccessFrom: returns false when p does not exist', function () {
  var af = G._buildAccessFrom(3, 2, AF_PATH, G.SEQUENCES[2]);
  assert.strictEqual(af.removeAccessFrom(5, 2, 1, 0), false);
});

test('setAccessFrom: throws when adding a step whose colour conflicts with an existing step', function () {
  var seq  = G.SEQUENCES[1]; // [R, Y, B] — step 0=R, step 2=B, different colours
  var path = [{ row: 2, col: 0 }, { row: 1, col: 0 }, { row: 0, col: 0 }];
  var ctx  = G._buildMazeState(3, 3, path, seq);
  ctx.setAccessFrom(0, 2, 1, 0); // step 0 (R)
  assert.throws(function () {
    ctx.setAccessFrom(1, 2, 1, 2); // step 2 (B) — conflicts with R
  });
});

test('removeAccessFrom: returns false when s not in sList for p', function () {
  var af = G._buildAccessFrom(3, 2, AF_PATH, G.SEQUENCES[2]);
  af.setAccessFrom(0, 2, 1, 1);
  assert.strictEqual(af.removeAccessFrom(0, 2, 1, 2), false);
});

console.log('\n-- attemptCandidateStep (success path) --');

test('attemptCandidateStep: returns true and assigns step for a safe cell', function () {
  // 3×3 grid, seq=[R,Y,B]. Solution: (2,0)→(1,0)→(0,0)→(0,1)→(0,2).
  // Steps: 0,1,2,0,1.
  // Attempt: assign step 1 to (2,1) from p=0 (Start cell at (2,0)).
  // (2,1)'s only assigned neighbour is (2,0) — no condition 2 or 3 can fire.
  var seq  = G.SEQUENCES[1]; // [R, Y, B]
  var path = [
    { row: 2, col: 0 }, { row: 1, col: 0 }, { row: 0, col: 0 },
    { row: 0, col: 1 }, { row: 0, col: 2 }
  ];
  var ctx = G._buildMazeState(3, 3, path, seq);

  var result = ctx.attemptCandidateStep(0, 2, 1, 1);
  assert.strictEqual(result, true, 'should return true (success)');
  assert.deepStrictEqual(ctx.cellSteps(2, 1), [1], 'cell (2,1) should be assigned step 1');
  assert.deepStrictEqual(ctx.canAccessFrom(2, 1), { 0: [1] });
});

test('attemptCandidateStep: returns false when cell adjacent to End creates second route', function () {
  // End (0,2) has step 1 (Y). Assigning step 0 (R) to (1,2) means the player
  // can walk (1,2)→(0,2), a second route to End.
  var seq  = G.SEQUENCES[1]; // [R, Y, B]
  var path = [
    { row: 2, col: 0 }, { row: 1, col: 0 }, { row: 0, col: 0 },
    { row: 0, col: 1 }, { row: 0, col: 2 }
  ];
  var ctx = G._buildMazeState(3, 3, path, seq);
  var result = ctx.attemptCandidateStep(0, 1, 2, 0);
  assert.strictEqual(result, false, 'should return false (second route to End)');
  assert.deepStrictEqual(ctx.cellSteps(1, 2), [], 'cell should be unassigned after failure');
});

test('attemptCandidateStep: returns false when cell adjacent to End creates second route of a different step but same colour', function () {
  // seq=[R,B,B]: step 1 and step 2 are both blue.
  // End (0,2) has step 1 (B). Assigning step 1 to (1,2): sAdj=2, colour(2)=B == End's colour.
  // Condition 2 fires on colour equality even though sAdj(2) != End's step(1).
  var seq  = G.SEQUENCES[2]; // [R, B, B]
  var path = [
    { row: 2, col: 0 }, { row: 1, col: 0 }, { row: 0, col: 0 },
    { row: 0, col: 1 }, { row: 0, col: 2 }
  ];
  var ctx = G._buildMazeState(3, 3, path, seq);
  var result = ctx.attemptCandidateStep(0, 1, 2, 1);
  assert.strictEqual(result, false, 'should return false (same-colour second route to End)');
  assert.deepStrictEqual(ctx.cellSteps(1, 2), [], 'cell should be unassigned after failure');
});

test('attemptCandidateStep: propagates back to path entry point and that is okay', function () {
  // seq=[R,Y,B], solution path is just up the left side of the grid.
  // We add two extra cells from no path (which wouldn't normally happen),
  // and when we add a third cell 'from' p=1 it should link back to the solution
  // path at p=1 and that should be okay.
  var seq  = G.SEQUENCES[1]; // [R, Y, B]
  var path = [
    { row: 2, col: 0 }, { row: 1, col: 0 }, { row: 0, col: 0 }
  ];
  var ctx = G._buildMazeState(3, 3, path, seq);
  ctx.setColour(1, 1, seq[0])    // (1,1)[R0] will eventually lead to (1,0)[Y1]
  ctx.setColour(1, 2, seq[2])    // (1,2)[B2] will eventually lead to (1,1)[R0]
  assert.deepStrictEqual(ctx.canAccessFrom(1, 1)[1], undefined, '(1,1) should not access p=1 yet');
  assert.deepStrictEqual(ctx.canAccessFrom(1, 2)[1], undefined, '(1,2) should not access p=1 yet');
  var result = ctx.attemptCandidateStep(1, 2, 2, 1);    // (2,2)[B2] should propagate
  assert.strictEqual(result, true, 'New step at (2,2) should be okay');
  assert.deepStrictEqual(ctx.canAccessFrom(1, 1)[1], [0], '(1,1) should access p=1 now');
  assert.deepStrictEqual(ctx.canAccessFrom(1, 2)[1], [2], '(1,2) should access p=1 now');
});

test('attemptCandidateStep: fails when propagation would rejoin solution at a different path index (condition 3)', function () {
  // 3×3, seq=[R,Y,B]. Solution: (2,0)[R0]→(1,0)[Y1]→(0,0)[B2]→(0,1)[R0]→(0,2)[Y1].
  // Assign step 2 (B) to (1,1) from p=1 (solution cell (1,0)[Y1], adjacent to (1,1)).
  // The scan sees (1,1) at s0=2, sAdj=0 — (0,1)[R0] is adjacent and colour matches,
  // but (0,1) is a solution cell at path index 3 ≠ p0=1 — condition 3 fires, returns false.
  var seq  = G.SEQUENCES[1]; // [R, Y, B]
  var path = [
    { row: 2, col: 0 }, { row: 1, col: 0 }, { row: 0, col: 0 },
    { row: 0, col: 1 }, { row: 0, col: 2 }
  ];
  var ctx = G._buildMazeState(3, 3, path, seq);
  var result = ctx.attemptCandidateStep(1, 1, 1, 2);
  assert.strictEqual(result, false);
  assert.deepStrictEqual(ctx.canAccessFrom(0, 1), { 3: [0] }); // unchanged
  assert.deepStrictEqual(ctx.cellSteps(1, 1), []);              // undone
});

test('attemptCandidateStep: propagation updates canAccessFrom for a non-solution cell', function () {
  // 3×3, seq=[R,Y,B]. Short path (2,0)[R0]→(1,0)[Y1]→(0,0)[B2] — End (0,2) is unassigned.
  // First assign step 0 (R) to (2,1) from p=0.
  // Then assign step 2 (B) to (1,1) from p=1.
  // During the second call (1,1) at s0=2, sAdj=0 sees (2,1)[R]: colour matches,
  // (2,1) is not on the solution path — no condition fires.
  // canAccessFrom(2,1) gains {1:[0]} alongside the existing {0:[0]}.
  var seq  = G.SEQUENCES[1]; // [R, Y, B]
  var path = [
    { row: 2, col: 0 }, { row: 1, col: 0 }, { row: 0, col: 0 }
  ];
  var ctx = G._buildMazeState(3, 3, path, seq);
  ctx.attemptCandidateStep(0, 2, 1, 0);
  var result = ctx.attemptCandidateStep(1, 1, 1, 2);
  assert.strictEqual(result, true);
  assert.deepStrictEqual(ctx.canAccessFrom(2, 1), { 0: [0], 1: [0] });
});

test('attemptCandidateStep: throws when assigning a step whose colour conflicts with the cell', function () {
  var seq  = G.SEQUENCES[1]; // [R, Y, B]
  var path = [
    { row: 2, col: 0 }, { row: 1, col: 0 }, { row: 0, col: 0 },
    { row: 0, col: 1 }, { row: 0, col: 2 }
  ];
  var ctx = G._buildMazeState(3, 3, path, seq);
  ctx.attemptCandidateStep(0, 2, 1, 0); // step 0 (R) from p=0
  // step 2 is B — different colour from R — should throw
  assert.throws(function () {
    ctx.attemptCandidateStep(1, 2, 1, 2);
  });
});

test('attemptCandidateStep: Should not propagate from coloured cell not on known path', function () {
  // 3×3 grid, seq=[R,Y,B]. Solution: (2,0)→(1,0)→(0,0).
  // Steps: 0,1,2.
  var seq  = G.SEQUENCES[1]; // [R, Y, B]
  var path = [
    { row: 2, col: 0 }, { row: 1, col: 0 }, { row: 0, col: 0 }
  ];
  var ctx = G._buildMazeState(3, 3, path, seq);

  // Colour (2,2) to be yellow, but we don't yet know we can get there
  ctx.setColour(2, 2, seq[1])
  assert.deepStrictEqual(ctx.canAccessFrom(2, 2), {'-1': [1]}, 'Cell (2,2) is step 1 but not accessible');
  assert.deepStrictEqual(ctx.canAccessFrom(2, 1), {}, 'Cell (2,1) not yet coloured');

  // Add an adjacent cell that's potentially accessible as the next step (blue), but
  // no path should propagate to it yet.
  ctx.setAccessFrom(0, 2, 1, 2);
  assert.deepStrictEqual(ctx.canAccessFrom(2, 2), {'-1': [1]}, 'Cell (2,2) is step 1 but still not accessible');
  assert.deepStrictEqual(ctx.canAccessFrom(2, 1), {0: [2]}, 'Cell (2,1) accessible but no propagation');
});

test('attemptCandidateStep: Should propagate from coloured cell once linked to a known path', function () {
  // 3×3 grid, seq=[R,Y,B]. Solution: (2,0)→(1,0)→(0,0).
  // Steps: 0,1,2.
  var seq  = G.SEQUENCES[1]; // [R, Y, B]
  var path = [
    { row: 2, col: 0 }, { row: 1, col: 0 }, { row: 0, col: 0 }
  ];
  var ctx = G._buildMazeState(3, 3, path, seq);

  // Colour (2,2) to be yellow, but we don't yet know we can get there
  ctx.setColour(2, 2, seq[1])
  assert.strictEqual(ctx.canAccessFrom(2, 2)[0], undefined, 'Cell (2,2) not accessible from path index 0');

  // Add an adjacent cell that's accessible is the step before (red) and from path index 0.
  // That should propagate to (2,2).
  ctx.attemptCandidateStep(0, 1, 2, 0);
  var dict = ctx.canAccessFrom(2, 2);
  assert.deepStrictEqual(ctx.canAccessFrom(2, 2)[0], [1], 'Cell (2,2) is now accessible at step 1 from path index 0');
});

console.log('\n-- cellSteps and colour --');

test('cellSteps: returns [] for an unassigned cell after initialisation', function () {
  var seq  = G.SEQUENCES[1];
  var path = [
    { row: 2, col: 0 }, { row: 1, col: 0 }, { row: 0, col: 0 },
    { row: 0, col: 1 }, { row: 0, col: 2 }
  ];
  var ctx = G._buildMazeState(3, 3, path, seq);
  assert.deepStrictEqual(ctx.cellSteps(1, 1), []);
  assert.deepStrictEqual(ctx.cellSteps(1, 2), []);
  assert.deepStrictEqual(ctx.cellSteps(2, 1), []);
  assert.deepStrictEqual(ctx.cellSteps(2, 2), []);
});

test('cellSteps: returns [step] for a solution cell after initialisation', function () {
  var seq  = G.SEQUENCES[1];
  var path = [
    { row: 2, col: 0 }, { row: 1, col: 0 }, { row: 0, col: 0 },
    { row: 0, col: 1 }, { row: 0, col: 2 }
  ];
  var ctx = G._buildMazeState(3, 3, path, seq);
  assert.deepStrictEqual(ctx.cellSteps(2, 0), [0]); // path[0], step 0%3=0
  assert.deepStrictEqual(ctx.cellSteps(1, 0), [1]); // path[1], step 1%3=1
  assert.deepStrictEqual(ctx.cellSteps(0, 0), [2]); // path[2], step 2%3=2
  assert.deepStrictEqual(ctx.cellSteps(0, 1), [0]); // path[3], step 3%3=0
  assert.deepStrictEqual(ctx.cellSteps(0, 2), [1]); // path[4], step 4%3=1
});

console.log('\n-- colour --');

test('colour: returns null for an unassigned cell', function () {
  var seq  = G.SEQUENCES[1]; // [R, Y, B]
  var path = [
    { row: 2, col: 0 }, { row: 1, col: 0 }, { row: 0, col: 0 },
    { row: 0, col: 1 }, { row: 0, col: 2 }
  ];
  var ctx = G._buildMazeState(3, 3, path, seq);
  assert.strictEqual(ctx.colour(1, 1), null);
  assert.strictEqual(ctx.colour(1, 2), null);
  assert.strictEqual(ctx.colour(2, 1), null);
  assert.strictEqual(ctx.colour(2, 2), null);
});

test('colour: returns the correct colour for each solution cell', function () {
  var seq  = G.SEQUENCES[1]; // [R, Y, B]
  var path = [
    { row: 2, col: 0 }, { row: 1, col: 0 }, { row: 0, col: 0 },
    { row: 0, col: 1 }, { row: 0, col: 2 }
  ];
  // steps: 0=R, 1=Y, 2=B, 3%3=0=R, 4%3=1=Y
  var ctx = G._buildMazeState(3, 3, path, seq);
  assert.strictEqual(ctx.colour(2, 0), seq[0]); // R
  assert.strictEqual(ctx.colour(1, 0), seq[1]); // Y
  assert.strictEqual(ctx.colour(0, 0), seq[2]); // B
  assert.strictEqual(ctx.colour(0, 1), seq[0]); // R
  assert.strictEqual(ctx.colour(0, 2), seq[1]); // Y
});

test('colour: returns the correct colour for a cell assigned via attemptCandidateStep', function () {
  // Short 3-cell path so (1,1) has no 5-cell solution-path neighbours to trigger condition 3.
  var seq  = G.SEQUENCES[1]; // [R, Y, B]
  var path = [
    { row: 2, col: 0 }, { row: 1, col: 0 }, { row: 0, col: 0 }
  ];
  var ctx = G._buildMazeState(3, 3, path, seq);
  ctx.attemptCandidateStep(0, 2, 1, 0); // step 0 (R) from p=0
  assert.strictEqual(ctx.colour(2, 1), seq[0]); // R
  ctx.attemptCandidateStep(1, 1, 1, 2); // step 2 (B) from p=1
  assert.strictEqual(ctx.colour(1, 1), seq[2]); // B
});

test('colour: returns the correct colour when a cell is accessible from two path indices at the same step', function () {
  var seq  = G.SEQUENCES[1]; // [R, Y, B]
  var path = [
    { row: 2, col: 0 }, { row: 1, col: 0 }, { row: 0, col: 0 },
    { row: 0, col: 1 }, { row: 0, col: 2 }
  ];
  var ctx = G._buildMazeState(3, 3, path, seq);
  // Directly set up: cell (1,1) reachable from p=0 and p=3, both at step 0 (R)
  ctx.setAccessFrom(0, 1, 1, 0);
  ctx.setAccessFrom(3, 1, 1, 0);
  // canAccessFrom(1,1) = {0:[0], 3:[0]}, cellSteps = [0]
  assert.deepStrictEqual(ctx.cellSteps(1, 1), [0]);
  assert.strictEqual(ctx.colour(1, 1), seq[0]); // R
});

test('colour: returns the correct colour when a cell has two different steps of the same colour', function () {
  var seq  = G.SEQUENCES[2]; // [R, B, B] — steps 1 and 2 are both B
  var path = [
    { row: 2, col: 0 }, { row: 1, col: 0 }, { row: 0, col: 0 },
    { row: 0, col: 1 }, { row: 0, col: 2 }
  ];
  var ctx = G._buildMazeState(3, 3, path, seq);
  // Directly set up: cell (1,1) at step 1 (B) from p=0, and step 2 (B) from p=1
  ctx.setAccessFrom(0, 1, 1, 1);
  ctx.setAccessFrom(1, 1, 1, 2);
  // cellSteps(1,1) = [1, 2], both B
  assert.strictEqual(ctx.cellSteps(1, 1).length, 2);
  assert.strictEqual(ctx.colour(1, 1), seq[1]); // B
});

test('setColour: allows setting of colour that appears singly in a sequence', function () {
  var seq  = G.SEQUENCES[1]; // [R, Y, B]
  var path = [
    { row: 2, col: 0 }, { row: 1, col: 0 }, { row: 0, col: 0 }
  ];
  var ctx = G._buildMazeState(3, 3, path, seq);
  // Directly set up: cell (1,1) to be Yellow
  ctx.setColour(1, 1, seq[1]);
  assert.strictEqual(ctx.colour(1, 1), seq[1], 'Cell (1,1) should be yellow');
  assert.deepStrictEqual(ctx.cellSteps(1, 1), [1], 'Cell (1,1) should be accessible on step 1');
});

test('setColour: allows setting of colour that appears twice in a sequence', function () {
  var seq  = G.SEQUENCES[2]; // [R, B, B]
  var path = [
    { row: 2, col: 0 }, { row: 1, col: 0 }, { row: 0, col: 0 }
  ];
  var ctx = G._buildMazeState(3, 3, path, seq);
  // Directly set up: cell (1,1) to be blue, which is repeated
  ctx.setColour(1, 1, seq[1]);
  assert.strictEqual(ctx.colour(1, 1), seq[1], 'Cell (1,1) should be yellow');
  assert.deepStrictEqual(ctx.cellSteps(1, 1).sort(), [1,2], 'Cell (1,1) should be accessible on steps [1,2]');
});

test('setColour: throws if cell is already a different colour', function () {
  var seq  = G.SEQUENCES[1]; // [R, Y, B]
  var path = [
    { row: 2, col: 0 }, { row: 1, col: 0 }, { row: 0, col: 0 }
  ];
  var ctx = G._buildMazeState(3, 3, path, seq);
  // Cell (2,1) accessible from solution path as yellow.
  ctx.setAccessFrom(0, 2, 1, 1);
  assert.strictEqual(ctx.colour(2,1), seq[1], 'Cell (2,1) should be yellow after just setting it')
  // Try to set (2,1) to be blue
  assert.throws(function() {
    ctx.setColour(2, 1, seq[2]);
  }, 'Should not be able to set a yellow cell to be blue')
})

test('setColour: throws if colour is not valid', function () {
  var seq  = G.SEQUENCES[1]; // [R, Y, B]
  var path = [
    { row: 2, col: 0 }, { row: 1, col: 0 }, { row: 0, col: 0 }
  ];
  var ctx = G._buildMazeState(3, 3, path, seq);
  // Try to set (2,1) to be some unknown colour
  assert.throws(function() {
    ctx.setColour(2, 1, 'Unknownium');
  }, 'Should not be able to set cell to a non-colour')
})

test('unSetColour: allows unsetting of colour that was previously set', function () {
  var seq  = G.SEQUENCES[1]; // [R, Y, B]
  var path = [
    { row: 2, col: 0 }, { row: 1, col: 0 }, { row: 0, col: 0 }
  ];
  var ctx = G._buildMazeState(3, 3, path, seq);
  // Directly set up: cell (1,1) to be yellow
  ctx.setColour(1, 1, seq[1]);
  assert.strictEqual(ctx.colour(1, 1), seq[1], 'Cell (1,1) should be yellow');
  ctx.unsetColour(1,1);
  assert.strictEqual(ctx.colour(1, 1), null, 'Cell (1,1) should not be a colour');
  assert.deepStrictEqual(ctx.cellSteps(1, 1), [], 'Cell (1,1) should not be accessible on any steps');
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

console.log('\n-- generateMaze uniqueness (50 runs, solution path only) --');

test('generateMaze produces exactly 1 solution (50 runs, 5×5, [R,B,B])', function () {
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
