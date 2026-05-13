/**
 * gameManager.js — Orchestrates game sessions and persists to DB
 */

const db     = require('./database');
const engine = require('./gameEngine');

// ── Start a game ──────────────────────────────────────────────────────────────

function startGame({ mode, difficulty, playerXUsername, playerOUsername }) {
  const playerX = db.getPlayerByUsername(playerXUsername);
  if (!playerX) throw new Error(`Player not found: ${playerXUsername}`);

  let playerO = null;
  if (mode === 'PvP') {
    playerO = db.getPlayerByUsername(playerOUsername);
    if (!playerO) throw new Error(`Player not found: ${playerOUsername}`);
  }

  const game = db.createGame({
    mode,
    difficulty: mode === 'PvC' ? (difficulty || 'medium') : null,
    playerXId: playerX.id,
    playerOId: playerO ? playerO.id : null,
  });

  return formatGameState(game);
}

// ── Make a move ───────────────────────────────────────────────────────────────

function makeMove(gameId, position, playerUsername) {
  const game = db.getGame(gameId);
  if (!game)                    throw new Error('Game not found');
  if (game.status !== 'active') throw new Error('Game is already finished');
  if (!engine.isValidMove(game.board_state, position)) {
    throw new Error(`Invalid move at position ${position}`);
  }

  // Verify it's this player's turn
  const movingPlayer = db.getPlayerByUsername(playerUsername);
  if (!movingPlayer) throw new Error(`Player not found: ${playerUsername}`);

  const isX = game.player_x_id === movingPlayer.id;
  const isO = game.player_o_id === movingPlayer.id;
  if (!isX && !isO) throw new Error('Player is not in this game');
  if (isX && game.current_turn !== 'X') throw new Error("It's not your turn");
  if (isO && game.current_turn !== 'O') throw new Error("It's not your turn");

  // Count existing moves for move_number
  const moves      = db.getMovesForGame(gameId);
  const moveNumber = moves.length + 1;
  const symbol     = game.current_turn;

  // Apply move
  const newBoard = engine.applyMove(game.board_state, position, symbol);
  db.recordMove({ gameId, playerId: movingPlayer.id, symbol, position, moveNumber });

  const winner = engine.checkWinner(newBoard);

  if (winner) {
    db.finishGame(gameId, winner);
    _updateStats(game, winner);
    return formatGameState(db.getGame(gameId));
  }

  const nextTurn = engine.nextTurn(symbol);
  db.updateGameBoard(gameId, newBoard, nextTurn);

  // AI responds in PvC mode
  if (game.mode === 'PvC' && nextTurn === 'O') {
    return _makeAiMove(gameId, game.difficulty);
  }

  return formatGameState(db.getGame(gameId));
}

function _makeAiMove(gameId, difficulty) {
  const game   = db.getGame(gameId);
  const pos    = engine.getAiMove(game.board_state, difficulty);
  const moves  = db.getMovesForGame(gameId);
  const newBoard = engine.applyMove(game.board_state, pos, 'O');

  db.recordMove({ gameId, playerId: null, symbol: 'O', position: pos, moveNumber: moves.length + 1 });

  const winner = engine.checkWinner(newBoard);
  if (winner) {
    db.finishGame(gameId, winner);
    _updateStats(game, winner);
  } else {
    db.updateGameBoard(gameId, newBoard, 'X');
  }

  return { ...formatGameState(db.getGame(gameId)), aiMove: pos };
}

function _updateStats(game, winner) {
  const xId = game.player_x_id;
  const oId = game.player_o_id; // null for AI

  if (winner === 'draw') {
    db.updatePlayerStats(xId, 'draw');
    if (oId) db.updatePlayerStats(oId, 'draw');
  } else if (winner === 'X') {
    db.updatePlayerStats(xId, 'win');
    if (oId) db.updatePlayerStats(oId, 'loss');
  } else {
    db.updatePlayerStats(xId, 'loss');
    if (oId) db.updatePlayerStats(oId, 'win');
  }
}

// ── Abandon a game ────────────────────────────────────────────────────────────

function abandonGame(gameId) {
  const game = db.getGame(gameId);
  if (!game) throw new Error('Game not found');
  db.getDb().prepare(
    `UPDATE games SET status = 'abandoned' WHERE id = ?`
  ).run(gameId);
  return { gameId, status: 'abandoned' };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatGameState(game) {
  const board  = game.board_state || '---------';
  const winner = engine.checkWinner(board);
  return {
    gameId:      game.id,
    mode:        game.mode,
    difficulty:  game.difficulty,
    board:       boardTo2D(board),
    boardFlat:   board,
    currentTurn: game.current_turn,
    status:      game.status,
    winner:      game.winner || winner,
    winLine:     engine.getWinningLine(board),
  };
}

function boardTo2D(flat) {
  return [
    flat.slice(0, 3).split(''),
    flat.slice(3, 6).split(''),
    flat.slice(6, 9).split(''),
  ];
}

module.exports = { startGame, makeMove, abandonGame, formatGameState };
