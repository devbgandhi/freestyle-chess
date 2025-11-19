//Socket

module.exports = function(io) {
  io.on('connection', (socket) => {
    console.log('Player connected:', socket.id);

    socket.on('join-room', ({ roomId }) => {
      socket.join(roomId);
      const roomSize = io.sockets.adapter.rooms.get(roomId)?.size || 0;
      console.log(`Player ${socket.id} joined room ${roomId}. Players: ${roomSize}`);
      
      // Tell everyone in room that a player joined
      io.to(roomId).emit('player-joined', { roomId, playerCount: roomSize });
    });

    socket.on('disconnect', () => {
      console.log('Player disconnected:', socket.id);
    });
  });
};