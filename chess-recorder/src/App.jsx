import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import MultiplayerGame from './components/MultiplayerGame';
import LearnHub from './components/LearnHub';
import CodeLessons from './components/CodeLessons';
import Home from './components/Home';

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  const closeSidebar = () => setSidebarOpen(false);

  return (
    <Router>
      <div className="app-container" style={{ minHeight: '100vh', backgroundColor: '#121212', color: '#fff', fontFamily: 'sans-serif' }}>
        <header style={navStyles.navbar}>
          <button style={navStyles.menuToggle} onClick={toggleSidebar}>
            ☰ Menu
          </button>
          <div style={navStyles.brand}>♟️ Chess Hub</div>
        </header>

        {/* Mobile & Desktop Sidebar / Navbar */}
        <nav style={{
          ...navStyles.sidebar,
          transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
        }}>
          <div style={navStyles.sidebarHeader}>
            <span>Navigation</span>
            <button style={navStyles.closeBtn} onClick={closeSidebar}>✕</button>
          </div>
          <Link to="/" onClick={closeSidebar} style={navStyles.navLink}>
            🏠 Home
          </Link>
          <Link to="/play" onClick={closeSidebar} style={navStyles.navLink}>
            ⚔️ Play Online
          </Link>
          <Link to="/learn" onClick={closeSidebar} style={navStyles.navLink}>
            🎓 Learn & Practice
          </Link>
          <Link to="/code" onClick={closeSidebar} style={navStyles.navLink}>
            💻 Code Lessons
          </Link>
        </nav>

        {sidebarOpen && <div style={navStyles.backdrop} onClick={closeSidebar} />}

        <main style={navStyles.mainContent}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/play" element={<MultiplayerGame />} />
            <Route path="/learn" element={<LearnHub />} />
            <Route path="/code" element={<CodeLessons />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

const navStyles = {
  navbar: { display: 'flex', alignItems: 'center', padding: '12px 20px', backgroundColor: '#1a1a1a', borderBottom: '1px solid #333', position: 'sticky', top: 0, zIndex: 100 },
  menuToggle: { background: 'none', border: 'none', color: '#fff', fontSize: '18px', cursor: 'pointer', marginRight: '15px' },
  brand: { fontSize: '18px', fontWeight: 'bold', color: '#ffcc00' },
  sidebar: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '260px',
    height: '100%',
    backgroundColor: '#1e1e1e',
    borderRight: '1px solid #333',
    display: 'flex',
    flexDirection: 'column',
    padding: '20px',
    gap: '10px',
    zIndex: 1000,
    transition: 'transform 0.3s ease-in-out',
    boxSizing: 'border-box'
  },
  sidebarHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '16px', fontWeight: 'bold', borderBottom: '1px solid #333', paddingBottom: '10px', marginBottom: '10px', color: '#ffcc00' },
  closeBtn: { background: 'none', border: 'none', color: '#fff', fontSize: '18px', cursor: 'pointer' },
  navLink: { padding: '10px 14px', borderRadius: '6px', color: '#fff', textDecoration: 'none', fontSize: '15px', backgroundColor: '#2b5c8f', display: 'block' },
  backdrop: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 999 },
  mainContent: { padding: '20px' }
};
