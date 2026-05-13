/**
 * server.js — Express REST API
 *
 * Endpoints:
 *   POST   /api/players              — register a player
 *   GET    /api/players/:username    — get player profile
 *   GET    /api/leaderboard          — top players
 *   POST   /api/games                — start a new game
 *   GET    /api/games/:id            — get game state
 *   POST   /api/games/:id/move       — make a move
 *   DELETE /api/games/:id            — abandon a game
 *   GET    /api/games/:id/moves      — full move history
 */

const express = require('express');
const path    = require('path');
const db      = require('./database');
const gm      = require('./gameManager');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// ── Error wrapper ─────────────────────────────────────────────────────────────

function wrap(fn) {
  return async (req, res) => {
    try {
      const result = await fn(req, res);
      if (!res.headersSent) res.json({ ok: true, data: result });
    } catch (err) {
      res.status(400).json({ ok: false, error: err.message });
    }
  };
}

// ── Players ───────────────────────────────────────────────────────────────────

app.post('/api/players', wrap(req => {
  const { username, displayName } = req.body;
  if (!username) throw new Error('username is required');
  return db.createPlayer(username, displayName || username);
}));

app.get('/api/players/:username', wrap(req => {
  const player = db.getPlayerByUsername(req.params.username);
  if (!player) throw new Error('Player not found');
  return player;
}));

app.get('/api/leaderboard', wrap(req => {
  const limit = parseInt(req.query.limit) || 10;
  return db.getLeaderboard(limit);
}));

// ── Games ─────────────────────────────────────────────────────────────────────

app.post('/api/games', wrap(req => {
  const { mode, difficulty, playerX, playerO } = req.body;
  if (!mode || !playerX) throw new Error('mode and playerX are required');
  return gm.startGame({ mode, difficulty, playerXUsername: playerX, playerOUsername: playerO });
}));

app.get('/api/games/:id', wrap(req => {
  const game = db.getGame(Number(req.params.id));
  if (!game) throw new Error('Game not found');
  return gm.formatGameState(game);
}));

app.post('/api/games/:id/move', wrap(req => {
  const { position, player } = req.body;
  if (position === undefined || !player) throw new Error('position and player are required');
  return gm.makeMove(Number(req.params.id), Number(position), player);
}));

app.delete('/api/games/:id', wrap(req => {
  return gm.abandonGame(Number(req.params.id));
}));

app.get('/api/games/:id/moves', wrap(req => {
  return db.getMovesForGame(Number(req.params.id));
}));

app.get('/api/games', wrap(req => {
  return db.listGames(req.query.status || null, parseInt(req.query.limit) || 20);
}));

// ── Start ─────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`\n🎮  Tic Tac Toe server running at http://localhost:${PORT}\n`);
});

module.exports = app;
