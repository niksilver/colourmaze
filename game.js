// game.js

var state = {
  gridSize:   7,
  seqLength:  3,
  maze:       null,   // { grid, sequence, rows, cols }
  currentPos: null,   // { row, col }
  currentStep: 1,
  visited:    null,   // object of "row,col" keys
};

// ── Selector helpers ─────────────────────────────────────

function setupSelector(containerId, onSelect) {
  var container = document.getElementById(containerId);
  var options   = container.querySelectorAll('.selector-option');
  options.forEach(function (opt) {
    opt.addEventListener('click', function () {
      options.forEach(function (o) { o.classList.remove('selected'); });
      opt.classList.add('selected');
      onSelect(parseInt(opt.dataset.value, 10));
    });
  });
}

function updateSequencePreview() {
  var seq      = Generator.getSequence(state.seqLength);
  var preview  = document.getElementById('sequence-preview');
  preview.innerHTML = '';
  seq.forEach(function (colour, i) {
    var swatch       = document.createElement('div');
    swatch.className = 'preview-swatch';
    swatch.style.background = colour;
    preview.appendChild(swatch);
    if (i < seq.length - 1) {
      var arrow       = document.createElement('span');
      arrow.className = 'preview-arrow';
      arrow.textContent = '→';
      preview.appendChild(arrow);
    }
  });
  var label       = document.createElement('span');
  label.className = 'preview-label';
  label.textContent = 'repeats';
  preview.appendChild(label);
}

// ── Screen transitions ───────────────────────────────────

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(function (s) {
    s.classList.remove('active');
  });
  document.getElementById(id).classList.add('active');
}

// ── Game start ───────────────────────────────────────────

function startGame() {
  showScreen('game-screen');
  var maze = Generator.generateMaze(state.gridSize, state.gridSize, state.seqLength);
  state.maze        = maze;
  state.currentPos  = { row: maze.rows - 1, col: 0 };
  state.currentStep = 1;
  state.visited     = {};
  state.visited[(maze.rows - 1) + ',0'] = true;
  renderSequenceBar();
  renderGrid();
}

// ── Sequence bar ─────────────────────────────────────────

function renderSequenceBar() {
  var seq    = state.maze.sequence;
  var bar    = document.getElementById('sequence-bar');
  var active = state.currentStep % seq.length;
  bar.innerHTML = '';

  seq.forEach(function (colour, i) {
    var swatch        = document.createElement('div');
    swatch.className  = 'seq-swatch' + (i === active ? ' active' : '');
    swatch.style.background = colour;
    if (i === active) swatch.style.boxShadow = '0 0 8px ' + colour;
    bar.appendChild(swatch);

    if (i < seq.length - 1) {
      var arrow       = document.createElement('span');
      arrow.className = 'seq-arrow';
      arrow.textContent = '→';
      bar.appendChild(arrow);
    }
  });

  var label       = document.createElement('span');
  label.className = 'seq-label';
  label.textContent = 'next';
  bar.appendChild(label);
}

// ── Grid rendering ───────────────────────────────────────

function cellKey(row, col) { return row + ',' + col; }

function computeCellSize(gridSize) {
  // Target: grid fits within ~380px. Max cell size 52px, min 24px.
  var maxWidth  = Math.min(window.innerWidth - 48, 420);
  var size      = Math.floor((maxWidth - (gridSize - 1) * 4) / gridSize);
  return Math.max(24, Math.min(52, size));
}

function renderGrid() {
  var maze    = state.maze;
  var grid    = document.getElementById('maze-grid');
  var size    = computeCellSize(maze.cols);
  var endRow  = 0;
  var endCol  = maze.cols - 1;

  grid.style.gridTemplateColumns = 'repeat(' + maze.cols + ', ' + size + 'px)';
  grid.style.setProperty('--cell-size', size + 'px');
  grid.innerHTML = '';

  for (var r = 0; r < maze.rows; r++) {
    for (var c = 0; c < maze.cols; c++) {
      var cell   = maze.grid[r][c];
      var div    = document.createElement('div');
      var key    = cellKey(r, c);
      var isStart = (r === maze.rows - 1 && c === 0);
      var isEnd   = (r === endRow && c === endCol);
      var isCurrent = (r === state.currentPos.row && c === state.currentPos.col);
      var isVisited = !!state.visited[key];

      div.className  = 'cell';
      div.dataset.row = r;
      div.dataset.col = c;
      div.style.background = cell.colour;

      if (isEnd)     div.classList.add('end-cell');
      if (isCurrent) div.classList.add('current');
      if (isVisited && !isCurrent) div.classList.add('visited');

      // S / E labels
      if (isStart || isEnd) {
        div.textContent = isStart ? 'S' : 'E';
        div.style.color = Generator.getLabelColour(cell.colour);
      }

      div.addEventListener('click', onCellClick);
      grid.appendChild(div);
    }
  }
}

// ── Init ─────────────────────────────────────────────────

function initMenu() {
  setupSelector('grid-size-options', function (val) { state.gridSize = val; });
  setupSelector('seq-length-options', function (val) {
    state.seqLength = val;
    updateSequencePreview();
  });

  updateSequencePreview();

  document.getElementById('new-game-btn').addEventListener('click', startGame);
  document.getElementById('menu-btn').addEventListener('click', function () { showScreen('menu-screen'); });
  document.getElementById('new-game-btn-2').addEventListener('click', startGame);
  document.getElementById('win-new-game-btn').addEventListener('click', function () {
    document.getElementById('win-overlay').classList.remove('active');
    startGame();
  });
  document.getElementById('dead-end-new-game-btn').addEventListener('click', function () {
    document.getElementById('dead-end-overlay').classList.remove('active');
    startGame();
  });
}

document.addEventListener('DOMContentLoaded', initMenu);
