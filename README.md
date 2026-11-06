# ♟️ Real-Time Multiplayer Chess Application

A responsive, real-time 2-player web application for playing and recording chess matches. Built with **React**, **Node.js**, **Socket.io**, and **chess.js**. Features custom native grid rendering, room-based multiplayer matching, dynamic board flipping, full move notation tracking, resilient game state reconnection, in-game chat, captured pieces display, game review mode, draw/resignation handlers, and custom pawn promotions.

---

## ✨ Features

* **Real-Time Multiplayer:** Instant move synchronization between two remote players powered by WebSockets (`Socket.io`).
* **Room Lobby & Instant Invites:** Create custom game rooms, share direct URL invite links (`?room=ROOM_CODE`), or manually enter room codes.
* **Resilient Game State Reconnection:** Backend server retains active match position and history in memory. If a player refreshes, loses network connection, or drops out, rejoining the room restores the exact match state.
* **Native Custom 8x8 Grid:** Built using native CSS Grid for optimized responsive rendering across desktop, tablet, and mobile browsers.
* **Dual Input Support:** Seamlessly switch between **Click-to-Move** and **Drag-and-Drop** piece controls.
* **Dynamic Board Flip:** Toggle board orientation manually or auto-orient based on assigned piece color (White/Black).
* **Live Move History & PGN Export:** Displays real-time move notation (SAN pairs) with one-click **Copy Notation** and **Copy PGN** functionality.
* **In-Game Chat:** Real-time messaging between players in the same room with timestamps.
* **Captured Pieces & Material Display:** Shows captured pieces and material advantage/difference for both players in real time.
* **Game Review Mode:** Step backward and forward through match history upon game completion with interactive move highlighting.
* **Draw & Resignation:** Send/accept draw offers or resign gracefully with winner notifications.
* **Custom Pawn Promotion:** Choose between Queen, Rook, Bishop, or Knight upon pawn promotion.
* **Game Rules & Validation:** Full check, checkmate, stalemate, draw detection, and legal move dot hints via `chess.js`.

---

## 🛠️ Tech Stack

* **Frontend:** React (Vite / CRA), CSS Grid, `chess.js`, `socket.io-client`
* **Backend:** Node.js, Express, `Socket.io`, CORS
* **Deployment:** Cloud-ready (Render)

---

## 📁 Project Structure

```text
CHESS/
├── chess-recorder/           # Frontend React + Vite Application
│   ├── public/              # Static assets
│   ├── src/
│   │   ├── assets/          # Images and styles
│   │   ├── App.jsx          # Main React chess application & native board
│   │   └── main.jsx         # React application entry point
│   ├── eslint.config.js     # ESLint configuration
│   ├── index.html           # Main HTML template
│   ├── package.json         # Frontend dependencies & scripts
│   ├── vite.config.js       # Vite bundler configuration
│   └── README.md            # Project documentation
│
└── Recorder/                 # Backend Node.js Server
    ├── node_modules/        # Server dependencies
    ├── recorder.html        # Auxiliary/testing interface
    ├── server.js            # Express & Socket.io server logic
    └── package.json         # Backend dependencies & scripts
```

Web- Learn Branch Expectaion:

To integrate the YouTube tutorials and interactive practice mode without touching or altering your existing multiplayer logic, you can use a top-level tab bar navigation system.
This keeps your current multiplayer room feature 100% intact as its own dedicated section, while adding a separate space for learning and practicing.
1. UI Architecture & Screen Flow
Add a persistent navigation bar (or drawer) at the top of your layout:
┌─────────────────────────────────────────────────────────────┐
│ ⚔️ Play Online  │  🎓 Learn & Practice  │  💻 Code Lessons │
└─────────────────────────────────────────────────────────────┘


