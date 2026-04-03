// game.js

var state = {
  gridSize:   7,
  seqLength:  3,
  maze:       null,   // { grid, sequence, rows, cols }
  currentPos: null,   // { row, col }
  currentStep: 1,
  visited:    null,   // object of "row,col" keys
};

var mazeWorker = null;

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

  var gridEl = document.getElementById('maze-grid');
  gridEl.style.gridTemplateColumns = '';
  gridEl.innerHTML = '<div class="generating-msg">Generating\u2026</div>';
  document.getElementById('sequence-bar').innerHTML = '';

  if (mazeWorker) { mazeWorker.terminate(); mazeWorker = null; }

  mazeWorker = new Worker('generator-worker.js');
  mazeWorker.addEventListener('message', function (e) {
    mazeWorker = null;
    var maze = e.data.maze;
    state.maze        = maze;
    state.currentPos  = { row: maze.rows - 1, col: 0 };
    state.currentStep = 1;
    state.visited     = {};
    state.visited[(maze.rows - 1) + ',0'] = true;
    renderSequenceBar();
    renderGrid();
  });

  mazeWorker.postMessage({ rows: state.gridSize, cols: state.gridSize, seqLen: state.seqLength });
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
      if (isVisited && !isCurrent) {
        div.classList.add('visited');
        div.style.setProperty('--dot-color', Generator.getLabelColour(cell.colour));
      }

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

// ── Move handling ────────────────────────────────────────

function isOrthogonalNeighbour(pos, row, col) {
  var dr = Math.abs(pos.row - row);
  var dc = Math.abs(pos.col - col);
  return (dr + dc) === 1;
}

function hasValidMoves() {
  var maze    = state.maze;
  var pos     = state.currentPos;
  var needed  = maze.sequence[state.currentStep % maze.sequence.length];
  var DIRS    = [[-1,0],[1,0],[0,-1],[0,1]];
  for (var i = 0; i < DIRS.length; i++) {
    var nr = pos.row + DIRS[i][0];
    var nc = pos.col + DIRS[i][1];
    var nk = cellKey(nr, nc);
    if (nr >= 0 && nr < maze.rows && nc >= 0 && nc < maze.cols
        && !state.visited[nk]
        && maze.grid[nr][nc].colour === needed) {
      return true;
    }
  }
  return false;
}

function onCellClick(e) {
  var row = parseInt(e.currentTarget.dataset.row, 10);
  var col = parseInt(e.currentTarget.dataset.col, 10);
  var maze   = state.maze;
  var pos    = state.currentPos;
  var key    = cellKey(row, col);
  var needed = maze.sequence[state.currentStep % maze.sequence.length];

  // Must be an unvisited orthogonal neighbour with the right colour
  if (!isOrthogonalNeighbour(pos, row, col)) return;
  if (state.visited[key]) return;
  if (maze.grid[row][col].colour !== needed) return;

  // Valid move
  state.visited[key]  = true;
  state.currentPos    = { row: row, col: col };
  state.currentStep  += 1;

  // Win condition
  if (row === 0 && col === maze.cols - 1) {
    renderGrid();
    renderSequenceBar();
    document.getElementById('win-overlay').classList.add('active');
    return;
  }

  renderGrid();
  renderSequenceBar();

  // Dead-end detection
  if (!hasValidMoves()) {
    setTimeout(function () {
      document.getElementById('dead-end-overlay').classList.add('active');
    }, 300);
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
