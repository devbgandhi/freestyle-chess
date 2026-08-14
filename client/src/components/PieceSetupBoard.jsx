import { useMemo, useState } from "react";

// Standard back-rank set: 2 rooks, 2 knights, 2 bishops, 1 queen, 1 king.
const TOTAL_COUNTS = { k: 1, q: 1, r: 2, b: 2, n: 2 };
const PALETTE_ORDER = ["k", "q", "r", "b", "n"];

const PIECE_NAMES = { k: "King", q: "Queen", r: "Rook", b: "Bishop", n: "Knight" };

const WHITE_SYMBOLS = { k: "♔", q: "♕", r: "♖", b: "♗", n: "♘" };
const BLACK_SYMBOLS = { k: "♚", q: "♛", r: "♜", b: "♝", n: "♞" };

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];

function shuffledSet() {
  const bag = ["k", "q", "r", "r", "n", "n", "b", "b"];
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
  return bag;
}

export default function PieceSetupBoard({ color, onSubmit }) {
  const [squares, setSquares] = useState(Array(8).fill(null));
  const [selected, setSelected] = useState(null); // { source: 'palette'|'square', piece?, index? }

  const symbols = color === "black" ? BLACK_SYMBOLS : WHITE_SYMBOLS;

  const remaining = useMemo(() => {
    const used = { k: 0, q: 0, r: 0, b: 0, n: 0 };
    squares.forEach((p) => {
      if (p) used[p] += 1;
    });
    return {
      k: TOTAL_COUNTS.k - used.k,
      q: TOTAL_COUNTS.q - used.q,
      r: TOTAL_COUNTS.r - used.r,
      b: TOTAL_COUNTS.b - used.b,
      n: TOTAL_COUNTS.n - used.n,
    };
  }, [squares]);

  const isComplete = squares.every((p) => p !== null);

  const selectPalette = (piece) => {
    const isSelected = selected?.source === "palette" && selected.piece === piece;
    if (isSelected) {
      setSelected(null);
      return;
    }
    if (remaining[piece] <= 0) return;
    setSelected({ source: "palette", piece });
  };

  const clickSquare = (index) => {
    if (selected?.source === "palette") {
      setSquares((prev) => {
        const next = [...prev];
        next[index] = selected.piece;
        return next;
      });
      setSelected(null);
      return;
    }

    if (selected?.source === "square") {
      if (selected.index === index) {
        setSelected(null);
        return;
      }
      setSquares((prev) => {
        const next = [...prev];
        [next[index], next[selected.index]] = [next[selected.index], next[index]];
        return next;
      });
      setSelected(null);
      return;
    }

    if (squares[index]) {
      setSelected({ source: "square", index });
    }
  };

  const clearSquare = (e, index) => {
    e.preventDefault();
    setSquares((prev) => {
      const next = [...prev];
      next[index] = null;
      return next;
    });
    setSelected((prev) => (prev?.source === "square" && prev.index === index ? null : prev));
  };

  const handleRandomize = () => {
    setSquares(shuffledSet());
    setSelected(null);
  };

  const handleClear = () => {
    setSquares(Array(8).fill(null));
    setSelected(null);
  };

  const handleConfirm = () => {
    if (!isComplete) return;
    onSubmit(squares);
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Arrange Your Pieces</h2>
      <p style={styles.subtitle}>
        Pick a formation for your back rank. Your opponent won't see it until the game starts.
      </p>

      <div style={styles.pawnRow}>
        {FILES.map((f) => (
          <div key={f} style={styles.pawnCell}>
            {symbols === BLACK_SYMBOLS ? "♟" : "♙"}
          </div>
        ))}
      </div>

      <div style={styles.backRow}>
        {squares.map((piece, i) => {
          const isSelected = selected?.source === "square" && selected.index === i;
          return (
            <button
              key={i}
              type="button"
              onClick={() => clickSquare(i)}
              onContextMenu={(e) => clearSquare(e, i)}
              style={{
                ...styles.cell,
                ...(i % 2 === 0 ? styles.cellLight : styles.cellDark),
                ...(isSelected ? styles.cellSelected : {}),
              }}
              title={piece ? `${PIECE_NAMES[piece]} (right-click to remove)` : "Empty"}
            >
              {piece ? symbols[piece] : ""}
              <span style={styles.fileLabel}>{FILES[i]}</span>
            </button>
          );
        })}
      </div>

      <div style={styles.palette}>
        {PALETTE_ORDER.map((piece) => {
          const count = remaining[piece];
          const isSelected = selected?.source === "palette" && selected.piece === piece;
          return (
            <button
              key={piece}
              type="button"
              onClick={() => selectPalette(piece)}
              disabled={count <= 0 && !isSelected}
              style={{
                ...styles.paletteItem,
                ...(isSelected ? styles.paletteItemSelected : {}),
                opacity: count <= 0 && !isSelected ? 0.35 : 1,
              }}
              title={PIECE_NAMES[piece]}
            >
              <span style={styles.paletteSymbol}>{symbols[piece]}</span>
              <span style={styles.paletteCount}>×{count}</span>
            </button>
          );
        })}
      </div>

      <p style={styles.hint}>
        Click a piece, then click a square to place it. Click a placed piece to swap it with
        another. Right-click a square to clear it.
      </p>

      <div style={styles.actions}>
        <button style={styles.secondaryButton} onClick={handleRandomize}>
          Random
        </button>
        <button style={styles.secondaryButton} onClick={handleClear}>
          Clear
        </button>
        <button
          style={{ ...styles.primaryButton, opacity: isComplete ? 1 : 0.5 }}
          disabled={!isComplete}
          onClick={handleConfirm}
        >
          Confirm Setup
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    backgroundColor: "#2d2d2d",
    border: "1px solid #444",
    borderRadius: "8px",
    padding: "24px",
    width: "400px",
    maxWidth: "100%",
    boxSizing: "border-box",
    textAlign: "center",
  },
  title: {
    margin: 0,
    fontSize: "20px",
    color: "#4CAF50",
  },
  subtitle: {
    fontSize: "13px",
    color: "#aaa",
    marginTop: "8px",
    marginBottom: "20px",
  },
  pawnRow: {
    display: "grid",
    gridTemplateColumns: "repeat(8, 1fr)",
    gap: "4px",
    marginBottom: "4px",
  },
  pawnCell: {
    aspectRatio: "1",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "22px",
    color: "#888",
    backgroundColor: "#1e1e1e",
    borderRadius: "3px",
  },
  backRow: {
    display: "grid",
    gridTemplateColumns: "repeat(8, 1fr)",
    gap: "4px",
    marginBottom: "20px",
  },
  cell: {
    position: "relative",
    aspectRatio: "1",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "30px",
    border: "1px solid #555",
    borderRadius: "3px",
    cursor: "pointer",
    color: "#fff",
    padding: 0,
  },
  cellLight: { backgroundColor: "#3a3a3a" },
  cellDark: { backgroundColor: "#333" },
  cellSelected: {
    boxShadow: "inset 0 0 0 2px #4CAF50",
  },
  fileLabel: {
    position: "absolute",
    bottom: "1px",
    right: "3px",
    fontSize: "9px",
    color: "#777",
  },
  palette: {
    display: "flex",
    justifyContent: "center",
    gap: "8px",
    marginBottom: "16px",
  },
  paletteItem: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "2px",
    backgroundColor: "#1e1e1e",
    border: "1px solid #555",
    borderRadius: "4px",
    padding: "8px 10px",
    cursor: "pointer",
    color: "#fff",
  },
  paletteItemSelected: {
    boxShadow: "0 0 0 2px #4CAF50",
    borderColor: "#4CAF50",
  },
  paletteSymbol: {
    fontSize: "24px",
  },
  paletteCount: {
    fontSize: "11px",
    color: "#aaa",
  },
  hint: {
    fontSize: "11px",
    color: "#888",
    marginBottom: "16px",
  },
  actions: {
    display: "flex",
    gap: "10px",
  },
  secondaryButton: {
    flex: 1,
    padding: "10px",
    backgroundColor: "#666",
    color: "#fff",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "14px",
  },
  primaryButton: {
    flex: 2,
    padding: "10px",
    backgroundColor: "#4CAF50",
    color: "#fff",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "14px",
  },
};
