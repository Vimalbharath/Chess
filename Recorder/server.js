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

// Track active rooms and player names
const rooms = {};

io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);

  socket.on('join-room', ({ roomCode, playerName }) => {
    if (!rooms[roomCode]) {
      rooms[roomCode] = { players: [] };
    }

    const room = rooms[roomCode];

    // Check if player is already in this room
    const existingPlayer = room.players.find(p => p.id === socket.id);
    if (!existingPlayer) {
      if (room.players.length >= 2) {
        socket.emit('room-full');
        return;
      }

      const color = room.players.length === 0 ? 'w' : 'b';
      room.players.push({ 
        id: socket.id, 
        name: playerName || `Player ${color === 'w' ? '1' : '2'}`, 
        color 
      });
    }

    socket.join(roomCode);

    // Send room state to everyone in the room
    io.to(roomCode).emit('room-update', { room: roomCode, players: room.players });
  });

  socket.on('make-move', ({ roomCode, fen, history }) => {
    socket.to(roomCode).emit('opponent-moved', { fen, history });
  });

  socket.on('reset-game', ({ roomCode }) => {
    io.to(roomCode).emit('game-reset');
  });

  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`);
    for (const roomCode in rooms) {
      rooms[roomCode].players = rooms[roomCode].players.filter(p => p.id !== socket.id);
      io.to(roomCode).emit('room-update', { players: rooms[roomCode].players });
      if (rooms[roomCode].players.length === 0) {
        delete rooms[roomCode];
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Chess multiplayer server running on port ${PORT}`);
});