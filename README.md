# ♟️ Real-Time Multiplayer Chess Application

A responsive, real-time 2-player web application for playing and recording chess matches. Built with **React**, **Node.js**, **Socket.io**, and **chess.js**. Features custom native grid rendering, room-based multiplayer matching, dynamic board flipping, full move notation tracking, and resilient game state reconnection.

---

## ✨ Features

* **Real-Time Multiplayer:** Instant move synchronization between two remote players powered by WebSockets (`Socket.io`).
* **Room Lobby & Instant Invites:** Create custom game rooms, share direct URL invite links (`?room=ROOM_CODE`), or manually enter room codes.
* **Resilient Game State Reconnection:** Backend server retains active match position and history in memory. If a player refreshes, loses network connection, or drops out, rejoining the room restores the exact match state.
* **Native Custom 8x8 Grid:** Built using native CSS Grid for optimized responsive rendering across desktop, tablet, and mobile browsers.
* **Dual Input Support:** Seamlessly switch between **Click-to-Move** and **Drag-and-Drop** piece controls.
* **Dynamic Board Flip:** Toggle board orientation manually or auto-orient based on assigned piece color (White/Black).
* **Live Move History & PGN Export:** Displays real-time move notation (SAN pairs) with one-click **Copy Notation** and **Copy PGN** functionality.
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