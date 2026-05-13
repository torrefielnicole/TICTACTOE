# 🎮 Tic Tac Toe Game System

A production-ready Tic Tac Toe system with SQLite persistence, REST API, and a browser UI.

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Start the server
npm start
# → http://localhost:3000

# 3. Or run the CLI demo
npm run demo
```

## Project Structure

```
tictactoe/
├── database/
│   └── schema.sql       ← SQLite schema (3 tables, 2 views, seed data)
├── src/
│   ├── database.js      ← DB connection + all query helpers
│   ├── gameEngine.js    ← Pure game logic + Easy/Medium/Hard AI (minimax)
│   ├── gameManager.js   ← Session orchestration + DB persistence
│   ├── server.js        ← Express REST API (7 endpoints)
│   └── demo.js          ← CLI demo (no browser needed)
├── public/
│   └── index.html       ← Fully playable browser UI
├── .vscode/
│   └── launch.json      ← Press F5 → Start Server or Run Demo
├── api.http             ← REST Client tests (VS Code extension)
└── package.json
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/players` | Register a player |
| GET | `/api/players/:username` | Get player profile |
| GET | `/api/leaderboard` | Top players ranked by wins |
| POST | `/api/games` | Start a new game |
| GET | `/api/games/:id` | Get game state |
| POST | `/api/games/:id/move` | Make a move |
| DELETE | `/api/games/:id` | Abandon a game |
| GET | `/api/games/:id/moves` | Full move history |

## Database Schema

- **players** — username, display name, wins/losses/draws
- **games** — board state (9-char string), mode (PvP/PvC), AI difficulty, winner
- **move_history** — every move with position, symbol, timestamp
- **leaderboard** view — auto-ranked with win percentage
- **game_summary** view — joined game info with player names and move count

## AI Difficulty

| Level | Behavior |
|-------|----------|
| Easy | 80% random moves, 20% optimal |
| Medium | Always wins/blocks if possible; 50% random otherwise |
| Hard | Perfect play via minimax + alpha-beta pruning |
