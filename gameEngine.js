/**
 * gameEngine.js — Pure game logic (no DB, no I/O)
 * Board is a 9-char string: 'X', 'O', or '-'
 * Positions:  0 | 1 | 2
 *             3 | 4 | 5
 *             6 | 7 | 8
 */

const WIN_LINES = [
  [0,1,2],[3,4,5],[6,7,8], // rows
  [0,3,6],[1,4,7],[2,5,8], // cols
  [0,4,8],[2,4,6],          // diagonals
];

// ── Core helpers ──────────────────────────────────────────────────────────────

function boardToArray(board) { return board.split(''); }
function arrayToBoard(arr)   { return arr.join(''); }

function checkWinner(board) {
  const b = boardToArray(board);
  for (const [a, c, e] of WIN_LINES) {
    if (b[a] !== '-' && b[a] === b[c] && b[c] === b[e]) return b[a]; // 'X' or 'O'
  }
  if (b.every(cell => cell !== '-')) return 'draw';
  return null; // game still active
}

function getWinningLine(board) {
  const b = boardToArray(board);
  for (const line of WIN_LINES) {
    const [a, c, e] = line;
    if (b[a] !== '-' && b[a] === b[c] && b[c] === b[e]) return line;
  }
  return null;
}

function getEmptyCells(board) {
  return boardToArray(board).reduce((acc, cell, i) => {
    if (cell === '-') acc.push(i);
    return acc;
  }, []);
}

function applyMove(board, position, symbol) {
  const arr = boardToArray(board);
  if (arr[position] !== '-') throw new Error(`Cell ${position} is already occupied`);
  arr[position] = symbol;
  return arrayToBoard(arr);
}

function nextTurn(currentTurn) { return currentTurn === 'X' ? 'O' : 'X'; }

function isValidMove(board, position) {
  if (position < 0 || position > 8) return false;
  return boardToArray(board)[position] === '-';
}

// ── AI: Minimax with alpha-beta pruning ───────────────────────────────────────

function minimax(board, isMaximizing, alpha, beta, depth) {
  const winner = checkWinner(board);
  if (winner === 'O')    return  10 - depth;
  if (winner === 'X')    return -10 + depth;
  if (winner === 'draw') return 0;

  const emptyCells = getEmptyCells(board);

  if (isMaximizing) {
    let best = -Infinity;
    for (const pos of emptyCells) {
      const newBoard = applyMove(board, pos, 'O');
      best = Math.max(best, minimax(newBoard, false, alpha, beta, depth + 1));
      alpha = Math.max(alpha, best);
      if (beta <= alpha) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const pos of emptyCells) {
      const newBoard = applyMove(board, pos, 'X');
      best = Math.min(best, minimax(newBoard, true, alpha, beta, depth + 1));
      beta = Math.min(beta, best);
      if (beta <= alpha) break;
    }
    return best;
  }
}

function getBestMove(board) {
  const emptyCells = getEmptyCells(board);
  let bestScore = -Infinity;
  let bestMove  = emptyCells[0];

  for (const pos of emptyCells) {
    const newBoard = applyMove(board, pos, 'O');
    const score    = minimax(newBoard, false, -Infinity, Infinity, 0);
    if (score > bestScore) { bestScore = score; bestMove = pos; }
  }
  return bestMove;
}

// ── AI difficulty levels ──────────────────────────────────────────────────────

function getAiMove(board, difficulty = 'medium') {
  const empty = getEmptyCells(board);
  if (!empty.length) return null;

  switch (difficulty) {
    case 'easy':
      // 80% random, 20% optimal
      return Math.random() < 0.8
        ? empty[Math.floor(Math.random() * empty.length)]
        : getBestMove(board);

    case 'medium':
      // Optimal if can win or must block; otherwise 50% random
      return getStrategicOrRandom(board, 0.5);

    case 'hard':
    default:
      return getBestMove(board);
  }
}

function getStrategicOrRandom(board, randomChance) {
  const empty = getEmptyCells(board);

  // Win immediately if possible
  for (const pos of empty) {
    const b = applyMove(board, pos, 'O');
    if (checkWinner(b) === 'O') return pos;
  }
  // Block opponent from winning
  for (const pos of empty) {
    const b = applyMove(board, pos, 'X');
    if (checkWinner(b) === 'X') return pos;
  }
  // Fall back to random or optimal
  return Math.random() < randomChance
    ? empty[Math.floor(Math.random() * empty.length)]
    : getBestMove(board);
}

// ── Exports ───────────────────────────────────────────────────────────────────

module.exports = {
  checkWinner,
  getWinningLine,
  getEmptyCells,
  applyMove,
  nextTurn,
  isValidMove,
  getAiMove,
  WIN_LINES,
};
