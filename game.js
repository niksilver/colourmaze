// game.js

var state = {
  gridSize:  7,
  sequence:  null,    // selected colour sequence array (set on init)
  maze:      null,    // { grid, sequence, rows, cols }
  currentPos: null,   // { row, col }
  currentStep: 1,
  visited:   null,    // object of "row,col" keys → true
  path:      null,    // ordered array of { row, col } visited so far
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
  var seq      = state.sequence;
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
    state.path        = [{ row: maze.rows - 1, col: 0 }];
    state.visited     = {};
    state.visited[(maze.rows - 1) + ',0'] = true;
    renderSequenceBar();
    renderGrid();
  });

  mazeWorker.postMessage({ rows: state.gridSize, cols: state.gridSize, sequence: state.sequence });
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
      if (isVisited && !isStart) {
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

function onCellClick(e) {
  var row = parseInt(e.currentTarget.dataset.row, 10);
  var col = parseInt(e.currentTarget.dataset.col, 10);
  var maze = state.maze;
  var key  = cellKey(row, col);

  // Backtrack: clicking any visited cell (other than current) rewinds to it
  if (state.visited[key] && !(row === state.currentPos.row && col === state.currentPos.col)) {
    for (var i = 0; i < state.path.length; i++) {
      if (state.path[i].row === row && state.path[i].col === col) {
        state.path        = state.path.slice(0, i + 1);
        state.currentPos  = { row: row, col: col };
        state.currentStep = i + 1;
        state.visited     = {};
        for (var j = 0; j < state.path.length; j++) {
          state.visited[cellKey(state.path[j].row, state.path[j].col)] = true;
        }
        renderGrid();
        renderSequenceBar();
        return;
      }
    }
    return;
  }

  // Forward move: must be an unvisited orthogonal neighbour with the right colour
  var needed = maze.sequence[state.currentStep % maze.sequence.length];
  if (!isOrthogonalNeighbour(state.currentPos, row, col)) return;
  if (state.visited[key]) return;
  if (maze.grid[row][col].colour !== needed) return;

  state.visited[key] = true;
  state.path.push({ row: row, col: col });
  state.currentPos   = { row: row, col: col };
  state.currentStep += 1;

  // Win condition
  if (row === 0 && col === maze.cols - 1) {
    renderGrid();
    renderSequenceBar();
    document.getElementById('win-overlay').classList.add('active');
    return;
  }

  renderGrid();
  renderSequenceBar();
}

// ── Init ─────────────────────────────────────────────────

function renderSeqDots(container, seq) {
  container.innerHTML = '';
  seq.forEach(function (colour, i) {
    var dot       = document.createElement('span');
    dot.className = 'seq-dot';
    dot.style.background = colour;
    container.appendChild(dot);
    if (i < seq.length - 1) {
      var arrow       = document.createElement('span');
      arrow.className = 'seq-dot-arrow';
      arrow.textContent = '\u2192';
      container.appendChild(arrow);
    }
  });
}

function buildSeqOptions() {
  var container = document.getElementById('seq-options');
  var items     = [];

  Generator.SEQUENCES.forEach(function (seq, idx) {
    var item      = document.createElement('div');
    item.className = 'seq-option' + (idx === 1 ? ' selected' : '');
    renderSeqDots(item, seq);
    item.addEventListener('click', function () {
      items.forEach(function (el) { el.classList.remove('selected'); });
      item.classList.add('selected');
      state.sequence = Generator.SEQUENCES[idx];
      updateSequencePreview();
    });
    container.appendChild(item);
    items.push(item);
  });
}

function initMenu() {
  setupSelector('grid-size-options', function (val) { state.gridSize = val; });

  state.sequence = Generator.SEQUENCES[1];
  buildSeqOptions();
  updateSequencePreview();

  document.getElementById('new-game-btn').addEventListener('click', startGame);
  document.getElementById('menu-btn').addEventListener('click', function () { showScreen('menu-screen'); });
  document.getElementById('new-game-btn-2').addEventListener('click', startGame);
  document.getElementById('win-ok-btn').addEventListener('click', function () {
    document.getElementById('win-overlay').classList.remove('active');
  });

}

document.addEventListener('DOMContentLoaded', initMenu);
