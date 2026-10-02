

const PAWN_VAL = 100;
const KNIGHT_VAL = 320;
const BISHOP_VAL = 330;
const ROOK_VAL = 500;
const QUEEN_VAL = 900;

const PAWN_PST = [
    0,  0,  0,  0,  0,  0,  0,  0,
   50, 50, 50, 50, 50, 50, 50, 50,
   10, 10, 20, 30, 30, 20, 10, 10,
    5,  5, 10, 25, 25, 10,  5,  5,
    0,  0,  0, 20, 20,  0,  0,  0,
    5, -5,-10,  0,  0,-10, -5,  5,
    5, 10, 10,-20,-20, 10, 10,  5,
    0,  0,  0,  0,  0,  0,  0,  0
];

const KNIGHT_PST = [
  -50,-40,-30,-30,-30,-30,-40,-50,
  -40,-20,  0,  0,  0,  0,-20,-40,
  -30,  0, 10, 15, 15, 10,  0,-30,
  -30,  5, 15, 20, 20, 15,  5,-30,
  -30,  0, 15, 20, 20, 15,  0,-30,
  -30,  5, 10, 15, 15, 10,  5,-30,
  -40,-20,  0,  5,  5,  0,-20,-40,
  -50,-40,-30,-30,-30,-30,-40,-50
];

const BISHOP_PST = [
  -20,-10,-10,-10,-10,-10,-10,-20,
  -10,  0,  0,  0,  0,  0,  0,-10,
  -10,  0,  5, 10, 10,  5,  0,-10,
  -10,  5,  5, 10, 10,  5,  5,-10,
  -10,  0, 10, 10, 10, 10,  0,-10,
  -10, 10, 10, 10, 10, 10, 10,-10,
  -10,  5,  0,  0,  0,  0,  5,-10,
  -20,-10,-10,-10,-10,-10,-10,-20
];

const ROOK_PST = [
    0,  0,  0,  0,  0,  0,  0,  0,
    5, 10, 10, 10, 10, 10, 10,  5,
   -5,  0,  0,  0,  0,  0,  0, -5,
   -5,  0,  0,  0,  0,  0,  0, -5,
   -5,  0,  0,  0,  0,  0,  0, -5,
   -5,  0,  0,  0,  0,  0,  0, -5,
   -5,  0,  0,  0,  0,  0,  0, -5,
    0,  0,  0,  5,  5,  0,  0,  0
];

const QUEEN_PST = [
  -20,-10,-10, -5, -5,-10,-10,-20,
  -10,  0,  0,  0,  0,  0,  0,-10,
  -10,  0,  5,  5,  5,  5,  0,-10,
   -5,  0,  5,  5,  5,  5,  0, -5,
    0,  0,  5,  5,  5,  5,  0, -5,
  -10,  5,  5,  5,  5,  5,  0,-10,
  -10,  0,  5,  0,  0,  0,  0,-10,
  -20,-10,-10, -5, -5,-10,-10,-20
];

const KING_MID_PST = [
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -20,-30,-30,-40,-40,-30,-30,-20,
  -10,-20,-20,-20,-20,-20,-20,-10,
   20, 20,  0,  0,  0,  0, 20, 20,
   20, 30, 10,  0,  0, 10, 30, 20
];

const KING_END_PST = [
  -50,-40,-30,-20,-20,-30,-40,-50,
  -30,-20,-10,  0,  0,-10,-20,-30,
  -30,-10, 20, 30, 30, 20,-10,-30,
  -30,-10, 30, 40, 40, 30,-10,-30,
  -30,-10, 30, 40, 40, 30,-10,-30,
  -30,-10, 20, 30, 30, 20,-10,-30,
  -30,-30,  0,  0,  0,  0,-30,-30,
  -50,-30,-30,-30,-30,-30,-30,-50
];

const PST = {
    p: PAWN_PST,
    n: KNIGHT_PST,
    b: BISHOP_PST,
    r: ROOK_PST,
    q: QUEEN_PST,
    k: KING_MID_PST
};

const PIECE_VALUE = { p: PAWN_VAL, n: KNIGHT_VAL, b: BISHOP_VAL, r: ROOK_VAL, q: QUEEN_VAL, k: 0 };

const BISHOP_PAIR_BONUS = 30;
const TEMPO_BONUS = 10;

function mirror(i) {
    return (7 - Math.floor(i / 8)) * 8 + (i % 8);
}

