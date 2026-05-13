/**
 * database.js — SQLite connection + query helpers
 * Uses better-sqlite3 for synchronous, fast DB access.
 */

const Database = require('better-sqlite3');
const path     = require('path');
const fs       = require('fs');

const DB_PATH     = path.join(__dirname, '..', 'database', 'tictactoe.db');
const SCHEMA_PATH = path.join(__dirname, '..', 'database', 'schema.sql');

let db;

// ── Connection ────────────────────────────────────────────────────────────────

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema();
  }
  return db;
}

function initSchema() {
  const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
  db.exec(schema);
}

function closeDb() {
  if (db) { db.close(); db = null; }
}

// ── Players ───────────────────────────────────────────────────────────────────

function createPlayer(username, displayName) {
  const stmt = getDb().prepare(
    `INSERT INTO players (username, display_name) VALUES (?, ?) RETURNING *`
  );
  return stmt.get(username, displayName);
}

function getPlayer(id) {
  return getDb().prepare(`SELECT * FROM players WHERE id = ?`).get(id);
}

function getPlayerByUsername(username) {
  return getDb().prepare(`SELECT * FROM players WHERE username = ?`).get(username);
}

function getLeaderboard(limit = 10) {
  return getDb().prepare(`SELECT * FROM leaderboard LIMIT ?`).all(limit);
}

function updatePlayerStats(playerId, result) {
  // result: 'win' | 'loss' | 'draw'
  const col = result === 'win' ? 'wins' : result === 'loss' ? 'losses' : 'draws';
  getDb().prepare(
    `UPDATE players SET ${col} = ${col} + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
  ).run(playerId);
}

// ── Games ─────────────────────────────────────────────────────────────────────

function createGame({ mode, difficulty, playerXId, playerOId }) {
  const stmt = getDb().prepare(`
    INSERT INTO games (mode, difficulty, player_x_id, player_o_id)
    VALUES (?, ?, ?, ?)
    RETURNING *
  `);
  return stmt.get(mode, difficulty || null, playerXId, playerOId || null);
}

function getGame(id) {
  return getDb().prepare(`SELECT * FROM games WHERE id = ?`).get(id);
}

function updateGameBoard(id, boardState, currentTurn) {
  getDb().prepare(
    `UPDATE games SET board_state = ?, current_turn = ? WHERE id = ?`
  ).run(boardState, currentTurn, id);
}

function finishGame(id, winner) {
  getDb().prepare(`
    UPDATE games
    SET status = 'finished', winner = ?, current_turn = NULL, finished_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(winner, id);
}

function getGameSummary(id) {
  return getDb().prepare(`SELECT * FROM game_summary WHERE game_id = ?`).get(id);
}

function listGames(status = null, limit = 20) {
  if (status) {
    return getDb().prepare(`SELECT * FROM game_summary WHERE status = ? LIMIT ?`).all(status, limit);
  }
  return getDb().prepare(`SELECT * FROM game_summary LIMIT ?`).all(limit);
}

// ── Moves ─────────────────────────────────────────────────────────────────────

function recordMove({ gameId, playerId, symbol, position, moveNumber }) {
  const stmt = getDb().prepare(`
    INSERT INTO move_history (game_id, player_id, symbol, position, move_number)
    VALUES (?, ?, ?, ?, ?)
    RETURNING *
  `);
  return stmt.get(gameId, playerId || null, symbol, position, moveNumber);
}

function getMovesForGame(gameId) {
  return getDb().prepare(
    `SELECT * FROM move_history WHERE game_id = ? ORDER BY move_number`
  ).all(gameId);
}

module.exports = {
  getDb, closeDb,
  // players
  createPlayer, getPlayer, getPlayerByUsername, getLeaderboard, updatePlayerStats,
  // games
  createGame, getGame, updateGameBoard, finishGame, getGameSummary, listGames,
  // moves
  recordMove, getMovesForGame,
};
