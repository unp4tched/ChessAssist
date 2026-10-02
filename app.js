(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };

  var START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  var EMPTY_FEN = '8/8/8/8/8/8/8/8 w - - 0 1';
  var FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  var MATE_SCORE = 100000;

  var game = new Chess(START_FEN);
  var sessionActive = false;
  var autoGen = 0;
  var paletteSelection = null;
  var selectedSquare = null;
  var overlays = {};
  var thinking = false;
  var currentEvalWhite = 0;

  var boardEl = $('board');
  var tileEls = {};
  var imageUrl = {};

  function initPieceImages() {
    ['wK', 'wQ', 'wR', 'wB', 'wN', 'wP', 'bK', 'bQ', 'bR', 'bB', 'bN', 'bP'].forEach(function (k) {
      imageUrl[k] = 'assets/pieces/' + k + '.svg';
      var pre = new Image();
      pre.src = imageUrl[k];
    });
  }

  function makePieceImg(code) {
    var img = document.createElement('img');
    img.src = imageUrl[code];
    img.className = 'piece-img';
    img.draggable = false;
    img.alt = code;
    return img;
  }

  function squareName(row, col) {
    return FILES[col] + (8 - row);
  }

  function renderBoard() {
    boardEl.innerHTML = '';
    tileEls = {};
    for (var row = 0; row < 8; row++) {
      for (var col = 0; col < 8; col++) {
        var sq = squareName(row, col);
        var tile = document.createElement('div');
        tile.className = 'tile ' + (((row + col) % 2 === 0) ? 'tile-light' : 'tile-dark');
        tile.dataset.square = sq;
        tileEls[sq] = tile;

        if (row === 7) {
          var f = document.createElement('span');
          f.className = 'coord coord-file';
          f.textContent = FILES[col];
          tile.appendChild(f);
        }
        if (col === 0) {
          var r = document.createElement('span');
          r.className = 'coord coord-rank';
          r.textContent = String(8 - row);
          tile.appendChild(r);
        }

        var piece = game.get(sq);
        if (piece) {
          tile.appendChild(makePieceImg(piece.color + piece.type.toUpperCase()));
        }
        boardEl.appendChild(tile);
      }
    }
    applyOverlays();
    applySelection();
  }

  function applyOverlays() {
    for (var sq in tileEls) {
      tileEls[sq].classList.remove('tile-from', 'tile-to');
      if (overlays[sq]) tileEls[sq].classList.add('tile-' + overlays[sq]);
    }
  }

  function setOverlays(from, to) {
    overlays = {};
    if (from) overlays[from] = 'from';
    if (to) overlays[to] = 'to';
    applyOverlays();
  }

  function clearOverlays() {
    setOverlays(null, null);
  }

  function legalTargets(from) {
    if (!from) return [];
    return game.moves({ square: from, verbose: true });
  }

  function applySelection() {
    for (var sq in tileEls) {
      tileEls[sq].classList.remove('tile-sel', 'tile-legal', 'tile-capture');
    }
    if (!selectedSquare || !sessionActive) return;
    if (tileEls[selectedSquare]) tileEls[selectedSquare].classList.add('tile-sel');
    legalTargets(selectedSquare).forEach(function (m) {
      tileEls[m.to].classList.add(m.captured ? 'tile-capture' : 'tile-legal');
    });
  }

  function editingEnabled() {
    return !sessionActive;
  }

  function updateModeUI() {
    $('inventoryPanel').classList.toggle('hidden', !editingEnabled());
    $('inventoryPanel').classList.remove('panel-attention');
    $('beginBtn').textContent = sessionActive ? 'Stop' : 'Begin';
    $('beginBtn').classList.toggle('bg-emerald-400', sessionActive);
    $('beginBtn').classList.toggle('hover:bg-emerald-300', sessionActive);
    $('beginBtn').classList.toggle('bg-zinc-50', !sessionActive);
    $('beginBtn').classList.toggle('hover:bg-zinc-200', !sessionActive);
    $('modeHint').textContent = sessionActive
      ? 'Session running — the engine suggests a move after every change. Press Stop to edit again.'
      : 'Drag pieces to edit · drop on the trash or off the board to remove · press Begin and the engine suggests every move.';
    if (sessionActive) {
      paletteSelection = null;
      markPaletteSelection();
    }
    selectedSquare = null;
    applySelection();
  }

  function startSession() {
    if (sessionActive) return;
    if (game.game_over()) {
      toast('Game is over — reset or load another position first');
      return;
    }
    if (game.moves().length === 0) {
      toast('No legal moves in this position');
      return;
    }
    sessionActive = true;
    autoGen++;
    updateModeUI();
    toast('Session started — engine suggests every move');
    scheduleAuto();
  }

  function stopSession() {
    if (!sessionActive) return;
    sessionActive = false;
    autoGen++;
    if (thinking) {
      try {
        stockfishWorker && stockfishWorker.postMessage('stop');
      } catch (e) {}
    }
    updateModeUI();
    toast('Session stopped — board is editable again');
  }

  function tryUserMove(from, to) {
    var mv = game.move({ from: from, to: to, promotion: 'q' });
    if (mv) {
      selectedSquare = null;
      clearOverlays();
      clearSuggestions();
      renderBoard();
      syncStatus();
      scheduleAuto();
      return true;
    }
    return false;
  }

  function onTileClick(sq) {
    if (thinking) return;
    var piece = game.get(sq);
    if (selectedSquare) {
      if (sq === selectedSquare) {
        selectedSquare = null;
        applySelection();
        return;
      }
      if (tryUserMove(selectedSquare, sq)) return;
    }
    if (piece && piece.color === game.turn()) selectedSquare = sq;
    else selectedSquare = null;
    applySelection();
  }

  var drag = null;
  var suppressClick = false;

  function makeGhost(code) {
    var g = document.createElement('div');
    g.className = 'drag-ghost';
    g.appendChild(makePieceImg(code));
    document.body.appendChild(g);
    return g;
  }

  function moveGhost(x, y) {
    drag.ghostEl.style.left = x + 'px';
    drag.ghostEl.style.top = y + 'px';
  }

  function clearDropHighlights() {
    for (var sq in tileEls) tileEls[sq].classList.remove('tile-drop');
    $('trashZone').classList.remove('trash-hot');
  }

  function highlightDropTarget(x, y) {
    clearDropHighlights();
    var el = document.elementFromPoint(x, y);
    if (!el) return;
    if (el.closest && el.closest('#trashZone')) {
      $('trashZone').classList.add('trash-hot');
      return;
    }
    var tile = el.closest ? el.closest('.tile') : null;
    if (tile) tile.classList.add('tile-drop');
  }

  function dragStart(kind, code, fromSquare, e, showSelection) {
    drag = {
      kind: kind,
      code: code,
      from: fromSquare || null,
      ghostEl: makeGhost(code),
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      moved: false
    };
    drag.ghostEl.style.opacity = '0';
    moveGhost(e.clientX, e.clientY);
    if (showSelection) {
      selectedSquare = fromSquare;
      applySelection();
    }
  }

  function onPointerDown(e) {
    if (thinking) return;
    var invBtn = e.target.closest ? e.target.closest('[data-piece-code]') : null;
    if (invBtn && editingEnabled()) {
      dragStart('inv', invBtn.dataset.pieceCode, null, e);
      e.preventDefault();
      return;
    }
    var tile = e.target.closest ? e.target.closest('.tile') : null;
    if (tile && boardEl.contains(tile)) {
      var sq = tile.dataset.square;
      var piece = game.get(sq);
      if (editingEnabled() && piece) {
        dragStart('board', piece.color + piece.type.toUpperCase(), sq, e, false);
        e.preventDefault();
      } else if (sessionActive && piece && piece.color === game.turn()) {
        dragStart('board', piece.color + piece.type.toUpperCase(), sq, e, true);
        e.preventDefault();
      }
    }
  }

  function onPointerMove(e) {
    if (!drag || e.pointerId !== drag.pointerId) return;
    var dx = e.clientX - drag.startX;
    var dy = e.clientY - drag.startY;
    if (!drag.moved && (dx * dx + dy * dy) < 25) return;
    if (!drag.moved) {
      drag.moved = true;
      drag.ghostEl.style.opacity = '1';
      suppressClick = true;
      if (drag.kind === 'board') {
        var img = tileEls[drag.from] && tileEls[drag.from].querySelector('.piece-img');
        if (img) img.style.opacity = '0.25';
      }
    }
    moveGhost(e.clientX, e.clientY);
    highlightDropTarget(e.clientX, e.clientY);
    e.preventDefault();
  }

  function boardToSquare(x, y) {
    var rect = boardEl.getBoundingClientRect();
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) return null;
    var col = Math.min(7, Math.max(0, Math.floor((x - rect.left) / (rect.width / 8))));
    var row = Math.min(7, Math.max(0, Math.floor((y - rect.top) / (rect.height / 8))));
    return squareName(row, col);
  }

  function setupMutate(fromSquare, toSquare, code) {
    var fenParts = game.fen().split(' ');
    var placement = fenParts[0];

    function stripAt(pl, sq) {
      var rows = pl.split('/');
      var row = 8 - parseInt(sq[1], 10);
      var col = FILES.indexOf(sq[0]);
      var exp = rows.map(function (r) {
        var out = '';
        for (var i = 0; i < r.length; i++) {
          var ch = r[i];
          if (ch >= '1' && ch <= '8') {
            for (var k = 0; k < +ch; k++) out += '.';
          } else {
            out += ch;
          }
        }
        return out;
      });
      exp[row] = exp[row].substring(0, col) + '.' + exp[row].substring(col + 1);
      return exp;
    }

    function compact(expRows) {
      return expRows.map(function (r) {
        var out = '', run = 0;
        for (var i = 0; i <= 8; i++) {
          if (r[i] === '.') {
            run++;
          } else {
            if (run) {
              out += run;
              run = 0;
            }
            if (r[i]) out += r[i];
          }
        }
        return out;
      }).join('/');
    }

    var rows = fromSquare ? stripAt(placement, fromSquare) : stripAt(placement, toSquare);
    if (code) {
      var row = 8 - parseInt(toSquare[1], 10);
      var col = FILES.indexOf(toSquare[0]);
      rows[row] = rows[row].substring(0, col) + code + rows[row].substring(col + 1);
    }
    fenParts[0] = compact(rows);
    return loadFenString(fenParts.join(' '), true);
  }

  function onPointerUp(e) {
    if (!drag || e.pointerId !== drag.pointerId) return;
    var d = drag;
    drag = null;
    d.ghostEl.remove();
    clearDropHighlights();
    setTimeout(function () {
      suppressClick = false;
    }, 0);

    if (!d.moved) {
      return;
    }

    var overTrash = !!document.elementFromPoint(e.clientX, e.clientY) &&
      document.elementFromPoint(e.clientX, e.clientY).closest &&
      document.elementFromPoint(e.clientX, e.clientY).closest('#trashZone');
    var targetSquare = overTrash ? null : boardToSquare(e.clientX, e.clientY);

    if (d.kind === 'inv') {
      if (targetSquare) {
        var code = d.code[0] === 'w' ? d.code[1].toUpperCase() : d.code[1].toLowerCase();
        if (!setupMutate(null, targetSquare, code)) toast('Could not place piece there');
      }
      return;
    }

    if (sessionActive) {
      var img = tileEls[d.from] && tileEls[d.from].querySelector('.piece-img');
      if (img) img.style.opacity = '';
      if (overTrash || !targetSquare) {
        renderBoard();
        return;
      }
      if (!tryUserMove(d.from, targetSquare)) {
        toast('Illegal move: ' + d.from + ' → ' + targetSquare);
        renderBoard();
      }
      return;
    }

    if (overTrash || !targetSquare) {
      if (setupMutate(d.from, d.from, null)) toast('Piece removed');
      renderBoard();
      return;
    }
    if (targetSquare !== d.from) {
      var moveCode = d.code[0] === 'w' ? d.code[1].toUpperCase() : d.code[1].toLowerCase();
      if (!setupMutate(d.from, targetSquare, moveCode)) {
        toast('Invalid position — move rejected');
      }
    }
    renderBoard();
  }

  function buildInventory() {
    var order = ['K', 'Q', 'R', 'B', 'N', 'P'];
    var mk = function (hostId, colorKey) {
      var host = $(hostId);
      host.innerHTML = '';
      order.forEach(function (t) {
        var b = document.createElement('button');
        b.className = 'piece-btn aspect-square w-full rounded-xl bg-zinc-800/70 border border-zinc-700/60 flex items-center justify-center';
        b.dataset.pieceCode = colorKey + t;
        b.title = (colorKey === 'w' ? 'White ' : 'Black ') + ({ K: 'King', Q: 'Queen', R: 'Rook', B: 'Bishop', N: 'Knight', P: 'Pawn' })[t];
        b.appendChild(makePieceImg(colorKey + t));
        b.addEventListener('click', function () {
          if (!editingEnabled()) return;
          var sel = { color: colorKey, type: t.toLowerCase() };
          var isArmed = paletteSelection &&
            paletteSelection.color === sel.color && paletteSelection.type === sel.type;
          paletteSelection = isArmed ? null : sel;
          markPaletteSelection();
        });
        host.appendChild(b);
      });
    };
    mk('invWhite', 'w');
    mk('invBlack', 'b');
  }

  function markPaletteSelection() {
    document.querySelectorAll('[data-piece-code]').forEach(function (b) {
      var active = paletteSelection &&
        paletteSelection.color + paletteSelection.type ===
        b.dataset.pieceCode[0].toLowerCase() + b.dataset.pieceCode[1].toLowerCase();
      b.classList.toggle('ring-2', !!active);
      b.classList.toggle('ring-amber-400', !!active);
    });
  }

  function loadFenString(fen, keepQuiet) {
    var test = new Chess();
    if (!test.load(fen)) {
      if (!keepQuiet) {
        $('fenError').textContent = 'Invalid FEN — could not parse position.';
        $('fenError').classList.remove('hidden');
      }
      return false;
    }
    $('fenError').classList.add('hidden');
    game = test;
    selectedSquare = null;
    clearOverlays();
    clearSuggestions();
    renderBoard();
    syncStatus();
    persistState();
    scheduleAuto();
    return true;
  }

  function syncStatus() {
    if (document.activeElement !== $('fenInput')) $('fenInput').value = game.fen();

    var turn = game.turn();
    $('turnPill').textContent = turn === 'w' ? 'White to move' : 'Black to move';
    $('turnWhiteBtn').classList.toggle('bg-zinc-700', turn === 'w');
    $('turnWhiteBtn').classList.toggle('text-zinc-50', turn === 'w');
    $('turnBlackBtn').classList.toggle('bg-zinc-700', turn === 'b');
    $('turnBlackBtn').classList.toggle('text-zinc-50', turn === 'b');

    var over = game.game_over();
    var badge = $('gameOverBadge');
    if (over) {
      var text = 'Draw';
      if (game.in_checkmate()) text = (game.turn() === 'w' ? 'Black' : 'White') + ' wins by checkmate';
      else if (game.in_stalemate()) text = 'Stalemate — draw';
      else if (game.in_threefold_repetition()) text = 'Draw — threefold repetition';
      else if (game.insufficient_material()) text = 'Draw — insufficient material';
      badge.firstElementChild.textContent = text;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
    $('beginBtn').disabled = !sessionActive && (over || game.moves().length === 0);
    persistState();
  }

  function persistState() {
    try {
      localStorage.setItem('chessAssistFen', game.fen());
    } catch (e) {}
  }

  function restoreState() {
    try {
      var fen = localStorage.getItem('chessAssistFen');
      if (fen) loadFenString(fen, true);
    } catch (e) {}
  }

  function setStatus(text, tone) {
    var el = $('engineStatus');
    el.textContent = text;
    el.className = 'text-xs font-semibold px-2.5 py-1 rounded-full ' + (
      tone === 'go' ? 'bg-emerald-500/15 text-emerald-400' :
      tone === 'busy' ? 'bg-amber-500/15 text-amber-400' :
      tone === 'warn' ? 'bg-red-500/15 text-red-400' :
      'bg-zinc-800 text-zinc-400');
  }

  function progress(on) {
    var bar = $('progressBar');
    bar.classList.toggle('progress-indet', on);
    bar.style.width = on ? '40%' : '0%';
  }

  function cpToLabel(cpWhite) {
    if (Math.abs(cpWhite) >= MATE_SCORE - 1000) {
      return (cpWhite > 0 ? '+M' : '-M') + Math.max(1, Math.ceil((MATE_SCORE - Math.abs(cpWhite)) / 2));
    }
    var v = cpWhite / 100;
    return (v > 0 ? '+' : '') + v.toFixed(2);
  }

  function updateEvalBar(cpWhite) {
    currentEvalWhite = cpWhite;
    var pct;
    if (Math.abs(cpWhite) >= MATE_SCORE - 1000) pct = cpWhite > 0 ? 100 : 0;
    else pct = 50 + (Math.max(-1500, Math.min(1500, cpWhite)) / 1500) * 50;
    $('evalWhiteBar').style.width = pct + '%';
    $('evalWhiteLabel').textContent = cpToLabel(cpWhite);
    $('evalBlackLabel').textContent = cpToLabel(-cpWhite);
  }

  function clearSuggestions() {
    $('moveList').innerHTML = '';
    $('emptyListNote').classList.remove('hidden');
  }

  function addSuggestionEntry(res) {
    clearSuggestions();
    $('emptyListNote').classList.add('hidden');
    var li = document.createElement('li');
    li.className = 'py-2.5 flex items-center gap-3';

    var badge = document.createElement('span');
    badge.className = 'text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded ' +
      (res.engine === 'stockfish' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-sky-500/15 text-sky-400');
    badge.textContent = res.engine === 'stockfish' ? 'Stockfish' : 'Fallback';

    var main = document.createElement('div');
    main.className = 'min-w-0';
    var title = document.createElement('p');
    title.className = 'text-sm font-semibold text-zinc-200 truncate';
    title.textContent = res.san + '  ·  ' + res.from + ' → ' + res.to;
    var meta = document.createElement('p');
    meta.className = 'text-[11px] text-zinc-500 truncate';
    meta.textContent = 'eval ' + cpToLabel(res.evalAfterCpWhite) +
      ' · depth ' + res.depth + ' · ' + (res.nodes || 0).toLocaleString() + ' nodes · ' + res.timeMs + ' ms';
    main.appendChild(title);
    main.appendChild(meta);

    var actions = document.createElement('div');
    actions.className = 'ml-auto flex gap-1.5';

    var play = document.createElement('button');
    play.className = 'text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-zinc-100 text-zinc-900 hover:bg-zinc-300';
    play.textContent = 'Play';
    play.addEventListener('click', function () {
      var mv = game.move(res.san);
      if (!mv) {
        toast('Move no longer legal');
        return;
      }
      clearOverlays();
      clearSuggestions();
      renderBoard();
      syncStatus();
      scheduleAuto();
    });

    var dismiss = document.createElement('button');
    dismiss.className = 'text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-zinc-700 text-zinc-400 hover:text-zinc-200';
    dismiss.textContent = 'Dismiss';
    dismiss.addEventListener('click', clearSuggestions);

    actions.appendChild(play);
    actions.appendChild(dismiss);
    li.appendChild(badge);
    li.appendChild(main);
    li.appendChild(actions);
    $('moveList').prepend(li);
  }

  function positionNeedsSuggestion() {
    return sessionActive && !game.game_over() && game.moves().length > 0;
  }

  function scheduleAuto() {
    if (!positionNeedsSuggestion()) return;
    var gen = autoGen;
    setTimeout(function () {
      if (!sessionActive || gen !== autoGen || thinking) return;
      runEngine();
    }, 250);
  }

  function runEngine() {
    if (thinking || !positionNeedsSuggestion()) return;

    var gen = autoGen;
    thinking = true;
    clearOverlays();
    selectedSquare = null;
    applySelection();
    setStatus('Thinking…', 'busy');
    progress(true);

    var timeMs = parseInt($('strengthSel').value, 10) || 1200;
    askStockfish(game.fen(), timeMs, function (result) {
      if (!sessionActive || gen !== autoGen) {
        thinking = false;
        progress(false);
        return;
      }
      if (result) {
        deliverSuggestion(result, 'stockfish');
      } else {
        setStatus('Stockfish unavailable — using built-in engine', 'warn');
        runFallbackEngine(gen);
      }
    });
  }

  function deliverSuggestion(result, engineName) {
    thinking = false;
    progress(false);
    setStatus('Done · depth ' + result.depth + ' · ' + (result.nodes || 0).toLocaleString() + ' nodes', 'go');
    setOverlays(result.from, result.to);
    updateEvalBar(result.evalAfterCpWhite);
    result.engine = engineName;
    addSuggestionEntry(result);
  }

  var stockfishWorker = null;

  function initStockfish() {
    try {
      stockfishWorker = new Worker('assets/stockfish.js');
      stockfishWorker.postMessage('uci');
      stockfishWorker.onmessage = function (e) {
        if (typeof e.data === 'string' && e.data.indexOf('uciok') !== -1) {
          setStatus('Ready · Stockfish 10', 'go');
        }
      };
      stockfishWorker.onerror = function () {
        stockfishWorker = null;
      };
    } catch (e) {
      stockfishWorker = null;
      setStatus('Ready · built-in engine', 'warn');
    }
  }

  function askStockfish(fen, timeMs, cb) {
    if (!stockfishWorker) {
      cb(null);
      return;
    }

    var w = stockfishWorker;
    var best = null;
    var lastInfo = { depth: 0, nodes: 0, cpWhite: null };
    var finished = false;

    var timer = setTimeout(finish, timeMs + 5000);

    function parseScore(msg) {
      var m = msg.match(/score (cp|mate) (-?\d+)/);
      if (!m) return;
      var turn = fen.split(' ')[1];
      if (m[1] === 'cp') {
        var cp = parseInt(m[2], 10);
        lastInfo.cpWhite = turn === 'w' ? cp : -cp;
      } else {
        var mate = parseInt(m[2], 10);
        var mag = MATE_SCORE - Math.abs(mate) * 2;
        lastInfo.cpWhite = (mate > 0 ? 1 : -1) * (turn === 'w' ? mag : -mag);
      }
    }

    function finish() {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      w.removeEventListener('message', onMsg);
      try {
        w.postMessage('stop');
      } catch (err) {}
      if (!best) {
        cb(null);
        return;
      }

      var probe = new Chess(fen);
      var mvObj = best.length === 5
        ? probe.move({ from: best.slice(0, 2), to: best.slice(2, 4), promotion: best[4] })
        : probe.move({ from: best.slice(0, 2), to: best.slice(2, 4) });
      if (!mvObj) {
        cb(null);
        return;
      }

      var evalAfter = probe.in_checkmate()
        ? (probe.turn() === 'b' ? MATE_SCORE : -MATE_SCORE)
        : (lastInfo.cpWhite !== null ? lastInfo.cpWhite : Engine.evaluatePosition(probe));

      cb({
        san: mvObj.san,
        from: mvObj.from,
        to: mvObj.to,
        depth: lastInfo.depth || 1,
        nodes: lastInfo.nodes || 0,
        timeMs: timeMs,
        evalAfterCpWhite: evalAfter
      });
    }

    function onMsg(e) {
      var msg = typeof e.data === 'string' ? e.data : (e.data && e.data.data) || '';
      if (msg.indexOf('readyok') === 0) {
        w.postMessage('position fen ' + fen);
        w.postMessage('go movetime ' + timeMs);
        return;
      }
      if (msg.indexOf('info depth') !== -1) {
        var dm = msg.match(/info depth (\d+)/);
        if (dm) lastInfo.depth = parseInt(dm[1], 10);
        var nm = msg.match(/ nodes (\d+)/);
        if (nm) lastInfo.nodes = parseInt(nm[1], 10);
        parseScore(msg);
      }
      if (msg.indexOf('bestmove') === 0) {
        var parts = msg.split(/\s+/);
        if (parts[1] && parts[1] !== '(none)') best = parts[1];
        finish();
      }
    }

    w.addEventListener('message', onMsg);
    w.postMessage('isready');
  }

  function runFallbackEngine(gen) {
    if (!sessionActive || gen !== autoGen) {
      thinking = false;
      progress(false);
      return;
    }
    setStatus('Thinking… (built-in minimax)', 'busy');
    var result = null;
    try {
      var timeMs = parseInt($('strengthSel').value, 10) || 1200;
      var fen = game.fen();
      var probe = new Chess(fen);
      result = Engine.search(probe, timeMs >= 2500 ? 4 : 3, Math.min(timeMs, 1500));
      if (result) {
        var after = new Chess(fen);
        after.move(result.san);
        result.evalAfterCpWhite = after.in_checkmate()
          ? (after.turn() === 'b' ? Engine.MATE_SCORE : -Engine.MATE_SCORE)
          : Engine.evaluatePosition(after);
      }
    } catch (err) {
      result = null;
    }

    thinking = false;
    progress(false);
    if (result) {
      setStatus('Done · depth ' + result.depth, 'go');
      setOverlays(result.from, result.to);
      updateEvalBar(result.evalAfterCpWhite);
      result.engine = 'builtin';
      addSuggestionEntry(result);
    } else {
      setStatus('No suggestion — engine error', 'warn');
      toast('Engine could not find a move');
    }
  }

  var toastTimer = null;

  function toast(msg) {
    var el = $('toast');
    el.textContent = msg;
    el.style.opacity = '1';
    el.style.transform = 'translate(-50%, -8px)';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      el.style.opacity = '0';
      el.style.transform = 'translate(-50%, 0)';
    }, 2000);
  }

  function setTurn(color) {
    var parts = game.fen().split(' ');
    parts[1] = color;
    loadFenString(parts.join(' '), true);
  }

  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
    } catch (e) {}
    ta.remove();
  }

  $('beginBtn').addEventListener('click', function () {
    if (sessionActive) stopSession();
    else startSession();
  });

  $('turnWhiteBtn').addEventListener('click', function () {
    setTurn('w');
  });

  $('turnBlackBtn').addEventListener('click', function () {
    setTurn('b');
  });

  $('clearBtn').addEventListener('click', function () {
    loadFenString(EMPTY_FEN, true);
    toast('Board cleared');
  });

  $('resetBtn').addEventListener('click', function () {
    loadFenString(START_FEN, true);
    toast('Starting position restored');
  });

  $('loadFenBtn').addEventListener('click', function () {
    var v = $('fenInput').value.trim();
    if (!v) {
      toast('Paste a FEN string first');
      return;
    }
    if (loadFenString(v)) toast('Position loaded');
  });

  $('fenInput').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') $('loadFenBtn').click();
  });

  $('copyFenBtn').addEventListener('click', function () {
    var fen = game.fen();
    var done = function () {
      toast('FEN copied');
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(fen).then(done, function () {
        fallbackCopy(fen);
        done();
      });
    } else {
      fallbackCopy(fen);
      done();
    }
  });

  boardEl.addEventListener('click', function (e) {
    if (thinking || drag) return;
    var tile = e.target.closest('.tile');
    if (!tile) return;
    if (sessionActive) {
      onTileClick(tile.dataset.square);
      return;
    }
    if (paletteSelection) {
      var code = paletteSelection.color === 'w'
        ? paletteSelection.type.toUpperCase()
        : paletteSelection.type;
      if (setupMutate(null, tile.dataset.square, code)) {
        paletteSelection = null;
        markPaletteSelection();
      } else {
        toast('Could not place piece there');
      }
    }
  });

  window.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerUp);

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      selectedSquare = null;
      paletteSelection = null;
      applySelection();
      markPaletteSelection();
    }
  });

  initPieceImages();
  buildInventory();
  renderBoard();
  syncStatus();
  restoreState();
  initStockfish();

})();
