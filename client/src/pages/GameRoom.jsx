import { useRef, useState } from "react";
import { Chessboard } from "react-chessboard";
import { Chess } from "chess.js";

export default function GameRoom() {
  // Create a persistent chess game instance
  const gameRef = useRef(new Chess());

  // React state holds the board position (FEN)
  const [fen, setFen] = useState(gameRef.current.fen());

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