Tab 1: ⚔️ Play Online (Current App)
Exactly what you have right now on chess-qct9.onrender.com: Name input, timer templates (3m+5s, 10m, No Timer), alert on check, room code creation, and real-time Socket.io board.
Tab 2: 🎓 Learn & Practice (YouTube + Interactive Board)
A dedicated hub for your viewers to watch videos and practice chess concepts.
Tab 3: 💻 Code Lessons (Programming Track)
Code-along challenges, GitHub branch links, and micro-quizzes for viewers building the app.
2. Layout of the "Learn & Practice" Tab
When a user clicks on "🎓 Learn & Practice", display a split-screen or stacked layout:
┌─────────────────────────────────────────────────────────────┐
│                    LEARN & PRACTICE HUB                     │
├─────────────────────────────────────────────────────────────┤
│  Select Episode:                                            │
│  [ Ep 01: Coordinates ] [ Ep 02: Pawns ] [ Ep 03: Rooks  ▼ ] │
├──────────────────────────────┬──────────────────────────────┤
│  YOUTUBE VIDEO PLAYER        │  INTERACTIVE PRACTICE BOARD  │
│  ┌────────────────────────┐  │  ┌────────────────────────┐  │
│  │                        │  │  │ 8  .  .  .  .  .  .  . │  │
│  │  Embedded YouTube      │  │  │ 7  .  .  .  .  .  .  . │  │
│  │  Player (Episode 03)   │  │  │ 6  .  .  .  .  .  .  . │  │
│  │                        │  │  │ 5  .  .  . R  .  .  * │  │
│  └────────────────────────┘  │  └────────────────────────┘  │
│  Task: "Watch how the     │  Challenge: "Move your Rook  │
│  Rook moves along rows!"   │  to capture the star at h5!" │
└──────────────────────────────┴──────────────────────────────┘


How it works:
Embedded YouTube Iframe: Embed the specific YouTube video for that episode directly using react-youtube or a standard <iframe>.
Local Interactive Board: Reuse your existing board component, but pass custom initial piece coordinates (e.g., just a single White Rook and a target marker).
Validation Engine: When the user moves the piece on the practice board, your custom rule function checks if the move solves the challenge. If correct, play a success animation!
3. Code Implementation Structure (Zero Touch to Multiplayer)
Keep your app clean by separating your routes/views cleanly with simple state or React Router:
// App.jsx
import React, { useState } from 'react';
import MultiplayerGame from './components/MultiplayerGame'; // Your CURRENT App code
import LearnHub from './components/LearnHub';               // NEW YouTube & Practice Component

export default function App() {
  const [activeTab, setActiveTab] = useState('play'); // 'play' or 'learn'

  return (
    <div className="app-container">
      {/* Top Bar Navigation */}
      <header className="navbar">
        <button 
          className={activeTab === 'play' ? 'active' : ''} 
          onClick={() => setActiveTab('play')}
        >
          ⚔️ Play Online
        </button>
        <button 
          className={activeTab === 'learn' ? 'active' : ''} 
          onClick={() => setActiveTab('learn')}
        >
          🎓 Learn & Practice
        </button>
      </header>

      {/* View Switcher */}
      <main>
        {activeTab === 'play' && <MultiplayerGame />}
        {activeTab === 'learn' && <LearnHub />}
      </main>
    </div>
  );
}


4. How the Practice Data Configuration Looks
Create a simple configuration file (episodesData.js) so adding new episodes later takes seconds:
export const EPISODES = [
  {
    id: "ep-03",
    title: "Episode 03: The Mighty Rook",
    youtubeId: "YOUR_YOUTUBE_VIDEO_ID_HERE",
    taskDescription: "Practice Rook Movement: Move your Rook to (h5) to capture the target!",
    initialBoard: [
      { piece: 'R', row: 3, col: 4 }, // Rook on e5
      { piece: 'target', row: 3, col: 7 } // Star target on h5
    ],
    targetSquare: { row: 3, col: 7 }
  }
];


Benefits of this Approach
Zero Risk to Production: Your socket-based room creation, check alerts, and timers remain untouched in <MultiplayerGame/>.
Instant Feedback: Viewers watch your YouTube video on the left side of the screen and test what they learned on the right side immediately.
Easy Maintenance: Adding a new YouTube video only requires adding one entry to your episodesData.js array!
