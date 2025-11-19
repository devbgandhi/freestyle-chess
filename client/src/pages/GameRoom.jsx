import { useRef, useState, useEffect } from "react";
import { Chessboard } from "react-chessboard";
import { Chess } from "chess.js";
import { io } from "socket.io-client";

export default function GameRoom() {
  // chess game instance
  const gameRef = useRef(new Chess());
  const socketRef = useRef(null);

  // React state holds the board position (FEN)
  const [fen, setFen] = useState(gameRef.current.fen());
  const [roomId] = useState("test-room"); // Fixed room for testing
  const [playerCount, setPlayerCount] = useState(0);

  // Connect to server and join room
  useEffect(() => {
    const socket = io("http://localhost:3000");
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("Connected to server:", socket.id);
      socket.emit("join-room", { roomId });
    });

    socket.on("player-joined", ({ roomId: room, playerCount: count }) => {
      console.log(`Player joined room ${room}. Total players: ${count}`);
      setPlayerCount(count);
    });

    socket.on("disconnect", () => {
      console.log("Disconnected from server");
    });

    // Cleanup on unmount
    return () => socket.disconnect();
  }, [roomId]);

  // Handle piece drop event (when user moves a piece)
  function handleMove(sourceSquare, targetSquare) {
    const game = gameRef.current;

    const move = game.move({
      from: sourceSquare,
      to: targetSquare,
      promotion: "q", // always promote to queen for now
    });

    // Illegal move -> do nothing
    if (move === null) return false;

    // Update FEN so the board re-renders
    setFen(game.fen());
    return true;
  }

  return (
    <div style={{ width: "400px" }}>
      <div style={{ marginBottom: "10px" }}>
        <strong>Room:</strong> {roomId} | <strong>Players:</strong> {playerCount}
      </div>
      {/* react-chessboard expects an `options` object (position + callbacks) */}
      <Chessboard
        options={{
          position: fen,
          onPieceDrop: ({ sourceSquare, targetSquare }) => handleMove(sourceSquare, targetSquare),
        }}
      />
    </div>
  );
}