function evaluatePosition(game) {
    const fenBoard = game.fen().split(' ')[0];
    const ranks = fenBoard.split('/');
    const board = new Array(64).fill(null); // index 0 = a8
    let whiteBishops = 0;
    let blackBishops = 0;
    let score = 0;

    for (let r = 0; r < 8; r++) {
        let file = 0;
        for (const ch of ranks[r]) {
            if (ch >= '1' && ch <= '8') {
                file += ch.charCodeAt(0) - 48;
            } else {
                const idx = r * 8 + file;
                board[idx] = ch;
                file++;
            }
        }
    }

    let nonPawnMaterial = 0;
    let whiteNPM = 0;
    let blackNPM = 0;
    for (let i = 0; i < 64; i++) {
        const p = board[i];
        if (!p || p === 'k' || p === 'K' || p === 'p' || p === 'P') continue;
        const v = PIECE_VALUE[p.toLowerCase()];
        nonPawnMaterial += v;
        if (p === p.toUpperCase()) whiteNPM += v; else blackNPM += v;
    }
    const endgame = nonPawnMaterial === 0 ||
        (whiteNPM <= ROOK_VAL && blackNPM <= ROOK_VAL) ||
        (whiteNPM + blackNPM - Math.max(whiteNPM, blackNPM) <= ROOK_VAL && Math.max(whiteNPM, blackNPM) <= QUEEN_VAL + ROOK_VAL);

    const kingTable = endgame ? KING_END_PST : KING_MID_PST;

    for (let i = 0; i < 64; i++) {
        const p = board[i];
        if (!p) continue;
        const white = p === p.toUpperCase();
        const type = p.toLowerCase();
        const square = white ? i : mirror(i);

        if (type === 'k') {
            score += (white ? 1 : -1) * kingTable[square];
        } else {
            score += (white ? 1 : -1) * (PIECE_VALUE[type] + PST[type][square]);
        }

        if (type === 'b') {
            if (white) whiteBishops++; else blackBishops++;
        }
    }

    if (whiteBishops >= 2) score += BISHOP_PAIR_BONUS;
    if (blackBishops >= 2) score -= BISHOP_PAIR_BONUS;

    if (game.turn() === 'w') score += TEMPO_BONUS; else score -= TEMPO_BONUS;

    return score;
}

function scoreForSideToMove(whiteScore, turn) {
    return turn === 'w' ? whiteScore : -whiteScore;
}

const TT = new Map();
const TT_MAX = 200000;

function ttKey(game, depth, alpha, beta, plyFromRoot) {
    return game.fen();
}

const MATE_SCORE = 100000;

function moveKey(m) {
    return m.from + m.to + (m.promotion || '');
}

let searchDeadline = 0;
let searchNodes = 0;
let searchAborted = false;

function checkTime() {
    if ((searchNodes & 1023) === 0 && Date.now() > searchDeadline) {
        searchAborted = true;
    }
}

let killerMoves = [];
let historyHeuristic = new Map();

function orderMoves(moves, pvMove, ply) {
    const scored = moves.map(function (m) {
        let s = 0;
        const key = moveKey(m);
        if (pvMove && key === pvMove) {
            s = 1000000;
        } else if (m.captured) {
            const victim = PIECE_VALUE[m.captured] || 0;
            const attacker = PIECE_VALUE[m.piece] || 0;
            s = 100000 + victim * 10 - attacker;
        } else if (m.promotion) {
            s = 90000 + PIECE_VALUE[m.promotion];
        } else if (m.san && m.san.includes('+')) {
            s = 5000;
        } else if (killerMoves[ply] && key === killerMoves[ply]) {
            s = 4000;
        } else {
            s = historyHeuristic.get(key) || 0;
        }
        return { m: m, s: s };
    });
    scored.sort(function (a, b) { return b.s - a.s; });
    return scored.map(function (x) { return x.m; });
}

function quiesce(game, alpha, beta, whitePOV, qdepth) {
    searchNodes++;
    checkTime();
    if (searchAborted) return 0;

    let standPat = scoreForSideToMove(evaluatePosition(game), game.turn());
    if (standPat >= beta) return beta;
    if (standPat > alpha) alpha = standPat;

    if (qdepth <= 0) return alpha;

    const moves = game.moves({ verbose: true }).filter(function (m) {
        return !!m.captured || !!m.promotion;
    });

    for (const m of orderMoves(moves, null, 0)) {
        if (m.captured && standPat + PIECE_VALUE[m.captured] + 200 < alpha && !m.promotion) continue;

        game.move(m);
        const score = -quiesce(game, -beta, -alpha, whitePOV, qdepth - 1);
        game.undo();
        if (searchAborted) return 0;

        if (score >= beta) return beta;
        if (score > alpha) alpha = score;
    }
    return alpha;
}

