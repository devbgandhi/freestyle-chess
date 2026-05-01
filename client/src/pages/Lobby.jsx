import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Lobby() {
  const navigate = useNavigate();
  const [joinRoomId, setJoinRoomId] = useState('');
  const [error, setError] = useState('');

  // Generate a random room ID (alphanumeric, 8 chars)
  const generateRoomId = () => {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
  };

  const handleCreateRoom = () => {
    const newRoomId = generateRoomId();
    navigate(`/room/${newRoomId}`);
  };

  const handleJoinRoom = () => {
    if (!joinRoomId.trim()) {
      setError('Please enter a room ID');
      return;
    }
    setError('');
    navigate(`/room/${joinRoomId.trim()}`);
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Freestyle Chess</h1>
      <p style={styles.subtitle}>Real-time multiplayer chess</p>

      <div style={styles.card}>
        <h2 style={styles.cardTitle}>Create a New Game</h2>
        <button style={styles.button} onClick={handleCreateRoom}>
          Create Room
        </button>
        <p style={styles.hint}>You'll get a unique room ID to share with a friend</p>
      </div>

      <div style={styles.divider}>OR</div>

      <div style={styles.card}>
        <h2 style={styles.cardTitle}>Join an Existing Game</h2>
        <input
          type="text"
          placeholder="Enter room ID"
          value={joinRoomId}
          onChange={(e) => setJoinRoomId(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleJoinRoom()}
          style={styles.input}
        />
        <button style={styles.button} onClick={handleJoinRoom}>
          Join Room
        </button>
        {error && <p style={styles.error}>{error}</p>}
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: '#1e1e1e',
    color: '#fff',
    padding: '20px',
    fontFamily: 'Arial, sans-serif',
  },
  title: {
    fontSize: '48px',
    marginBottom: '8px',
    color: '#fff',
  },
  subtitle: {
    fontSize: '18px',
    color: '#aaa',
    marginBottom: '40px',
  },
  card: {
    backgroundColor: '#2d2d2d',
    border: '1px solid #444',
    borderRadius: '8px',
    padding: '30px',
    width: '100%',
    maxWidth: '400px',
    marginBottom: '20px',
    textAlign: 'center',
  },
  cardTitle: {
    fontSize: '20px',
    marginBottom: '20px',
    color: '#fff',
  },
  button: {
    backgroundColor: '#4CAF50',
    color: 'white',
    border: 'none',
    padding: '12px 24px',
    fontSize: '16px',
    borderRadius: '4px',
    cursor: 'pointer',
    width: '100%',
    transition: 'background-color 0.3s',
  },
  input: {
    width: '100%',
    padding: '12px',
    fontSize: '16px',
    borderRadius: '4px',
    border: '1px solid #444',
    backgroundColor: '#1e1e1e',
    color: '#fff',
    marginBottom: '15px',
    boxSizing: 'border-box',
  },
  hint: {
    fontSize: '14px',
    color: '#aaa',
    marginTop: '12px',
  },
  divider: {
    fontSize: '14px',
    color: '#666',
    marginBottom: '20px',
  },
  error: {
    color: '#ff6b6b',
    fontSize: '14px',
    marginTop: '10px',
  },
};
