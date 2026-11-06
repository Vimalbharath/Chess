import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import MultiplayerGame from './components/MultiplayerGame';
import LearnHub from './components/LearnHub';


export default function App() {
    return (
        <Router>
            <div className="app-container">
                <nav className="navbar">
                    <Link to="/" className="nav-btn">⚔️ Play Online</Link>
                    <Link to="/learn" className="nav-btn">🎓 Learn & Practice</Link>
                </nav>

                <main className="content-area">
                    <Routes>
                        <Route path="/" element={<MultiplayerGame />} />
                        <Route path="/learn" element={<LearnHub />} />
                    </Routes>
                </main>
            </div>
        </Router>
    );
}