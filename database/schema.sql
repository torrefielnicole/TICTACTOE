-- Tic Tac Toe Game System Database Schema
-- SQLite compatible

PRAGMA foreign_keys = ON;

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS players (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  username    TEXT    NOT NULL UNIQUE,
  display_name TEXT   NOT NULL,
  wins        INTEGER NOT NULL DEFAULT 0,
  losses      INTEGER NOT NULL DEFAULT 0,
  draws       INTEGER NOT NULL DEFAULT 0,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS games (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  mode         TEXT    NOT NULL CHECK(mode IN ('PvP','PvC')),
  difficulty   TEXT    CHECK(difficulty IN ('easy','medium','hard')),
  player_x_id  INTEGER NOT NULL REFERENCES players(id),
  player_o_id  INTEGER REFERENCES players(id),   -- NULL when PvC (AI is O)
  board_state  TEXT    NOT NULL DEFAULT '---------', -- 9-char string, '-' = empty
  current_turn TEXT    NOT NULL DEFAULT 'X' CHECK(current_turn IN ('X','O')),
  status       TEXT    NOT NULL DEFAULT 'active' CHECK(status IN ('active','finished','abandoned')),
  winner       TEXT    CHECK(winner IN ('X','O','draw')),
  started_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  finished_at  DATETIME
);

CREATE TABLE IF NOT EXISTS move_history (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  game_id    INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  player_id  INTEGER REFERENCES players(id),  -- NULL for AI moves
  symbol     TEXT    NOT NULL CHECK(symbol IN ('X','O')),
  position   INTEGER NOT NULL CHECK(position BETWEEN 0 AND 8),
  move_number INTEGER NOT NULL,
  played_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_games_player_x   ON games(player_x_id);
CREATE INDEX IF NOT EXISTS idx_games_player_o   ON games(player_o_id);
CREATE INDEX IF NOT EXISTS idx_games_status     ON games(status);
CREATE INDEX IF NOT EXISTS idx_moves_game       ON move_history(game_id);
CREATE INDEX IF NOT EXISTS idx_moves_player     ON move_history(player_id);

-- ============================================================
-- VIEWS
-- ============================================================

CREATE VIEW IF NOT EXISTS leaderboard AS
SELECT
  p.id,
  p.username,
  p.display_name,
  p.wins,
  p.losses,
  p.draws,
  (p.wins + p.losses + p.draws)                             AS total_games,
  CASE WHEN (p.wins + p.losses + p.draws) = 0 THEN 0.0
       ELSE ROUND(p.wins * 100.0 / (p.wins + p.losses + p.draws), 1)
  END                                                        AS win_pct,
  RANK() OVER (ORDER BY p.wins DESC, win_pct DESC)           AS rank
FROM players p
ORDER BY rank;

CREATE VIEW IF NOT EXISTS game_summary AS
SELECT
  g.id            AS game_id,
  g.mode,
  g.difficulty,
  g.status,
  g.winner,
  g.started_at,
  g.finished_at,
  px.username     AS player_x,
  po.username     AS player_o,
  COUNT(m.id)     AS total_moves
FROM games g
JOIN players px ON px.id = g.player_x_id
LEFT JOIN players po ON po.id = g.player_o_id
LEFT JOIN move_history m ON m.game_id = g.id
GROUP BY g.id;

-- ============================================================
-- SEED DATA
-- ============================================================

INSERT OR IGNORE INTO players (username, display_name) VALUES
  ('alice',   'Alice'),
  ('bob',     'Bob'),
  ('charlie', 'Charlie');