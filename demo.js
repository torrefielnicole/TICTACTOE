/**
 * demo.js — CLI demo: plays a full game vs Hard AI, prints each step
 * Run with: node src/demo.js
 */

const db     = require('./database');
const gm     = require('./gameManager');
const engine = require('./gameEngine');

function printBoard(boardFlat) {
  const b = boardFlat.split('');
  const sym = c => (c === '-' ? '·' : c);
  console.log(`
  ${sym(b[0])} │ ${sym(b[1])} │ ${sym(b[2])}
  ──┼───┼──
  ${sym(b[3])} │ ${sym(b[4])} │ ${sym(b[5])}
  ──┼───┼──
  ${sym(b[6])} │ ${sym(b[7])} │ ${sym(b[8])}
  `);
}

function main() {
  console.log('═══════════════════════════════');
  console.log('  Tic Tac Toe — CLI Demo');
  console.log('  Player (X) vs Hard AI (O)');
  console.log('═══════════════════════════════\n');

  // Ensure demo player exists
  let player = db.getPlayerByUsername('demo');
  if (!player) player = db.createPlayer('demo', 'Demo Player');

  // Start PvC game on Hard
  let state = gm.startGame({
    mode:            'PvC',
    difficulty:      'hard',
    playerXUsername: 'demo',
  });

  console.log(`Game #${state.gameId} started. You are X, AI is O.\n`);
  printBoard(state.boardFlat);

  // Human plays positions: 4 (center), 0 (top-left), 2 (top-right) — tries to win
  const humanMoves = [4, 0, 2, 6];

  for (const pos of humanMoves) {
    if (state.status !== 'active') break;

    console.log(`→ Human plays position ${pos}`);
    state = gm.makeMove(state.gameId, pos, 'demo');
    printBoard(state.boardFlat);

    if (state.aiMove !== undefined) {
      console.log(`  AI played position ${state.aiMove}`);
    }

    if (state.winner) {
      if (state.winner === 'draw') {
        console.log('🤝  It\'s a draw!');
      } else {
        console.log(`🏆  ${state.winner === 'X' ? 'Human' : 'AI'} wins!`);
      }
      break;
    }
  }

  // Print final stats
  const updated = db.getPlayer(player.id);
  console.log('\n── Player Stats ──────────────────');
  console.log(`  ${updated.display_name}: W${updated.wins} / L${updated.losses} / D${updated.draws}`);
  console.log('──────────────────────────────────\n');

  db.closeDb();
}

main();
