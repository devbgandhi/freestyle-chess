const { Chess } = require('chess.js');

module.exports = function(io) {

  const rooms = new Map();

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

      // Send current game state to the joining socket
      socket.emit('game-state', {
        fen: room.chess.fen(),
        pgn: room.chess.pgn(),
        turn: room.chess.turn(),
        players: room.players.length,
        status: room.status,
      });

      // Notify room about the new player count
      io.to(roomId).emit('player-joined', { roomId, playerCount: room.players.length });

      // If two players now, start the game (if not already started)
      if (room.players.length === 2 && room.status === 'waiting') {
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
      if (room.chess.game_over()) {
        const result = { reason: 'unknown', winner: null };
        if (room.chess.in_checkmate()) {
          result.reason = 'checkmate';
          result.winner = room.chess.turn() === 'w' ? 'black' : 'white';
        } else if (room.chess.in_stalemate()) {
          result.reason = 'stalemate';
        } else if (room.chess.in_threefold_repetition()) {
          result.reason = 'threefold_repetition';
        } else if (room.chess.insufficient_material()) {
          result.reason = 'insufficient_material';
        } else if (room.chess.in_draw()) {
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

      socket.emit('game-state', {
        fen: room.chess.fen(),
        pgn: room.chess.pgn(),
        turn: room.chess.turn(),
        players: room.players.length,
        status: room.status,
      });
    });


    socket.on('disconnect', () => {
      console.log('Player disconnected:', socket.id);
      for (const [roomId, room] of rooms.entries()) {
        if (room.sockets.has(socket.id)) {
          const meta = room.sockets.get(socket.id);
          room.sockets.delete(socket.id);
          if (meta.role !== 'spectator') {
            room.players = room.players.filter((id) => id !== socket.id);
          }

          // Notify remaining players
          io.to(roomId).emit('player-left', { roomId, playerCount: room.players.length });

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