const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();

// Enable CORS for all origins
app.use(cors());

const server = http.createServer(app);

// Configure Socket.io with permissive CORS options for debugging and deployment
const io = new Server(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"]
  }
});

// Health Check Endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'Multiplayer Real-time Server' });
});

// In-Memory Database for active rooms and game states
const rooms = {};

io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);

  socket.on('join-room', ({ roomCode, playerName, timeControl }) => {
    if (!rooms[roomCode]) {
      let whiteTime = null;
      let blackTime = null;
      let increment = 0;

      if (timeControl && timeControl.type === 'timed') {
        whiteTime = timeControl.minutes * 60;
        blackTime = timeControl.minutes * 60;
        increment = timeControl.increment || 0;
      }

      rooms[roomCode] = {
        players: [],
        pgn: '',
        history: [],
        chat: [],
        timeControl: timeControl || { type: 'untimed' },
        whiteTime,
        blackTime,
        increment,
        timerActive: false,
        lastMoveTimestamp: null
      };
    }

    const room = rooms[roomCode];
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
      player.id = socket.id;
    }

    socket.join(roomCode);

    io.to(roomCode).emit('room-update', {
      room: roomCode,
      players: room.players,
      pgn: room.pgn,
      history: room.history,
      chat: room.chat,
      timeControl: room.timeControl,
      whiteTime: room.whiteTime,
      blackTime: room.blackTime
    });
  });

  socket.on('make-move', ({ roomCode, pgn, history, move, whiteTime, blackTime }) => {
    if (rooms[roomCode]) {
      rooms[roomCode].pgn = pgn;
      rooms[roomCode].history = history;
      if (whiteTime !== undefined) rooms[roomCode].whiteTime = whiteTime;
      if (blackTime !== undefined) rooms[roomCode].blackTime = blackTime;

      socket.to(roomCode).emit('opponent-moved', { pgn, history, move, whiteTime, blackTime });
    }
  });

  socket.on('time-expired', ({ roomCode, color }) => {
    if (rooms[roomCode]) {
      io.to(roomCode).emit('time-expired', { color });
    }
  });

  socket.on('send-chat', ({ roomCode, playerName, message }) => {
    if (rooms[roomCode]) {
      const chatMsg = {
        playerName,
        message,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      rooms[roomCode].chat.push(chatMsg);
      if (rooms[roomCode].chat.length > 50) {
        rooms[roomCode].chat.shift();
      }
      io.to(roomCode).emit('chat-message', chatMsg);
    }
  });

  socket.on('reset-game', ({ roomCode }) => {
    if (rooms[roomCode]) {
      rooms[roomCode].pgn = '';
      rooms[roomCode].history = [];
      rooms[roomCode].chat = [];
      if (rooms[roomCode].timeControl && rooms[roomCode].timeControl.type === 'timed') {
        rooms[roomCode].whiteTime = rooms[roomCode].timeControl.minutes * 60;
        rooms[roomCode].blackTime = rooms[roomCode].timeControl.minutes * 60;
      }
      io.to(roomCode).emit('game-reset', {
        whiteTime: rooms[roomCode].whiteTime,
        blackTime: rooms[roomCode].blackTime
      });
    }
  });

  socket.on('resign', ({ roomCode, player }) => {
    if (rooms[roomCode]) {
      socket.to(roomCode).emit('resign', { player });
    }
  });

  socket.on('offer-draw', ({ roomCode, player }) => {
    if (rooms[roomCode]) {
      socket.to(roomCode).emit('offer-draw', { player });
    }
  });

  socket.on('accept-draw', ({ roomCode }) => {
    if (rooms[roomCode]) {
      socket.to(roomCode).emit('draw-accepted');
    }
  });

  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`);
    for (const roomCode in rooms) {
      const room = rooms[roomCode];
      const playerIndex = room.players.findIndex(p => p.id === socket.id);

      if (playerIndex !== -1) {
        io.to(roomCode).emit('player-disconnected', {
          disconnectedPlayer: room.players[playerIndex].name
        });
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Chess server running on port ${PORT}`);
});
