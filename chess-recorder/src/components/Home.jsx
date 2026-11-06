import React from 'react';
import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div style={styles.container}>
      <div style={styles.heroCard}>
        <h1 style={{ fontSize: '28px', color: '#ffcc00', marginBottom: '10px' }}>♟️ Welcome to Chess Recorder & Learn Hub</h1>
        <p style={{ color: '#ccc', lineHeight: '1.6', fontSize: '15px', marginBottom: '20px' }}>
          Your all-in-one platform to play real-time online multiplayer chess, master essential tactics through interactive episodes, and explore code lessons on building modern web applications.
        </p>

        <div style={styles.buttonGroup}>
          <Link to="/play" style={{ ...styles.actionBtn, backgroundColor: '#2e7d32' }}>
            ⚔️ Play Online
          </Link>
          <Link to="/learn" style={{ ...styles.actionBtn, backgroundColor: '#2b5c8f' }}>
            🎓 Learn & Practice
          </Link>
          <Link to="/code" style={{ ...styles.actionBtn, backgroundColor: '#5c32a8' }}>
            💻 Code Lessons
          </Link>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { padding: '40px 20px', maxWidth: '800px', margin: '0 auto', color: '#fff', fontFamily: 'sans-serif', textAlign: 'center' },
  heroCard: { backgroundColor: '#1e1e1e', border: '1px solid #333', borderRadius: '12px', padding: '30px', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' },
  buttonGroup: { display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '20px' },
  actionBtn: { padding: '12px 20px', borderRadius: '6px', color: '#fff', textDecoration: 'none', fontWeight: 'bold', fontSize: '15px' }
};
