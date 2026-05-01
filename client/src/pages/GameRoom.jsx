import { useRef, useState, useEffect, useCallback } from "react";
import { Chessboard } from "react-chessboard";
import { Chess } from "chess.js";
import { io } from "socket.io-client";

export default function GameRoom() {
  // chess game instance client-side for instant UI updates; server is authoritative
  const gameRef = useRef(new Chess());
  const socketRef = useRef(null);

  const [fen, setFen] = useState(gameRef.current.fen());
  const [roomId] = useState("test-room"); // TODO: make dynamic
  const [playerCount, setPlayerCount] = useState(0);
  const [role, setRole] = useState('spectator');
  const [status, setStatus] = useState('connecting');

  // Connect to server and join room
  useEffect(() => {
    const socket = io("http://localhost:3000");
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("Connected to server:", socket.id);
      socket.emit("join-room", { roomId });
      setStatus('connected');
    });

    socket.on("assign-color", ({ role: assignedRole }) => {
      setRole(assignedRole);
      console.log('Assigned role', assignedRole);
    });

    socket.on("game-state", ({ fen: serverFen, players, status: gameStatus }) => {
      // Sync local game with server
      gameRef.current = new Chess(serverFen);
      setFen(serverFen);
      setPlayerCount(players || 0);
      setStatus(gameStatus || 'waiting');
    });

    socket.on("player-joined", ({ playerCount: count }) => {
      setPlayerCount(count);
    });

    socket.on("game-start", ({ fen: serverFen }) => {
      gameRef.current = new Chess(serverFen);
      setFen(serverFen);
      setStatus('started');
    });

    socket.on("move-made", ({ from, to, fen: serverFen }) => {
      // Update local board to match server
      gameRef.current = new Chess(serverFen);
      setFen(serverFen);
    });

    socket.on('invalid-move', ({ message }) => {
      console.warn('Invalid move:', message);
      // Re-sync with server state
      socket.emit('request-state', { roomId });
    });

    socket.on('game-over', (result) => {
      setStatus('finished');
      console.log('Game over', result);
    });

    socket.on("disconnect", () => {
      console.log("Disconnected from server");
      setStatus('disconnected');
    });

    // Cleanup
    return () => socket.disconnect();
  }, [roomId]);

  // When the player attempts to move, send request to server for validation
  const handleMove = useCallback((sourceSquare, targetSquare) => {
    const socket = socketRef.current;
    if (!socket) return false;

    // Optimistically try the move locally to show immediate feedback, but we'll revert if server rejects
    const localGame = gameRef.current;
    const move = localGame.move({ from: sourceSquare, to: targetSquare, promotion: 'q' });
    if (move === null) return false; // illegal locally

    // Update UI immediately
    setFen(localGame.fen());

    // Send move to server for authoritative validation
    socket.emit('make-move', { roomId, from: sourceSquare, to: targetSquare, promotion: 'q' });

    return true;
  }, [roomId]);

  return (
    <div style={{ width: "480px" }}>
      <div style={{ marginBottom: "10px" }}>
        <strong>Room:</strong> {roomId} | <strong>Players:</strong> {playerCount} | <strong>Role:</strong> {role} | <strong>Status:</strong> {status}
      </div>

      <Chessboard
        position={fen}
        onPieceDrop={(sourceSquare, targetSquare) => handleMove(sourceSquare, targetSquare)}
        arePiecesDraggable={status === 'started' && (role === 'spectator' ? false : true)}
      />
    </div>
  );
}
