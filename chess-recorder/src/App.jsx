import React, { useState, useRef, useEffect } from 'react';
import { Chess } from 'chess.js';
import { io } from 'socket.io-client';

const SOCKET_URL = 'https://chess-server-c5fk.onrender.com';
const socket = io(SOCKET_URL);

const pieceSymbols = {
  w: { p: '♙', n: '♘', b: '♗', r: '♖', q: '♕', k: '♔' },
  b: { p: '♟', n: '♞', b: '♝', r: '♜', q: '♛', k: '♚' }
};

const pieceValues = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

export default function MultiplayerChessApp() {
  const chessGameRef = useRef(new Chess());
  const chessGame = chessGameRef.current;

  // Lobby & Player State
  const [inLobby, setInLobby] = useState(true);
  const [playerName, setPlayerName] = useState('');
  const [roomInput, setRoomInput] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [playerColor, setPlayerColor] = useState(null);
  const [playersList, setPlayersList] = useState([]);
  const [toastMessage, setToastMessage] = useState('');

  // Timer Configuration (Lobby)
  const [timerType, setTimerType] = useState('timed'); // 'timed' or 'untimed'
  const [selectedMinutes, setSelectedMinutes] = useState(10);
  const [selectedIncrement, setSelectedIncrement] = useState(0);

  // Clocks State
  const [timeControl, setTimeControl] = useState({ type: 'untimed' });
  const [whiteTime, setWhiteTime] = useState(null);
  const [blackTime, setBlackTime] = useState(null);

  // Gameplay Settings
  const [maxIllegalMoves, setMaxIllegalMoves] = useState(3);
  const [illegalCount, setIllegalCount] = useState(0);
  const [alertOnCheck, setAlertOnCheck] = useState(true);
  const [showNextValidMove, setShowNextValidMove] = useState(false);

  // Chat State
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');

  // Board Sizing & Orientation
  const [isFlipped, setIsFlipped] = useState(false);

  // Board & Game State
  const [moveHistory, setMoveHistory] = useState([]);
  const [statusText, setStatusText] = useState("Waiting for opponent to join...");
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [legalMoves, setLegalMoves] = useState([]);
  const [inputMode, setInputMode] = useState('click');
  const [showHints, setShowHints] = useState(true);
  const [showCheckHighlight, setShowCheckHighlight] = useState(true);
  const [showLastMove, setShowLastMove] = useState(true);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewIndex, setReviewIndex] = useState(-1);
  const [pendingPromotion, setPendingPromotion] = useState(null);
  const [drawOffered, setDrawOffered] = useState(false);
  const [, setRefreshKey] = useState(0);

  // Auto-fill room code from URL query parameter
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      setRoomInput(roomParam.toUpperCase());
    }
  }, []);

  // --- Clock Interval Timer ---
  useEffect(() => {
    if (inLobby || isGameOver || isReviewing || timeControl.type !== 'timed') return;
    if (playersList.length < 2) return;

    const interval = setInterval(() => {
      const turn = chessGame.turn();
      if (turn === 'w') {
        setWhiteTime(prev => {
          if (prev === null) return null;
          if (prev <= 1) {
            clearInterval(interval);
            handleTimeExpiration('w');
            return 0;
          }
          return prev - 1;
        });
      } else {
        setBlackTime(prev => {
          if (prev === null) return null;
          if (prev <= 1) {
            clearInterval(interval);
            handleTimeExpiration('b');
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [inLobby, isGameOver, isReviewing, timeControl, chessGame, playersList]);

  const handleTimeExpiration = (color) => {
    const winner = color === 'w' ? 'Black' : 'White';
    setIsGameOver(true);
    setStatusText(`⏰ Time out! ${winner} wins on time.`);
    socket.emit('time-expired', { roomCode, color });
  };

  // --- Socket.io Handlers ---
  useEffect(() => {
    socket.on('room-update', ({ room, players, pgn, history, chat, timeControl: tc, whiteTime: wt, blackTime: bt }) => {
      if (room) setRoomCode(room);
      setPlayersList(players || []);

      const me = players?.find(p => p.id === socket.id);
      if (me) {
        setPlayerColor(me.color);
        if (me.color === 'b') setIsFlipped(true);
      }

      if (tc) setTimeControl(tc);
      if (wt !== undefined) setWhiteTime(wt);
      if (bt !== undefined) setBlackTime(bt);

      if (pgn) {
        chessGame.loadPgn(pgn);
      } else {
        chessGame.reset();
      }

      if (history && Array.isArray(history)) {
        setMoveHistory(history);
      }

      if (chat && Array.isArray(chat)) {
        setChatMessages(chat);
      }

      setInLobby(false);
      setIsReviewing(false);
      setReviewIndex(-1);
      setRefreshKey(prev => prev + 1);

      if (players && players.length < 2) {
        setStatusText(`Waiting for opponent to join room: ${room}...`);
      } else {
        const moveColor = chessGame.turn() === 'w' ? 'White' : 'Black';
        setStatusText(`Game in progress. ${moveColor}'s turn to move.`);
      }
    });

    socket.on('opponent-moved', ({ pgn, history, whiteTime: wt, blackTime: bt }) => {
      if (pgn) chessGame.loadPgn(pgn);
      setMoveHistory(history || []);
      if (wt !== undefined) setWhiteTime(wt);
      if (bt !== undefined) setBlackTime(bt);
      setIsReviewing(false);
      setReviewIndex(-1);
      setRefreshKey(prev => prev + 1);
      checkGameStatus();
    });

    socket.on('time-expired', ({ color }) => {
      const winner = color === 'w' ? 'Black' : 'White';
      setIsGameOver(true);
      setStatusText(`⏰ Time out! ${winner} wins on time.`);
    });

    socket.on('chat-message', (msg) => {
      setChatMessages(prev => [...prev, msg]);
    });

    socket.on('player-disconnected', ({ disconnectedPlayer }) => {
      showToast(`⚠️ ${disconnectedPlayer || 'Opponent'} disconnected! Game state is saved for reconnection.`);
    });

    socket.on('game-reset', ({ whiteTime: wt, blackTime: bt }) => {
      chessGame.reset();
      setSelectedSquare(null);
      setLegalMoves([]);
      setIsGameOver(false);
      setIsReviewing(false);
      setReviewIndex(-1);
      setMoveHistory([]);
      setChatMessages([]);
      setDrawOffered(false);
      setIllegalCount(0);
      if (wt !== undefined) setWhiteTime(wt);
      if (bt !== undefined) setBlackTime(bt);
      setRefreshKey(prev => prev + 1);
      setStatusText("Game reset. White's turn.");
    });

    socket.on('resign', ({ player }) => {
      setIsGameOver(true);
      setStatusText(`🏳️ ${player} resigned. Game Over!`);
    });

    socket.on('offer-draw', ({ player }) => {
      setDrawOffered(true);
      showToast(`🤝 ${player} offered a draw!`);
    });

    socket.on('draw-accepted', () => {
      setIsGameOver(true);
      setStatusText(`🤝 Draw agreed by mutual consent.`);
    });

    socket.on('room-full', () => {
      alert('This room is already full!');
    });

    return () => {
      socket.off('room-update');
      socket.off('player-disconnected');
      socket.off('room-full');
      socket.off('opponent-moved');
      socket.off('time-expired');
      socket.off('chat-message');
      socket.off('game-reset');
      socket.off('resign');
      socket.off('offer-draw');
      socket.off('draw-accepted');
    };
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 2500);
  };

  const getKingSquare = (color) => {
    const board = chessGame.board();
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (piece && piece.type === 'k' && piece.color === color) {
          const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
          const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];
          return `${files[c]}${ranks[r]}`;
        }
      }
    }
    return null;
  };

  const getCapturedPieces = () => {
    const initialCounts = { p: 8, n: 2, b: 2, r: 2, q: 1 };
    const currentCounts = { w: { p: 0, n: 0, b: 0, r: 0, q: 0 }, b: { p: 0, n: 0, b: 0, r: 0, q: 0 } };

    const board = chessGame.board();
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (piece && piece.type !== 'k') {
          currentCounts[piece.color][piece.type]++;
        }
      }
    }

    const capturedByWhite = [];
    const capturedByBlack = [];

    ['q', 'r', 'b', 'n', 'p'].forEach(type => {
      const whiteLost = initialCounts[type] - currentCounts['w'][type];
      for (let i = 0; i < whiteLost; i++) capturedByBlack.push(pieceSymbols['w'][type]);

      const blackLost = initialCounts[type] - currentCounts['b'][type];
      for (let i = 0; i < blackLost; i++) capturedByWhite.push(pieceSymbols['b'][type]);
    });

    let whiteScore = 0;
    let blackScore = 0;
    Object.keys(currentCounts.w).forEach(type => {
      whiteScore += currentCounts.w[type] * pieceValues[type];
      blackScore += currentCounts.b[type] * pieceValues[type];
    });

    const diff = whiteScore - blackScore;

    return {
      capturedByWhite,
      capturedByBlack,
      whiteAdvantage: diff > 0 ? `+${diff}` : '',
      blackAdvantage: diff < 0 ? `+${Math.abs(diff)}` : ''
    };
  };

  const checkGameStatus = () => {
    if (chessGame.isGameOver()) {
      setIsGameOver(true);
      if (chessGame.isCheckmate()) {
        const winner = chessGame.turn() === 'w' ? 'Black' : 'White';
        setStatusText(`🎉 Checkmate! ${winner} wins the game!`);
      } else if (chessGame.isDraw()) {
        setStatusText(`🤝 Game Drawn!`);
      } else {
        setStatusText(`🏁 Game Over.`);
      }
      return;
    }

    setIsGameOver(false);
    const moveColor = chessGame.turn() === 'w' ? 'White' : 'Black';
    let status = `${moveColor}'s turn to move.`;
    if (chessGame.inCheck()) {
      status += ` (${moveColor} is in CHECK!)`;
      if (alertOnCheck && playerColor && chessGame.turn() === playerColor) {
        showToast(`🚨 ALERT: You are in CHECK!`);
      }
    }
    setStatusText(status);
  };

  const executeMove = (from, to, promotionPiece = 'q') => {
    if (isGameOver || isReviewing) return false;

    if (playersList.length < 2) {
      showToast("Waiting for an opponent to join before making moves!");
      return false;
    }

    if (playerColor && chessGame.turn() !== playerColor) {
      showToast("Not your turn!");
      return false;
    }

    const piece = chessGame.get(from);
    if (piece && piece.type === 'p' && ((piece.color === 'w' && to[1] === '8') || (piece.color === 'b' && to[1] === '1'))) {
      if (!pendingPromotion) {
        setPendingPromotion({ from, to });
        return false;
      }
    }

    try {
      const move = chessGame.move({ from, to, promotion: promotionPiece });
      if (move) {
        setSelectedSquare(null);
        setLegalMoves([]);
        setPendingPromotion(null);

        let updatedWhiteTime = whiteTime;
        let updatedBlackTime = blackTime;
        if (timeControl.type === 'timed') {
          const inc = timeControl.increment || 0;
          if (chessGame.turn() === 'b') {
            if (updatedWhiteTime !== null) updatedWhiteTime += inc;
          } else {
            if (updatedBlackTime !== null) updatedBlackTime += inc;
          }
          setWhiteTime(updatedWhiteTime);
          setBlackTime(updatedBlackTime);
        }

        const currentPgn = chessGame.pgn();
        const fullHistory = chessGame.history({ verbose: true });

        setMoveHistory(fullHistory);
        setRefreshKey(prev => prev + 1);
        checkGameStatus();

        socket.emit('make-move', {
          roomCode,
          pgn: currentPgn,
          history: fullHistory,
          move,
          whiteTime: updatedWhiteTime,
          blackTime: updatedBlackTime
        });
        return true;
      }
    } catch {
      const nextIllegal = illegalCount + 1;
      setIllegalCount(nextIllegal);
      if (nextIllegal >= maxIllegalMoves) {
        setIsGameOver(true);
        const winner = chessGame.turn() === 'w' ? 'Black' : 'White';
        setStatusText(`❌ Max illegal moves exceeded! ${winner} wins by default.`);
      } else {
        showToast(`⚠️ Illegal move! (${nextIllegal}/${maxIllegalMoves} allowed)`);
      }
    }
    return false;
  };

  const handlePromotionSelect = (promoPiece) => {
    if (!pendingPromotion) return;
    executeMove(pendingPromotion.from, pendingPromotion.to, promoPiece);
  };

  const handleSquareClick = (squareCoord) => {
    if (inputMode !== 'click' || isGameOver || isReviewing) return;

    if (!selectedSquare) {
      const piece = chessGame.get(squareCoord);
      if (piece && piece.color === chessGame.turn()) {
        setSelectedSquare(squareCoord);
        if (showHints) {
          const moves = chessGame.moves({ square: squareCoord, verbose: true });
          setLegalMoves(moves.map(m => m.to));
        }
      }
      return;
    }

    if (selectedSquare === squareCoord) {
      setSelectedSquare(null);
      setLegalMoves([]);
      return;
    }

    const piece = chessGame.get(selectedSquare);
    const isPromo = piece && piece.type === 'p' && ((piece.color === 'w' && squareCoord[1] === '8') || (piece.color === 'b' && squareCoord[1] === '1'));
    if (isPromo) {
      const moves = chessGame.moves({ square: selectedSquare, verbose: true });
      const isValid = moves.some(m => m.to === squareCoord);
      if (isValid) {
        setPendingPromotion({ from: selectedSquare, to: squareCoord });
        return;
      }
    }

    const success = executeMove(selectedSquare, squareCoord);
    if (!success && !pendingPromotion) {
      const piece = chessGame.get(squareCoord);
      if (piece && piece.color === chessGame.turn()) {
        setSelectedSquare(squareCoord);
        if (showHints) {
          const moves = chessGame.moves({ square: squareCoord, verbose: true });
          setLegalMoves(moves.map(m => m.to));
        } else {
          setLegalMoves([]);
        }
      } else {
        setSelectedSquare(null);
        setLegalMoves([]);
      }
    }
  };

  const handleDragStart = (e, squareCoord) => {
    if (isGameOver || isReviewing || inputMode !== 'drag') {
      e.preventDefault();
      return;
    }
    const piece = chessGame.get(squareCoord);
    if (!piece || piece.color !== chessGame.turn()) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData('text/plain', squareCoord);
    setSelectedSquare(squareCoord);
    if (showHints) {
      const moves = chessGame.moves({ square: squareCoord, verbose: true });
      setLegalMoves(moves.map(m => m.to));
    }
  };

  const handleDragOver = (e) => {
    if (inputMode === 'drag' && !isGameOver && !isReviewing) {
      e.preventDefault();
    }
  };

  const handleDrop = (e, targetSquare) => {
    if (inputMode !== 'drag' || isGameOver || isReviewing) return;
    e.preventDefault();
    const sourceSquare = e.dataTransfer.getData('text/plain');
    if (sourceSquare && targetSquare) {
      const piece = chessGame.get(sourceSquare);
      const isPromo = piece && piece.type === 'p' && ((piece.color === 'w' && targetSquare[1] === '8') || (piece.color === 'b' && targetSquare[1] === '1'));
      if (isPromo) {
        setPendingPromotion({ from: sourceSquare, to: targetSquare });
        return;
      }
      executeMove(sourceSquare, targetSquare);
    }
  };

  const handleResign = () => {
    if (window.confirm('Are you sure you want to resign?')) {
      const me = playersList.find(p => p.id === socket.id);
      const playerNameFormatted = me ? me.name : 'Player';
      socket.emit('resign', { roomCode, player: playerNameFormatted });
      setIsGameOver(true);
      setStatusText(`🏳️ You resigned. Game Over!`);
    }
  };

  const handleOfferDraw = () => {
    const me = playersList.find(p => p.id === socket.id);
    const playerNameFormatted = me ? me.name : 'Player';
    socket.emit('offer-draw', { roomCode, player: playerNameFormatted });
    showToast('🤝 Draw offered to opponent.');
  };

  const handleAcceptDraw = () => {
    socket.emit('accept-draw', { roomCode });
    setIsGameOver(true);
    setStatusText(`🤝 Draw agreed by mutual consent.`);
    setDrawOffered(false);
  };

  const handleReset = () => {
    if (window.confirm('Reset board for both players?')) {
      socket.emit('reset-game', { roomCode });
    }
  };

  const startReview = () => {
    setIsReviewing(true);
    setReviewIndex(moveHistory.length - 1);
    updateReviewBoard(moveHistory.length - 1);
  };

  const updateReviewBoard = (idx) => {
    chessGame.reset();
    for (let i = 0; i <= idx; i++) {
      if (moveHistory[i]) {
        chessGame.move(moveHistory[i]);
      }
    }
    setRefreshKey(prev => prev + 1);
  };

  const goToReviewStep = (idx) => {
    setReviewIndex(idx);
    updateReviewBoard(idx);
  };

  const exitReview = () => {
    setIsReviewing(false);
    chessGame.reset();
    moveHistory.forEach(m => chessGame.move(m));
    setRefreshKey(prev => prev + 1);
  };

  const copyInviteLink = () => {
    const inviteUrl = `${window.location.origin}${window.location.pathname}?room=${roomCode}`;
    navigator.clipboard.writeText(inviteUrl).then(() => {
      showToast('📋 Invite link copied to clipboard!');
    });
  };

  const createRoom = () => {
    const name = playerName.trim() || 'Player 1';
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const tc = timerType === 'timed'
      ? { type: 'timed', minutes: Number(selectedMinutes), increment: Number(selectedIncrement) }
      : { type: 'untimed' };
    socket.emit('join-room', { roomCode: code, playerName: name, timeControl: tc });
  };

  const joinRoom = (e) => {
    e.preventDefault();
    if (!roomInput.trim()) return;
    const name = playerName.trim() || 'Player 2';
    socket.emit('join-room', { roomCode: roomInput.trim().toUpperCase(), playerName: name });
  };

  const sendChat = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    socket.emit('send-chat', {
      roomCode,
      playerName: playerName || 'Player',
      message: chatInput.trim()
    });
    setChatInput('');
  };

  const formatFullNotation = () => {
    if (!moveHistory || moveHistory.length === 0) return '1. ';

    let text = '';
    for (let i = 0; i < moveHistory.length; i += 2) {
      const moveNum = Math.floor(i / 2) + 1;
      const wMove = moveHistory[i] ? moveHistory[i].san : '';
      const bMove = moveHistory[i + 1] ? moveHistory[i + 1].san : '';
      text += `${moveNum}. ${wMove} ${bMove}\n`;
    }
    return text.trim();
  };

  const formatTime = (seconds) => {
    if (seconds === null || seconds === undefined) return '--:--';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getNextValidMoveHint = () => {
    if (!showNextValidMove || isGameOver || isReviewing) return null;
    if (playerColor && chessGame.turn() !== playerColor) return null;
    const moves = chessGame.moves({ verbose: true });
    if (moves.length === 0) return null;
    const hint = moves[0];
    return `${hint.from.toUpperCase()} ➔ ${hint.to.toUpperCase()} (${hint.san})`;
  };

  const checkKingSquare = chessGame.inCheck() ? getKingSquare(chessGame.turn()) : null;
  const capturedInfo = getCapturedPieces();
  const lastMove = isReviewing && reviewIndex >= 0
    ? moveHistory[reviewIndex]
    : (moveHistory.length > 0 ? moveHistory[moveHistory.length - 1] : null);
  const nextMoveHintText = getNextValidMoveHint();

  // --- Render Lobby ---
  if (inLobby) {
    return (
      <div style={styles.lobbyContainer}>
        <div style={styles.lobbyCard}>
          <h1 style={{ marginBottom: '8px', fontSize: '22px' }}>Multiplayer Chess</h1>
          <p style={{ color: '#aaa', marginBottom: '15px', fontSize: '13px' }}>Set your name, timer rules, and preferences.</p>

          <div style={{ marginBottom: '12px', textAlign: 'left' }}>
            <label style={{ fontSize: '12px', color: '#888', display: 'block', marginBottom: '4px' }}>Your Name:</label>
            <input
              type="text"
              placeholder="e.g. Player 1"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              style={{ ...styles.input, width: '100%', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ marginBottom: '12px', textAlign: 'left', backgroundColor: '#161616', padding: '10px', borderRadius: '6px', border: '1px solid #333' }}>
            <label style={{ fontSize: '12px', color: '#ffcc00', display: 'block', marginBottom: '6px', fontWeight: 'bold' }}>⏱️ Timer & Templates:</label>
            <div style={{ display: 'flex', gap: '6px', marginBottom: '8px', flexWrap: 'wrap' }}>
              <button style={{ ...styles.templateBtn, backgroundColor: selectedMinutes === 3 && selectedIncrement === 5 ? '#2e7d32' : '#2b5c8f' }} onClick={() => { setTimerType('timed'); setSelectedMinutes(3); setSelectedIncrement(5); }}>3m + 5s</button>
              <button style={{ ...styles.templateBtn, backgroundColor: selectedMinutes === 10 && selectedIncrement === 0 ? '#2e7d32' : '#2b5c8f' }} onClick={() => { setTimerType('timed'); setSelectedMinutes(10); setSelectedIncrement(0); }}>10m (Rapid)</button>
              <button style={{ ...styles.templateBtn, backgroundColor: timerType === 'untimed' ? '#2e7d32' : '#333' }} onClick={() => setTimerType('untimed')}>No Timer</button>
            </div>

            {timerType === 'timed' && (
              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '11px', color: '#888', display: 'block' }}>Minutes:</label>
                  <input type="number" min="1" max="60" value={selectedMinutes} onChange={(e) => setSelectedMinutes(Number(e.target.value))} style={{ ...styles.input, width: '100%', boxSizing: 'border-box', padding: '6px' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '11px', color: '#888', display: 'block' }}>Inc (sec):</label>
                  <input type="number" min="0" max="60" value={selectedIncrement} onChange={(e) => setSelectedIncrement(Number(e.target.value))} style={{ ...styles.input, width: '100%', boxSizing: 'border-box', padding: '6px' }} />
                </div>
              </div>
            )}
          </div>

          <div style={{ marginBottom: '15px', textAlign: 'left', backgroundColor: '#161616', padding: '10px', borderRadius: '6px', border: '1px solid #333', fontSize: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', alignItems: 'center' }}>
              <span>Max Illegal Moves:</span>
              <select value={maxIllegalMoves} onChange={(e) => setMaxIllegalMoves(Number(e.target.value))} style={{ backgroundColor: '#121212', color: '#fff', border: '1px solid #444', padding: '4px', borderRadius: '4px' }}>
                <option value={1}>1</option>
                <option value={3}>3</option>
                <option value={5}>5</option>
                <option value={10}>10</option>
              </select>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', alignItems: 'center' }}>
              <span>Alert on Check:</span>
              <input type="checkbox" checked={alertOnCheck} onChange={(e) => setAlertOnCheck(e.target.checked)} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Show Next Valid Move:</span>
              <input type="checkbox" checked={showNextValidMove} onChange={(e) => setShowNextValidMove(e.target.checked)} />
            </div>
          </div>

          <button style={{ ...styles.button, width: '100%', padding: '12px', marginBottom: '15px', backgroundColor: '#2e7d32', fontSize: '15px' }} onClick={createRoom}>
            ➕ Create New Room
          </button>

          <div style={{ borderTop: '1px solid #333', paddingTop: '12px', textAlign: 'left' }}>
            <label style={{ fontSize: '12px', color: '#888', display: 'block', marginBottom: '5px' }}>Or Join Existing Room:</label>
            <form onSubmit={joinRoom} style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                placeholder="Room Code"
                value={roomInput}
                onChange={(e) => setRoomInput(e.target.value.toUpperCase())}
                style={styles.input}
              />
              <button type="submit" style={{ ...styles.button, backgroundColor: '#2b5c8f' }}>
                Join
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // --- Render Board Screen ---
  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];

  const displayRanks = isFlipped ? [...ranks].reverse() : ranks;
  const displayFiles = isFlipped ? [...files].reverse() : files;

  const boardSquares = [];
  displayRanks.forEach((rank, rIdx) => {
    displayFiles.forEach((file, fIdx) => {
      const squareName = `${file}${rank}`;
      const piece = chessGame.get(squareName);

      const actualFileIdx = files.indexOf(file);
      const actualRankIdx = ranks.indexOf(rank);
      const isDark = (actualRankIdx + actualFileIdx) % 2 === 1;

      const isSelected = selectedSquare === squareName;
      const isLegalTarget = legalMoves.includes(squareName);
      const isCaptureTarget = isLegalTarget && piece !== null;
      const isInCheckSquare = showCheckHighlight && checkKingSquare === squareName;
      const isLastMoveSquare = showLastMove && lastMove && (lastMove.from === squareName || lastMove.to === squareName);

      let bg = isDark ? '#b58863' : '#f0d9b5';
      if (isLastMoveSquare) bg = isDark ? '#b9ca41' : '#cdd26a';
      if (isSelected) bg = 'rgba(255, 255, 0, 0.65)';
      if (isInCheckSquare) bg = 'rgba(255, 0, 0, 0.75)';

      boardSquares.push(
        <div
          key={squareName}
          onClick={() => handleSquareClick(squareName)}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, squareName)}
          style={{
            ...styles.square,
            backgroundColor: bg,
            boxShadow: isInCheckSquare ? 'inset 0 0 10px 2px #ff0000' : 'none',
          }}
        >
          {fIdx === 0 && <span style={styles.rankLabel}>{rank}</span>}
          {rIdx === 7 && <span style={styles.fileLabel}>{file}</span>}

          {isLegalTarget && showHints && !isGameOver && !isReviewing && (
            <div
              style={{
                ...styles.hintDot,
                backgroundColor: isCaptureTarget ? 'rgba(255, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.35)',
              }}
            />
          )}

          {piece && (
            <div
              draggable={!isGameOver && !isReviewing && inputMode === 'drag' && piece.color === chessGame.turn()}
              onDragStart={(e) => handleDragStart(e, squareName)}
              style={{
                ...styles.pieceWrapper,
                cursor: !isGameOver && !isReviewing && inputMode === 'drag' && piece.color === chessGame.turn() ? 'grab' : 'pointer',
              }}
            >
              <span
                style={{
                  ...styles.piece,
                  color: piece.color === 'w' ? '#ffffff' : '#000000',
                  textShadow:
                    piece.color === 'w'
                      ? '0 2px 4px rgba(0,0,0,0.9)'
                      : '0 2px 4px rgba(255,255,255,0.5)',
                }}
              >
                {pieceSymbols[piece.color][piece.type]}
              </span>
            </div>
          )}
        </div>
      );
    });
  });

  return (
    <div style={styles.container}>
      <div style={styles.boardContainer}>
        <div style={styles.roomHeader}>
          <div>
            <h2 style={{ margin: 0, fontSize: '16px' }}>Room: <span style={{ color: '#ffcc00' }}>{roomCode}</span></h2>
            <span style={{ fontSize: '12px', color: '#888' }}>
              You: <strong>{playerName || 'Player'}</strong> ({playerColor === 'w' ? 'White ⚪' : 'Black ⚫'})
            </span>
          </div>
          <button style={{ ...styles.button, backgroundColor: '#2b5c8f', fontSize: '12px', padding: '6px 10px' }} onClick={copyInviteLink}>
            🔗 Copy Invite Link
          </button>
        </div>

        {toastMessage && <div style={styles.toastBanner}>{toastMessage}</div>}

        {drawOffered && !isGameOver && (
          <div style={styles.drawBanner}>
            <span>🤝 Opponent offered a draw!</span>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button style={{ ...styles.button, backgroundColor: '#2e7d32', padding: '4px 8px' }} onClick={handleAcceptDraw}>Accept</button>
              <button style={{ ...styles.button, backgroundColor: '#a83232', padding: '4px 8px' }} onClick={() => setDrawOffered(false)}>Decline</button>
            </div>
          </div>
        )}

        {/* Timers & Captured Bar */}
        {timeControl.type === 'timed' && (
          <div style={styles.timerBar}>
            <div style={{ ...styles.clockBox, borderColor: chessGame.turn() === 'w' && !isGameOver ? '#ffcc00' : '#444' }}>
              ⚪ White Clock: <strong>{formatTime(whiteTime)}</strong>
            </div>
            <div style={{ ...styles.clockBox, borderColor: chessGame.turn() === 'b' && !isGameOver ? '#ffcc00' : '#444' }}>
              ⚫ Black Clock: <strong>{formatTime(blackTime)}</strong>
            </div>
          </div>
        )}

        <div style={styles.capturedBar}>
          <span>Black Captured: {capturedInfo.capturedByBlack.join(' ')}</span>
          <span style={{ color: '#ffcc00' }}>{capturedInfo.blackAdvantage}</span>
        </div>

        <div style={styles.boardWrapper}>
          <div style={styles.boardGrid}>{boardSquares}</div>

          {pendingPromotion && (
            <div style={styles.gameOverOverlay}>
              <div style={styles.gameOverModal}>
                <h3 style={{ margin: '0 0 10px 0', color: '#ffcc00' }}>Choose Promotion Piece</h3>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                  {['q', 'r', 'b', 'n'].map(type => (
                    <button
                      key={type}
                      onClick={() => handlePromotionSelect(type)}
                      style={{ fontSize: '30px', padding: '10px', backgroundColor: '#333', border: '1px solid #555', borderRadius: '6px', cursor: 'pointer', color: '#fff' }}
                    >
                      {pieceSymbols[chessGame.turn()][type]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {isGameOver && !isReviewing && (
            <div style={styles.gameOverOverlay}>
              <div style={styles.gameOverModal}>
                <h2 style={{ margin: '0 0 10px 0', color: '#ffcc00' }}>Game Over</h2>
                <p style={{ margin: '0 0 15px 0', fontSize: '15px' }}>{statusText}</p>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button style={styles.newGameButton} onClick={startReview}>
                    🔍 Review Game
                  </button>
                  <button style={{ ...styles.newGameButton, backgroundColor: '#2b5c8f' }} onClick={handleReset}>
                    🎮 Play Again
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div style={styles.capturedBar}>
          <span>White Captured: {capturedInfo.capturedByWhite.join(' ')}</span>
          <span style={{ color: '#ffcc00' }}>{capturedInfo.whiteAdvantage}</span>
        </div>

        {showNextValidMove && nextMoveHintText && !isGameOver && !isReviewing && (
          <div style={styles.hintBanner}>
            💡 Suggested Valid Move: <strong>{nextMoveHintText}</strong>
          </div>
        )}

        <div style={styles.controls}>
          <button
            style={{ ...styles.button, backgroundColor: '#d97706' }}
            onClick={() => setIsFlipped(!isFlipped)}
          >
            🔄 Flip ({isFlipped ? 'Black' : 'White'})
          </button>

          <button
            style={{ ...styles.button, backgroundColor: '#5c32a8' }}
            onClick={() => setInputMode(inputMode === 'click' ? 'drag' : 'click')}
          >
            Mode: {inputMode === 'click' ? 'Click' : 'Drag'}
          </button>

          <button
            style={{ ...styles.button, backgroundColor: showLastMove ? '#2e7d32' : '#555' }}
            onClick={() => setShowLastMove(!showLastMove)}
          >
            Last Move: {showLastMove ? 'ON' : 'OFF'}
          </button>

          {!isGameOver && (
            <>
              <button style={{ ...styles.button, backgroundColor: '#9a3412' }} onClick={handleOfferDraw}>
                🤝 Draw
              </button>
              <button style={{ ...styles.button, backgroundColor: '#a83232' }} onClick={handleResign}>
                🏳️ Resign
              </button>
            </>
          )}

          {isGameOver && !isReviewing && (
            <button style={{ ...styles.button, backgroundColor: '#2e7d32' }} onClick={startReview}>
              🔍 Review
            </button>
          )}

          {isReviewing && (
            <button style={{ ...styles.button, backgroundColor: '#2e7d32' }} onClick={exitReview}>
              ❌ Exit Review
            </button>
          )}
        </div>

        <div style={{ ...styles.status, color: isGameOver ? '#ffcc00' : '#aaa' }}>
          {isReviewing ? `🔍 Reviewing move ${reviewIndex + 1} of ${moveHistory.length}` : statusText}
        </div>
      </div>

      <div style={styles.sideContainer}>
        <h2 style={styles.sectionHeader}>Full Move History</h2>
        <div style={styles.outputBox}>
          {moveHistory.length === 0 ? (
            <div style={{ color: '#666', fontStyle: 'italic', fontSize: '13px' }}>No moves yet...</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {Array.from({ length: Math.ceil(moveHistory.length / 2) }).map((_, rIdx) => {
                const wMove = moveHistory[rIdx * 2];
                const bMove = moveHistory[rIdx * 2 + 1];
                return (
                  <div key={rIdx} style={{ display: 'flex', fontSize: '13px', fontFamily: 'monospace' }}>
                    <span style={{ width: '35px', color: '#888' }}>{rIdx + 1}.</span>
                    <span
                      onClick={() => isReviewing && goToReviewStep(rIdx * 2)}
                      style={{
                        width: '70px',
                        cursor: isReviewing ? 'pointer' : 'default',
                        backgroundColor: reviewIndex === rIdx * 2 ? '#2e7d32' : 'transparent',
                        padding: '1px 4px',
                        borderRadius: '3px'
                      }}
                    >
                      {wMove ? wMove.san : ''}
                    </span>
                    <span
                      onClick={() => bMove && isReviewing && goToReviewStep(rIdx * 2 + 1)}
                      style={{
                        width: '70px',
                        cursor: bMove && isReviewing ? 'pointer' : 'default',
                        backgroundColor: reviewIndex === rIdx * 2 + 1 ? '#2e7d32' : 'transparent',
                        padding: '1px 4px',
                        borderRadius: '3px'
                      }}
                    >
                      {bMove ? bMove.san : ''}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {isReviewing && (
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
            <button style={{ ...styles.button, flex: 1 }} onClick={() => reviewIndex > -1 && goToReviewStep(reviewIndex - 1)}>◀ Prev</button>
            <button style={{ ...styles.button, flex: 1 }} onClick={() => reviewIndex < moveHistory.length - 1 && goToReviewStep(reviewIndex + 1)}>Next ▶</button>
          </div>
        )}

        <div style={styles.buttonGroup}>
          <button style={{ ...styles.button, backgroundColor: '#2e7d32' }} onClick={() => {
            navigator.clipboard.writeText(formatFullNotation());
            showToast('📋 Notation copied!');
          }}>
            📋 Copy Notation
          </button>
          <button style={{ ...styles.button, backgroundColor: '#2b5c8f' }} onClick={() => {
            navigator.clipboard.writeText(chessGame.pgn());
            showToast('📋 PGN copied!');
          }}>
            📋 Copy PGN
          </button>
        </div>

        <h2 style={styles.sectionHeader}>Room Chat</h2>
        <div style={styles.chatBox}>
          {chatMessages.length === 0 ? (
            <div style={{ color: '#666', fontStyle: 'italic', fontSize: '13px' }}>No messages yet...</div>
          ) : (
            chatMessages.map((msg, idx) => (
              <div key={idx} style={{ marginBottom: '6px', fontSize: '13px' }}>
                <span style={{ color: '#ffcc00', fontWeight: 'bold' }}>{msg.playerName}: </span>
                <span>{msg.message}</span>
                <span style={{ color: '#666', fontSize: '10px', marginLeft: '6px' }}>{msg.timestamp}</span>
              </div>
            ))
          )}
        </div>
        <form onSubmit={sendChat} style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            placeholder="Type a message..."
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            style={styles.input}
          />
          <button type="submit" style={{ ...styles.button, backgroundColor: '#2e7d32' }}>
            Send
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  container: { display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: '20px', maxWidth: '1000px', margin: '0 auto', padding: '12px', backgroundColor: '#121212', color: '#e0e0e0', fontFamily: 'sans-serif', borderRadius: '8px', boxSizing: 'border-box', width: '100%' },
  lobbyContainer: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#121212', fontFamily: 'sans-serif' },
  lobbyCard: { backgroundColor: '#1e1e1e', padding: '25px', borderRadius: '8px', width: '360px', textAlign: 'center', border: '1px solid #333', color: '#fff', boxSizing: 'border-box' },
  input: { flex: 1, padding: '10px', backgroundColor: '#121212', border: '1px solid #444', borderRadius: '6px', color: '#fff', fontSize: '14px' },
  templateBtn: { flex: 1, padding: '6px 8px', borderRadius: '4px', border: 'none', color: '#fff', fontSize: '12px', cursor: 'pointer' },
  boardContainer: { flex: '1 1 340px', maxWidth: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  roomHeader: { display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: '420px', marginBottom: '8px', alignItems: 'center', backgroundColor: '#1a1a1a', padding: '8px 12px', borderRadius: '6px', boxSizing: 'border-box' },
  toastBanner: { width: '100%', maxWidth: '420px', backgroundColor: '#d32f2f', color: '#fff', padding: '6px', borderRadius: '4px', fontSize: '13px', textAlign: 'center', marginBottom: '8px' },
  drawBanner: { width: '100%', maxWidth: '420px', backgroundColor: '#9a3412', color: '#fff', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', boxSizing: 'border-box' },
  timerBar: { width: '100%', maxWidth: '420px', display: 'flex', justifyContent: 'space-between', marginBottom: '6px', gap: '8px' },
  clockBox: { flex: 1, backgroundColor: '#1a1a1a', border: '2px solid #444', padding: '6px 10px', borderRadius: '6px', fontSize: '13px', textAlign: 'center', color: '#fff', boxSizing: 'border-box' },
  hintBanner: { width: '100%', maxWidth: '420px', backgroundColor: '#1e3a8a', color: '#fff', padding: '6px 10px', borderRadius: '6px', fontSize: '13px', textAlign: 'center', marginBottom: '6px', boxSizing: 'border-box' },
  capturedBar: { width: '100%', maxWidth: '420px', display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#bbb', backgroundColor: '#1a1a1a', padding: '4px 8px', borderRadius: '4px', marginBottom: '6px', boxSizing: 'border-box' },
  boardWrapper: { width: '100%', maxWidth: '420px', aspectRatio: '1 / 1', margin: '0 auto 6px auto', position: 'relative' },
  boardGrid: { display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gridTemplateRows: 'repeat(8, 1fr)', width: '100%', height: '100%', border: '3px solid #333', borderRadius: '4px', boxSizing: 'border-box' },
  gameOverOverlay: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0, 0, 0, 0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, borderRadius: '4px' },
  gameOverModal: { backgroundColor: '#1e1e1e', padding: '20px 24px', borderRadius: '8px', textAlign: 'center', border: '2px solid #ffcc00', boxShadow: '0 4px 20px rgba(0,0,0,0.6)' },
  newGameButton: { backgroundColor: '#2e7d32', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '6px', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer' },
  square: { width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', userSelect: 'none' },
  pieceWrapper: { width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  piece: { fontSize: 'clamp(24px, 7vw, 38px)', lineHeight: '1' },
  hintDot: { position: 'absolute', width: 'clamp(10px, 3.5vw, 16px)', height: 'clamp(10px, 3.5vw, 16px)', borderRadius: '50%', zIndex: 3 },
  rankLabel: { position: 'absolute', top: '2px', left: '3px', fontSize: 'clamp(8px, 2vw, 10px)', color: '#333', opacity: 0.7, fontWeight: 'bold', pointerEvents: 'none' },
  fileLabel: { position: 'absolute', bottom: '2px', right: '4px', fontSize: 'clamp(8px, 2vw, 10px)', color: '#333', opacity: 0.7, fontWeight: 'bold', pointerEvents: 'none' },
  controls: { display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '10px', flexWrap: 'wrap', width: '100%' },
  button: { backgroundColor: '#2b5c8f', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '6px', fontSize: 'clamp(12px, 3vw, 14px)', cursor: 'pointer' },
  status: { fontSize: '14px', padding: '8px 12px', backgroundColor: '#1a1a1a', borderRadius: '4px', textAlign: 'center', width: '100%', boxSizing: 'border-box', fontWeight: 'bold' },
  sideContainer: { flex: '1 1 280px', display: 'flex', flexDirection: 'column', gap: '15px', width: '100%' },
  sectionHeader: { fontSize: 'clamp(16px, 3.5vw, 20px)', margin: '0' },
  outputBox: { backgroundColor: '#1e1e1e', border: '1px solid #333', borderRadius: '6px', padding: '12px', minHeight: '130px', maxHeight: '180px', overflowY: 'auto', fontFamily: 'monospace', fontSize: '14px', whiteSpace: 'pre-wrap' },
  chatBox: { backgroundColor: '#1e1e1e', border: '1px solid #333', borderRadius: '6px', padding: '12px', height: '130px', overflowY: 'auto', fontFamily: 'sans-serif' },
  buttonGroup: { display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }
};