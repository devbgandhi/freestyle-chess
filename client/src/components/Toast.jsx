import { useEffect } from 'react';

export default function Toast({ message, type = 'info', duration = 3000, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const typeStyles = {
    error: { backgroundColor: '#ff6b6b', borderColor: '#cc5555' },
    success: { backgroundColor: '#4CAF50', borderColor: '#2d8a2d' },
    info: { backgroundColor: '#2196F3', borderColor: '#1565a0' },
    warning: { backgroundColor: '#ff9800', borderColor: '#cc7700' },
  };

  return (
    <div style={{ ...styles.toast, ...typeStyles[type] }}>
      <span>{message}</span>
      <button style={styles.closeBtn} onClick={onClose}>
        ×
      </button>
    </div>
  );
}

const styles = {
  toast: {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    padding: '12px 20px',
    borderRadius: '4px',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    minWidth: '250px',
    border: '1px solid',
    zIndex: 999,
    fontSize: '14px',
    animation: 'slideIn 0.3s ease-in-out',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: 'white',
    fontSize: '24px',
    cursor: 'pointer',
    marginLeft: '15px',
    padding: 0,
  },
};
