import { useState } from 'react';

export default function PromotionModal({ onPromote, onCancel }) {
  const pieces = ['q', 'r', 'b', 'n'];
  const pieceNames = { q: 'Queen', r: 'Rook', b: 'Bishop', n: 'Knight' };
  const pieceUnicode = { q: '♕', r: '♖', b: '♗', n: '♘' };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <h2 style={styles.title}>Promote Pawn</h2>
        <p style={styles.subtitle}>Choose a piece:</p>
        <div style={styles.pieceGrid}>
          {pieces.map((piece) => (
            <button
              key={piece}
              style={styles.pieceButton}
              onClick={() => onPromote(piece)}
              title={pieceNames[piece]}
            >
              <span style={styles.pieceSymbol}>{pieceUnicode[piece]}</span>
              <div style={styles.pieceName}>{pieceNames[piece]}</div>
            </button>
          ))}
        </div>
        <button style={styles.cancelButton} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: '#2d2d2d',
    border: '2px solid #4CAF50',
    borderRadius: '8px',
    padding: '30px',
    textAlign: 'center',
    color: '#fff',
    minWidth: '300px',
  },
  title: {
    fontSize: '24px',
    marginBottom: '10px',
    color: '#4CAF50',
  },
  subtitle: {
    fontSize: '14px',
    color: '#aaa',
    marginBottom: '20px',
  },
  pieceGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '10px',
    marginBottom: '20px',
  },
  pieceButton: {
    backgroundColor: '#1e1e1e',
    border: '1px solid #444',
    borderRadius: '4px',
    padding: '15px',
    color: '#fff',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  pieceSymbol: {
    fontSize: '36px',
    display: 'block',
    marginBottom: '8px',
  },
  pieceName: {
    fontSize: '12px',
    color: '#aaa',
  },
  cancelButton: {
    backgroundColor: '#666',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '4px',
    cursor: 'pointer',
    width: '100%',
    fontSize: '14px',
  },
};
