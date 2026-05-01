import { useRef, useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Chessboard } from "react-chessboard";
import { Chess } from "chess.js";
import { io } from "socket.io-client";
import PromotionModal from "../components/PromotionModal";
import Toast from "../components/Toast";

export default function GameRoom() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const gameRef = useRef(new Chess());
  const socketRef = useRef(null);

  // Game state
  const [fen, setFen] = useState(gameRef.current.fen());
  const [playerCount, setPlayerCount] = useState(0);
  const [role, setRole] = useState("spectator");
  const [status, setStatus] = useState("connecting");
  const [currentTurn, setCurrentTurn] = useState("white");
  const [moveHistory, setMoveHistory] = useState([]);
  const [pgn, setPgn] = useState("");

  // UI state
  const [showPromotionModal, setShowPromotionModal] = useState(false);
  const [pendingPromotionMove, setPendingPromotionMove] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [toastType, setToastType] = useState("info");

  // Connect to server and join room
  useEffect(() => {
    if (!roomId) {
      navigate("/");
      return;
    }

    const socket = io("http://localhost:3000");
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("Connected to server:", socket.id);
      socket.emit("join-room", { roomId });
      showToast("Connected to server", "success");
    });

    socket.on("assign-color", ({ role: assignedRole }) => {
      setRole(assignedRole);
      console.log("Assigned role:", assignedRole);
      showToast(`You are ${assignedRole === "spectator" ? "spectating" : assignedRole}`, "info");
    });

    socket.on("game-state", ({ fen: serverFen, pgn: serverPgn, players, status: gameStatus }) => {
      gameRef.current = new Chess(serverFen);
      setFen(serverFen);
      setPgn(serverPgn);
      setPlayerCount(players || 0);
      setStatus(gameStatus || "waiting");
      updateMoveHistory(serverFen);
      updateTurn();
    });

    socket.on("player-joined", ({ playerCount: count }) => {
      setPlayerCount(count);
      showToast(`Player joined. Total players: ${count}`, "info");
    });

    socket.on("game-start", ({ fen: serverFen }) => {
      gameRef.current = new Chess(serverFen);
      setFen(serverFen);
      setStatus("started");
      showToast("Game started!", "success");
    });

    socket.on("move-made", ({ from, to, san, fen: serverFen }) => {
      gameRef.current = new Chess(serverFen);
      setFen(serverFen);
      updateMoveHistory(serverFen);
      updateTurn();
      console.log("Move made:", san);
    });

    socket.on("invalid-move", ({ message }) => {
      console.warn("Invalid move:", message);
      showToast(message, "error");
      // Re-sync with server
      socket.emit("request-state", { roomId });
    });

    socket.on("game-over", (result) => {
      setStatus("finished");
      showToast(`Game over: ${result.reason}${result.winner ? ` - ${result.winner} wins!` : ""}`, "info");
    });

    socket.on("error", ({ message }) => {
      console.error("Socket error:", message);
      showToast(message, "error");
    });

    socket.on("disconnect", () => {
      console.log("Disconnected from server");
      setStatus("disconnected");
      showToast("Disconnected from server", "error");
    });

    return () => socket.disconnect();
  }, [roomId, navigate]);

  // Helper: show toast notification
  const showToast = (message, type = "info") => {
    setToastMessage(message);
    setToastType(type);
  };

  // Helper: extract move history from FEN
  const updateMoveHistory = (fen) => {
    const game = new Chess(fen);
    const moves = game.moves({ verbose: true });
    setMoveHistory(moves.map((m) => m.san));
  };

  // Helper: update whose turn it is
  const updateTurn = () => {
    setCurrentTurn(gameRef.current.turn() === "w" ? "white" : "black");
  };

  // Handle piece drop with promotion detection
  const handleMove = useCallback(
    (sourceSquare, targetSquare) => {
      const socket = socketRef.current;
      if (!socket || status !== "started") return false;
      if (role === "spectator") {
        showToast("Spectators cannot move", "warning");
        return false;
      }

      // Check if it's the player's turn
      const expectedColor = role === "white" ? "w" : "b";
      if (gameRef.current.turn() !== expectedColor) {
        showToast("Not your turn", "error");
        return false;
      }

      // Check if it's a promotion
      const piece = gameRef.current.get(sourceSquare);
      const isPromotion =
        piece &&
        piece.type === "p" &&
        ((piece.color === "w" && targetSquare[1] === "8") ||
          (piece.color === "b" && targetSquare[1] === "1"));

      if (isPromotion) {
        // Show promotion modal instead of immediate move
        setPendingPromotionMove({ sourceSquare, targetSquare });
        setShowPromotionModal(true);
        return true;
      }

      // Non-promotion move: send immediately
      sendMove(sourceSquare, targetSquare, "q");
      return true;
    },
    [role, status]
  );

  // Send move to server
  const sendMove = (from, to, promotion = "q") => {
    const socket = socketRef.current;
    if (!socket) return;

    // Optimistically update local board
    const localGame = gameRef.current;
    const move = localGame.move({ from, to, promotion });
    if (move === null) {
      showToast("Illegal move", "error");
      return;
    }

    setFen(localGame.fen());
    updateMoveHistory(localGame.fen());
    updateTurn();

    // Send to server for authoritative validation
    socket.emit("make-move", { roomId, from, to, promotion });
  };

  // Handle promotion choice
  const handlePromotionChoice = (promotion) => {
    if (pendingPromotionMove) {
      const { sourceSquare, targetSquare } = pendingPromotionMove;
      sendMove(sourceSquare, targetSquare, promotion);
    }
    setShowPromotionModal(false);
    setPendingPromotionMove(null);
  };

  // Determine status text
  const getStatusText = () => {
    if (status === "waiting") {
      return "Waiting for opponent...";
    }
    if (status === "started") {
      if (role === "spectator") {
        return "Spectating";
      }
      if (currentTurn === role) {
        return "Your turn!";
      } else {
        return `${currentTurn === "white" ? "White" : "Black"} to move`;
      }
    }
    if (status === "finished") {
      return "Game finished";
    }
    if (status === "disconnected") {
      return "Disconnected";
    }
    return status;
  };

  const isMyTurn = status === "started" && currentTurn === role && role !== "spectator";
  const isDraggable = isMyTurn;

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.titleArea}>
          <h1 style={styles.title}>Freestyle Chess</h1>
          <div style={styles.roomInfo}>
            <strong>Room:</strong> {roomId} | <strong>Players:</strong> {playerCount}/2 | <strong>Role:</strong> {role}
          </div>
        </div>
        <button style={styles.backButton} onClick={() => navigate("/")}>
          ← Back to Lobby
        </button>
      </div>

      {/* Main content */}
      <div style={styles.main}>
        {/* Board and status */}
        <div style={styles.boardSection}>
          <div style={styles.statusArea}>
            <div style={styles.statusText}>{getStatusText()}</div>
            <div style={styles.statusDetail}>
              {status === "started" && role !== "spectator" ? (
                <>
                  <span style={{ color: currentTurn === role ? "#4CAF50" : "#999" }}>
                    {role.charAt(0).toUpperCase() + role.slice(1)}
                  </span>
                  {isMyTurn && <span style={styles.pulsing}>●</span>}
                </>
              ) : null}
            </div>
          </div>

          {/* Board */}
          <div style={styles.boardContainer}>
            <Chessboard
              position={fen}
              onPieceDrop={(sourceSquare, targetSquare) => handleMove(sourceSquare, targetSquare)}
              arePiecesDraggable={isDraggable}
              boardWidth={400}
            />
          </div>

          {/* Action buttons */}
          <div style={styles.actions}>
            <button
              style={{ ...styles.actionButton, opacity: status === "started" ? 1 : 0.5 }}
              disabled={status !== "started"}
            >
              Resign
            </button>
            <button
              style={{ ...styles.actionButton, opacity: status === "started" ? 1 : 0.5 }}
              disabled={status !== "started"}
            >
              Offer Draw
            </button>
          </div>
        </div>

        {/* Sidebar: Move history */}
        <div style={styles.sidebar}>
          <h3 style={styles.sidebarTitle}>Move History</h3>
          <div style={styles.moveList}>
            {moveHistory.length === 0 ? (
              <p style={styles.noMoves}>No moves yet</p>
            ) : (
              <div>
                {moveHistory.map((move, idx) => (
                  <span key={idx} style={styles.moveItem}>
                    {idx % 2 === 0 && <span style={styles.moveNumber}>{idx / 2 + 1}.</span>}
                    {move}{" "}
                  </span>
                ))}
              </div>
            )}
          </div>

          <h3 style={styles.sidebarTitle}>Game Info</h3>
          <div style={styles.gameInfo}>
            <div style={styles.infoRow}>
              <strong>Status:</strong> {status}
            </div>
            <div style={styles.infoRow}>
              <strong>Moves:</strong> {moveHistory.length}
            </div>
          </div>
        </div>
      </div>

      {/* Promotion modal */}
      {showPromotionModal && (
        <PromotionModal
          onPromote={handlePromotionChoice}
          onCancel={() => {
            setShowPromotionModal(false);
            setPendingPromotionMove(null);
          }}
        />
      )}

      {/* Toast notification */}
      {toastMessage && (
        <Toast
          message={toastMessage}
          type={toastType}
          onClose={() => setToastMessage(null)}
        />
      )}
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    minHeight: "100vh",
    backgroundColor: "#1e1e1e",
    color: "#fff",
    fontFamily: "Arial, sans-serif",
  },
  header: {
    backgroundColor: "#2d2d2d",
    padding: "15px 20px",
    borderBottom: "1px solid #444",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  titleArea: {
    display: "flex",
    flexDirection: "column",
    gap: "5px",
  },
  title: {
    margin: 0,
    fontSize: "24px",
    color: "#fff",
  },
  roomInfo: {
    fontSize: "13px",
    color: "#aaa",
  },
  backButton: {
    backgroundColor: "#666",
    color: "white",
    border: "none",
    padding: "8px 16px",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "14px",
  },
  main: {
    display: "flex",
    flex: 1,
    padding: "20px",
    gap: "20px",
  },
  boardSection: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "15px",
  },
  statusArea: {
    backgroundColor: "#2d2d2d",
    border: "1px solid #444",
    borderRadius: "4px",
    padding: "12px 20px",
    width: "400px",
    textAlign: "center",
  },
  statusText: {
    fontSize: "16px",
    fontWeight: "bold",
    color: "#4CAF50",
  },
  statusDetail: {
    fontSize: "13px",
    color: "#aaa",
    marginTop: "5px",
  },
  pulsing: {
    marginLeft: "8px",
    fontSize: "20px",
    animation: "pulse 1s infinite",
  },
  boardContainer: {
    display: "flex",
    justifyContent: "center",
  },
  actions: {
    display: "flex",
    gap: "10px",
    width: "400px",
  },
  actionButton: {
    flex: 1,
    padding: "10px",
    backgroundColor: "#4CAF50",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "14px",
  },
  sidebar: {
    backgroundColor: "#2d2d2d",
    border: "1px solid #444",
    borderRadius: "4px",
    padding: "15px",
    width: "250px",
    maxHeight: "600px",
    overflowY: "auto",
  },
  sidebarTitle: {
    fontSize: "14px",
    fontWeight: "bold",
    color: "#4CAF50",
    marginTop: 0,
    marginBottom: "10px",
    borderBottom: "1px solid #444",
    paddingBottom: "8px",
  },
  moveList: {
    fontSize: "13px",
    color: "#ccc",
    lineHeight: "1.6",
    marginBottom: "15px",
  },
  noMoves: {
    color: "#888",
    fontSize: "12px",
  },
  moveItem: {
    marginRight: "4px",
  },
  moveNumber: {
    color: "#888",
    marginRight: "4px",
  },
  gameInfo: {
    fontSize: "13px",
    color: "#ccc",
  },
  infoRow: {
    marginBottom: "8px",
    display: "flex",
    justifyContent: "space-between",
  },
};