function negamax(game, depth, alpha, beta, plyFromRoot, whitePOV) {
    searchNodes++;
    checkTime();
    if (searchAborted) return 0;

    const moves = game.moves({ verbose: true });

    if (moves.length === 0) {
        if (game.in_check()) return -MATE_SCORE + plyFromRoot;
        return 0;
    }

    if (game.insufficient_material() || game.in_draw()) return 0;

    if (depth <= 0) return quiesce(game, alpha, beta, whitePOV, 6);

    let ttMove = null;
    const key = ttKey(game);
    const entry = TT.get(key);
    if (entry && entry.depth >= depth) {
        if (entry.flag === 0) return entry.score;
        if (entry.flag === 1 && entry.score <= alpha) return alpha;
        if (entry.flag === 2 && entry.score >= beta) return beta;
    }
    if (entry) ttMove = entry.move;

    const ordered = orderMoves(moves, ttMove, plyFromRoot);
    let bestScore = -Infinity;
    let bestMove = null;
    const alphaOrig = alpha;

    for (const m of ordered) {
        game.move(m);
        const score = -negamax(game, depth - 1, -beta, -alpha, plyFromRoot + 1, whitePOV);
        game.undo();
        if (searchAborted) break;

        if (score > bestScore) {
            bestScore = score;
            bestMove = m;
        }
        if (bestScore > alpha) alpha = bestScore;
        if (alpha >= beta) {
            if (!m.captured) {
                killerMoves[plyFromRoot] = moveKey(m);
                const hk = moveKey(m);
                historyHeuristic.set(hk, (historyHeuristic.get(hk) || 0) + depth * depth);
            }
            break;
        }
    }

    if (!searchAborted && bestMove) {
        const flag = bestScore <= alphaOrig ? 1 : (bestScore >= beta ? 2 : 0);
        if (TT.size >= TT_MAX) TT.clear();
        TT.set(key, { depth: depth, score: bestScore, flag: flag, move: moveKey(bestMove), bestSan: bestMove.san });
    }

    return bestScore;
}

function search(game, maxDepth, timeLimitMs) {
    TT.clear();
    killerMoves = [];
    historyHeuristic = new Map();
    searchAborted = false;
    searchNodes = 0;
    const startedAt = Date.now();
    searchDeadline = startedAt + (timeLimitMs || 1200);

    const whitePOV = true;
    let bestMove = null;
    let bestSan = '';
    let reachedDepth = 0;
    let completedScore = 0;

    const rootMoves = game.moves({ verbose: true });
    if (rootMoves.length === 0) return null;

    for (let depth = 1; depth <= maxDepth; depth++) {
        const ordered = orderMoves(rootMoves, bestMove ? moveKey(bestMove) : null, 0);
        let alpha = -Infinity;
        let localBest = null;
        let localBestScore = -Infinity;
        let abortedMidIteration = false;

        for (const m of ordered) {
            game.move(m);
            const score = -negamax(game, depth - 1, -Infinity, -alpha, 1, whitePOV);
            game.undo();

            if (searchAborted) { abortedMidIteration = true; break; }

            if (score > localBestScore) {
                localBestScore = score;
                localBest = m;
                alpha = score;
            }
        }

        if (localBest && (!abortedMidIteration || depth === 1)) {
            bestMove = localBest;
            bestSan = localBest.san;
            reachedDepth = depth;
            completedScore = localBestScore;
        }
        if (searchAborted || abortedMidIteration) break;

        if (Math.abs(completedScore) > MATE_SCORE - 100) break;
    }

    if (!bestMove) return null;

    let evalAfterWhite;
    let isMate = false;
    let mateIn = null;
    game.move(bestMove);
    if (game.in_checkmate()) {
        isMate = true;
        mateIn = Math.ceil(reachedDepth / 2);
        evalAfterWhite = (game.turn() === 'b') ? MATE_SCORE : -MATE_SCORE;
    } else {
        evalAfterWhite = evaluatePosition(game);
    }
    game.undo();

    return {
        san: bestSan,
        from: bestMove.from,
        to: bestMove.to,
        promotion: bestMove.promotion || null,
        captured: bestMove.captured || null,
        piece: bestMove.piece,
        color: bestMove.color,
        scoreCpWhite: isMate ? evalAfterWhite : scoreForSideToMove(completedScore, bestMove.color === 'w' ? 'b' : 'w'),
        evalAfterCpWhite: evalAfterWhite,
        depth: reachedDepth,
        nodes: searchNodes,
        timeMs: Date.now() - startedAt,
        mate: isMate ? mateIn : null
    };
}

window.Engine = {
    search: search,
    evaluatePosition: evaluatePosition,
    MATE_SCORE: MATE_SCORE
};
