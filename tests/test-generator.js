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

console.log('\n' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) process.exit(1);
