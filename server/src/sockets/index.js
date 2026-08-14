const { Chess } = require('chess.js');

// Standard back-rank set: 2 rooks, 2 knights, 2 bishops, 1 queen, 1 king.
const REQUIRED_COUNTS = { r: 2, n: 2, b: 2, q: 1, k: 1 };

function isValidArrangement(arrangement) {
  if (!Array.isArray(arrangement) || arrangement.length !== 8) return false;
  const counts = { r: 0, n: 0, b: 0, q: 0, k: 0 };
  for (const piece of arrangement) {
    if (typeof piece !== 'string') return false;
    const p = piece.toLowerCase();
    if (!(p in counts)) return false;
    counts[p] += 1;
  }
  return Object.keys(REQUIRED_COUNTS).every((p) => counts[p] === REQUIRED_COUNTS[p]);
}

// Builds a starting FEN from each player's freely-chosen back-rank arrangement.
// Castling is disabled ('-') since arrangements are arbitrary, not the standard
// king-between-rooks layout castling rules assume.
function buildFenFromSetups(whiteArrangement, blackArrangement) {
  const rank1 = whiteArrangement.map((p) => p.toUpperCase()).join('');
  const rank8 = blackArrangement.map((p) => p.toLowerCase()).join('');
  return `${rank8}/pppppppp/8/8/8/8/PPPPPPPP/${rank1} w - - 0 1`;
}

module.exports = function(io) {

  const rooms = new Map();

  function currentGameState(room) {
    return {
      fen: room.chess.fen(),
      pgn: room.chess.pgn(),
      turn: room.chess.turn(),
      players: room.players.length,
      status: room.status,
      setupProgress: { white: !!room.setup.white, black: !!room.setup.black },
    };
  }

  io.on('connection', (socket) => {
    console.log('Player connected:', socket.id);

    // Join or Creates room state if it doesn't exist.
    socket.on('join-room', ({ roomId }) => {
      if (!roomId) return;

      let room = rooms.get(roomId);
      if (!room) {
        room = {
          players: [], //2
          sockets: new Map(), // socket.id -> { socket, role }
          chess: new Chess(),
          status: 'waiting',
          setup: { white: null, black: null }, // freeform back-rank arrangements
        };
        rooms.set(roomId, room);
      }

      // Prevent re-joining the same socket
      if (room.sockets.has(socket.id)) return;

      // Determine role: white, black, or spectator
      let role = 'spectator';
      if (room.players.length < 2) {
        role = room.players.length === 0 ? 'white' : 'black';
        room.players.push(socket.id);
      }

      room.sockets.set(socket.id, { socket, role });
      socket.join(roomId);

      console.log(`Player ${socket.id} joined room ${roomId} as ${role}`);

      // Let the joining socket know its role
      socket.emit('assign-color', { role, roomId });

      // If two players are now present, move into the setup phase where each
      // player privately picks their own back-rank formation.
      if (room.players.length === 2 && room.status === 'waiting') {
        room.status = 'setup';
      }

      // Send current game state to the joining socket
      socket.emit('game-state', currentGameState(room));

      // Notify room about the new player count
      io.to(roomId).emit('player-joined', { roomId, playerCount: room.players.length });

      if (room.status === 'setup' && room.players.length === 2) {
        io.to(roomId).emit('setup-start');
      }
    });

    // A player submits their freely-chosen back-rank arrangement (8 piece
    // letters, e.g. ['r','n','b','q','k','b','n','r']). Hidden from the
    // opponent until both players have submitted.
    socket.on('submit-setup', ({ roomId, arrangement }) => {
      const room = rooms.get(roomId);
      if (!room) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }

      const meta = room.sockets.get(socket.id);
      if (!meta || meta.role === 'spectator') {
        socket.emit('error', { message: 'Only players can submit a setup' });
        return;
      }

      if (room.status !== 'setup') {
        socket.emit('error', { message: 'Not in the setup phase' });
        return;
      }

      if (!isValidArrangement(arrangement)) {
        socket.emit('error', { message: 'Invalid piece arrangement' });
        return;
      }

      room.setup[meta.role] = arrangement.map((p) => p.toLowerCase());

      io.to(roomId).emit('setup-progress', {
        white: !!room.setup.white,
        black: !!room.setup.black,
      });

      if (room.setup.white && room.setup.black) {
        const fen = buildFenFromSetups(room.setup.white, room.setup.black);
        room.chess = new Chess(fen);
        room.status = 'started';
        io.to(roomId).emit('game-start', { fen: room.chess.fen(), turn: room.chess.turn() });
      }
    });

    // Handle move requests from clients. Server validates using chess.js then broadcasts.
    socket.on('make-move', ({ roomId, from, to, promotion = 'q' }) => {
      const room = rooms.get(roomId);
      if (!room) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }

      const meta = room.sockets.get(socket.id);
      if (!meta) {
        socket.emit('error', { message: 'You are not part of this room' });
        return;
      }

      if (meta.role === 'spectator') {
        socket.emit('error', { message: 'Spectators cannot make moves' });
        return;
      }

      const currentTurn = room.chess.turn() === 'w' ? 'white' : 'black';
      if (meta.role !== currentTurn) {
        socket.emit('invalid-move', { message: 'Not your turn' });
        return;
      }

      const move = room.chess.move({ from, to, promotion });
      if (move === null) {
        socket.emit('invalid-move', { message: 'Illegal move' });
        return;
      }

      // Broadcast the successful move to everyone in the room
      io.to(roomId).emit('move-made', {
        from: move.from,
        to: move.to,
        san: move.san,
        fen: room.chess.fen(),
        pgn: room.chess.pgn(),
        turn: room.chess.turn(),
      });

      // Check for game end
      if (room.chess.isGameOver()) {
        const result = { reason: 'unknown', winner: null };
        if (room.chess.isCheckmate()) {
          result.reason = 'checkmate';
          result.winner = room.chess.turn() === 'w' ? 'black' : 'white';
        } else if (room.chess.isStalemate()) {
          result.reason = 'stalemate';
        } else if (room.chess.isThreefoldRepetition()) {
          result.reason = 'threefold_repetition';
        } else if (room.chess.isInsufficientMaterial()) {
          result.reason = 'insufficient_material';
        } else if (room.chess.isDraw()) {
          result.reason = 'draw';
        }

        io.to(roomId).emit('game-over', result);
        room.status = 'finished';
      }
    });

    // Allow clients to request the authoritative game state (useful after invalid move)
    socket.on('request-state', ({ roomId }) => {
      const room = rooms.get(roomId);
      if (!room) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }

      socket.emit('game-state', currentGameState(room));
    });


    socket.on('disconnect', () => {
      console.log('Player disconnected:', socket.id);
      for (const [roomId, room] of rooms.entries()) {
        if (room.sockets.has(socket.id)) {
          const meta = room.sockets.get(socket.id);
          room.sockets.delete(socket.id);
          if (meta.role !== 'spectator') {
            room.players = room.players.filter((id) => id !== socket.id);

            // A player leaving before the game started cancels the setup
            // phase so a new player can start it fresh.
            if (room.status === 'setup' || room.status === 'waiting') {
              room.status = 'waiting';
              room.setup = { white: null, black: null };
            }
          }

          // Notify remaining players
          io.to(roomId).emit('player-left', { roomId, playerCount: room.players.length });
          if (room.sockets.size > 0) {
            io.to(roomId).emit('game-state', currentGameState(room));
          }

          // delete the room
          if (room.sockets.size === 0) {
            rooms.delete(roomId);
          }

          break;
        }
      }
    });
  });
};