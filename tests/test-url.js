// tests/test-url.js
const assert = require('assert');
global.Generator = require('../generator.js');
const MazeURL = require('../url.js');

const G = global.Generator;
const RED    = G.RGB.RED;
const YELLOW = G.RGB.YELLOW;
const BLUE   = G.RGB.BLUE;
const GREEN  = G.RGB.GREEN;
const PURPLE = G.RGB.PURPLE;
const BLACK  = G.RGB.BLACK;

let passed = 0, failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log('  ✓ ' + name);
    passed++;
  } catch (e) {
    console.log('  ✗ ' + name + ': ' + e.message);
    console.log(e.stack);
    failed++;
  }
}

console.log('\n-- encodeGrid --');

test('1x1 RED encodes to "0"', function () {
  assert.strictEqual(MazeURL.encodeGrid([[RED]]), '0');
});

test('1x1 YELLOW encodes to "1"', function () {
  assert.strictEqual(MazeURL.encodeGrid([[YELLOW]]), '1');
});

test('1x1 BLACK encodes to "5"', function () {
  assert.strictEqual(MazeURL.encodeGrid([[BLACK]]), '5');
});

test('2x2 [[RED,YELLOW],[BLUE,GREEN]] encodes to "P"', function () {
  // indices [0,1,2,3] => 0*216 + 1*36 + 2*6 + 3 = 51 => BASE62[51] = 'P'
  assert.strictEqual(MazeURL.encodeGrid([[RED, YELLOW], [BLUE, GREEN]]), 'P');
});

console.log('\n-- decodeGrid --');

test('decode "0" 1x1 gives [[RED]]', function () {
  assert.deepStrictEqual(MazeURL.decodeGrid('0', 1, 1), [[RED]]);
});

test('decode "1" 1x1 gives [[YELLOW]]', function () {
  assert.deepStrictEqual(MazeURL.decodeGrid('1', 1, 1), [[YELLOW]]);
});

test('decode "5" 1x1 gives [[BLACK]]', function () {
  assert.deepStrictEqual(MazeURL.decodeGrid('5', 1, 1), [[BLACK]]);
});

test('decode "P" 2x2 gives [[RED,YELLOW],[BLUE,GREEN]]', function () {
  assert.deepStrictEqual(MazeURL.decodeGrid('P', 2, 2), [[RED, YELLOW], [BLUE, GREEN]]);
});

test('encode then decode round-trips a 3x3 grid', function () {
  var grid = [
    [RED,    YELLOW, BLUE  ],
    [GREEN,  PURPLE, BLACK ],
    [RED,    BLUE,   GREEN ],
  ];
  var encoded = MazeURL.encodeGrid(grid);
  var decoded = MazeURL.decodeGrid(encoded, 3, 3);
  assert.deepStrictEqual(decoded, grid);
});

console.log('\n-- buildHash --');

test('buildHash produces correct format', function () {
  var h = MazeURL.buildHash(7, [RED, YELLOW, BLUE], [[RED]]);
  assert.ok(h.startsWith('#s=7&c=RYB&g='), 'got: ' + h);
});

test('buildHash 1x1 BLACK grid gives g=5', function () {
  var h = MazeURL.buildHash(5, [RED, BLUE], [[BLACK]]);
  assert.strictEqual(h, '#s=5&c=RB&g=5');
});

test('buildHash 1x1 RED grid gives g=0', function () {
  var h = MazeURL.buildHash(5, [RED, BLUE], [[RED]]);
  assert.strictEqual(h, '#s=5&c=RB&g=0');
});

console.log('\n-- parseHash --');

test('empty string returns null', function () {
  assert.strictEqual(MazeURL.parseHash(''), null);
});

test('"#" returns null', function () {
  assert.strictEqual(MazeURL.parseHash('#'), null);
});

test('valid hash returns correct struct', function () {
  var result = MazeURL.parseHash('#s=1&c=RB&g=5');
  assert.strictEqual(result.gridSize, 1);
  assert.deepStrictEqual(result.sequence, [RED, BLUE]);
  assert.deepStrictEqual(result.grid, [[BLACK]]);
});

test('missing g param returns null', function () {
  assert.strictEqual(MazeURL.parseHash('#s=5&c=RB'), null);
});

test('missing c param returns null', function () {
  assert.strictEqual(MazeURL.parseHash('#s=5&g=0'), null);
});

test('invalid c letter returns null', function () {
  assert.strictEqual(MazeURL.parseHash('#s=5&c=RX&g=0'), null);
});

test('buildHash then parseHash round-trips', function () {
  var grid = [
    [RED,   YELLOW, BLUE  ],
    [GREEN, PURPLE, BLACK ],
    [RED,   BLUE,   GREEN ],
  ];
  var seq  = [RED, YELLOW, BLUE];
  var hash = MazeURL.buildHash(3, seq, grid);
  var result = MazeURL.parseHash(hash);
  assert.strictEqual(result.gridSize, 3);
  assert.deepStrictEqual(result.sequence, seq);
  assert.deepStrictEqual(result.grid, grid);
});

console.log('\n' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) process.exit(1);
