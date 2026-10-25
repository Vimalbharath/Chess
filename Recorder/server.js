const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();

// Enable CORS for production (replace with your frontend domain if hosted, or keep flexible for testing)
app.use(cors());

const server = http.createServer(app);

// Configure Socket.io with production-safe CORS options
const io = new Server(server, {
  cors: {
    origin: "https://chess-qct9.onrender.com", // Change to your frontend domain in production, e.g., "https://my-chess-app.vercel.app"
    methods: ["GET", "POST"]
  }
});

// In-Memory Database for active rooms and game states
const rooms = {};

io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);

  socket.on('join-room', ({ roomCode, playerName }) => {
    if (!rooms[roomCode]) {
      // Initialize fresh room state
      rooms[roomCode] = {
        players: [],
        fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', // Starting position
        history: []
      };
    }

    const room = rooms[roomCode];

    // Check if player is reconnecting with same name or assigning color
    let player = room.players.find(p => p.name === playerName);

    if (!player) {
      if (room.players.length >= 2) {
        socket.emit('room-full');
        return;
      }
      const color = room.players.length === 0 ? 'w' : 'b';
      player = { id: socket.id, name: playerName || `Player ${color === 'w' ? '1' : '2'}`, color };
      room.players.push(player);
    } else {
      // Reconnecting player: update socket ID
      player.id = socket.id;
    }

    socket.join(roomCode);

    // Sync room state and latest board/history to the joining/reconnecting player
    io.to(roomCode).emit('room-update', {
      room: roomCode,
      players: room.players,
      fen: room.fen,
      history: room.history
    });
  });

  socket.on('make-move', ({ roomCode, fen, history, move }) => {
    if (rooms[roomCode]) {
      // Save move to backend state
      rooms[roomCode].fen = fen;
      rooms[roomCode].history = history;

      // Broadcast move to opponent
      socket.to(roomCode).emit('opponent-moved', { fen, history, move });
    }
  });

  socket.on('reset-game', ({ roomCode }) => {
    if (rooms[roomCode]) {
      rooms[roomCode].fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
      rooms[roomCode].history = [];
      io.to(roomCode).emit('game-reset');
    }
  });

  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`);
    for (const roomCode in rooms) {
      const room = rooms[roomCode];
      const playerIndex = room.players.findIndex(p => p.id === socket.id);

      if (playerIndex !== -1) {
        // Keep room alive for 5 minutes to allow player reconnection
        io.to(roomCode).emit('player-disconnected', {
          disconnectedPlayer: room.players[playerIndex].name
        });

        // Optional: Clean up room only if empty for a long period
        setTimeout(() => {
          if (rooms[roomCode] && rooms[roomCode].players.every(p => p.id !== socket.id)) {
            // Clean up offline player or empty room if needed
          }
        }, 300000); // 5 minutes grace period
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Chess server with reconnection support running on port ${PORT}`);
});