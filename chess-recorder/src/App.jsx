import React, { useState, useRef, useEffect } from 'react';
import { Chess } from 'chess.js';
import { io } from 'socket.io-client';

const SOCKET_URL = 'https://chess-server-c5fk.onrender.com';
const socket = io(SOCKET_URL);

const pieceSymbols = {
  w: { p: '♙', n: '♘', b: '♗', r: '♖', q: '♕', k: '♔' },
  b: { p: '♟', n: '♞', b: '♝', r: '♜', q: '♛', k: '♚' }
};

export default function MultiplayerChessApp() {
  const chessGameRef = useRef(new Chess());
  const chessGame = chessGameRef.current;

  // Lobby & Player State
  const [inLobby, setInLobby] = useState(true);
  const [playerName, setPlayerName] = useState('');
  const [roomInput, setRoomInput] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [playerColor, setPlayerColor] = useState(null); // 'w' or 'b'
  const [playersList, setPlayersList] = useState([]);
  const [toastMessage, setToastMessage] = useState('');

  // Board Sizing & Orientation
  const [isFlipped, setIsFlipped] = useState(false); // Board orientation: false = White on bottom, true = Black on bottom

  // Board & Game State
  const [moveHistory, setMoveHistory] = useState([]);
  const [statusText, setStatusText] = useState("Waiting for opponent to join...");
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [legalMoves, setLegalMoves] = useState([]);
  const [inputMode, setInputMode] = useState('click');
  const [showHints, setShowHints] = useState(true);
  const [showCheckHighlight, setShowCheckHighlight] = useState(true);
  const [isGameOver, setIsGameOver] = useState(false);
  const [, setRefreshKey] = useState(0);

  // Auto-fill room code from URL query parameter (e.g., ?room=ABC123)
  // Replace your useEffect socket listeners in src/App.jsx with this:

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      setRoomInput(roomParam.toUpperCase());
    }
  }, []);

  // --- Socket.io Handlers ---
  useEffect(() => {
    socket.on('room-update', ({ room, players, fen, history }) => {
      if (room) setRoomCode(room);
      setPlayersList(players || []);

      // Identify player color assignment
      const me = players?.find(p => p.id === socket.id);
      if (me) {
        setPlayerColor(me.color);
        if (me.color === 'b') setIsFlipped(true);
      }

      // Restore board position and notation history from server memory
      if (fen) {
        chessGame.load(fen);
      }
      if (history) {
        setMoveHistory(history);
      }

      setInLobby(false);
      setRefreshKey(prev => prev + 1);

      if (players && players.length < 2) {
        setStatusText(`Waiting for opponent to join room: ${room}...`);
      } else {
        const moveColor = chessGame.turn() === 'w' ? 'White' : 'Black';
        setStatusText(`Game in progress. ${moveColor}'s turn to move.`);
      }
    });

    socket.on('opponent-moved', ({ fen, history }) => {
      chessGame.load(fen);
      setMoveHistory(history || []);
      setRefreshKey(prev => prev + 1);
      checkGameStatus();
    });

    socket.on('player-disconnected', ({ disconnectedPlayer }) => {
      showToast(`⚠️ ${disconnectedPlayer || 'Opponent'} disconnected! Game state is saved for reconnection.`);
    });

    socket.on('game-reset', () => {
      chessGame.reset();
      setSelectedSquare(null);
      setLegalMoves([]);
      setIsGameOver(false);
      setMoveHistory([]);
      setRefreshKey(prev => prev + 1);
      setStatusText("Game reset. White's turn.");
    });

    socket.on('room-full', () => {
      alert('This room is already full!');
    });

    return () => {
      socket.off('room-update');
      socket.off('player-disconnected');
      socket.off('room-full');
      socket.off('opponent-moved');
      socket.off('game-reset');
    };
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 2000);
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
    if (chessGame.inCheck()) status += ` (${moveColor} is in CHECK!)`;
    setStatusText(status);
  };

  const executeMove = (from, to) => {
    if (isGameOver) return false;

    if (playersList.length < 2) {
      showToast("Waiting for an opponent to join before making moves!");
      return false;
    }

    if (playerColor && chessGame.turn() !== playerColor) {
      showToast("Not your turn!");
      return false;
    }

    try {
      const move = chessGame.move({ from, to, promotion: 'q' });
      if (move) {
        setSelectedSquare(null);
        setLegalMoves([]);

        const newFen = chessGame.fen();
        // Extract full verbose move history from chess.js
        const fullHistory = chessGame.history({ verbose: true });

        setMoveHistory(fullHistory);
        setRefreshKey(prev => prev + 1);
        checkGameStatus();

        // Broadcast updated FEN and Move History to server
        socket.emit('make-move', {
          roomCode,
          fen: newFen,
          history: fullHistory,
          move
        });
        return true;
      }
    } catch {
      // Invalid move
    }
    return false;
  };

  const handleSquareClick = (squareCoord) => {
    if (inputMode !== 'click' || isGameOver) return;

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

    const success = executeMove(selectedSquare, squareCoord);
    if (!success) {
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
    if (isGameOver || inputMode !== 'drag') {
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
    if (inputMode === 'drag' && !isGameOver) {
      e.preventDefault();
    }
  };

  const handleDrop = (e, targetSquare) => {
    if (inputMode !== 'drag' || isGameOver) return;
    e.preventDefault();
    const sourceSquare = e.dataTransfer.getData('text/plain');
    if (sourceSquare && targetSquare) {
      executeMove(sourceSquare, targetSquare);
    }
  };

  const handleReset = () => {
    if (window.confirm('Reset board for both players?')) {
      chessGame.reset();
      setSelectedSquare(null);
      setLegalMoves([]);
      setIsGameOver(false);
      setMoveHistory([]);
      setRefreshKey(prev => prev + 1);
      setStatusText("White's turn to move.");
      socket.emit('reset-game', { roomCode });
    }
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
    socket.emit('join-room', { roomCode: code, playerName: name });
  };

  const joinRoom = (e) => {
    e.preventDefault();
    if (!roomInput.trim()) return;
    const name = playerName.trim() || 'Player 2';
    socket.emit('join-room', { roomCode: roomInput.trim().toUpperCase(), playerName: name });
  };

  // Helper to format full move history
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

  const checkKingSquare = chessGame.inCheck() ? getKingSquare(chessGame.turn()) : null;

  // --- Render Lobby ---
  if (inLobby) {
    return (
      <div style={styles.lobbyContainer}>
        <div style={styles.lobbyCard}>
          <h1 style={{ marginBottom: '8px', fontSize: '22px' }}>Multiplayer Chess</h1>
          <p style={{ color: '#aaa', marginBottom: '20px', fontSize: '13px' }}>Set your name and create or join a room.</p>

          <div style={{ marginBottom: '15px', textAlign: 'left' }}>
            <label style={{ fontSize: '12px', color: '#888', display: 'block', marginBottom: '5px' }}>Your Name:</label>
            <input
              type="text"
              placeholder="e.g. Player 1"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              style={{ ...styles.input, width: '100%', boxSizing: 'border-box' }}
            />
          </div>

          <button style={{ ...styles.button, width: '100%', padding: '12px', marginBottom: '20px', backgroundColor: '#2e7d32', fontSize: '15px' }} onClick={createRoom}>
            ➕ Create New Room
          </button>

          <div style={{ borderTop: '1px solid #333', paddingTop: '15px', textAlign: 'left' }}>
            <label style={{ fontSize: '12px', color: '#888', display: 'block', marginBottom: '5px' }}>Or Join Existing Room:</label>
            <form onSubmit={joinRoom} style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                placeholder="Room Code"
                value={roomInput}
                onChange={(e) => setRoomInput(e.target.value)}
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

  // Adjust display order if board is flipped (Black perspective)
  const displayRanks = isFlipped ? [...ranks].reverse() : ranks;
  const displayFiles = isFlipped ? [...files].reverse() : files;

  const boardSquares = [];
  displayRanks.forEach((rank, rIdx) => {
    displayFiles.forEach((file, fIdx) => {
      const squareName = `${file}${rank}`;
      const piece = chessGame.get(squareName);

      // Determine square color based on original rank/file index
      const actualFileIdx = files.indexOf(file);
      const actualRankIdx = ranks.indexOf(rank);
      const isDark = (actualRankIdx + actualFileIdx) % 2 === 1;

      const isSelected = selectedSquare === squareName;
      const isLegalTarget = legalMoves.includes(squareName);
      const isCaptureTarget = isLegalTarget && piece !== null;
      const isInCheckSquare = showCheckHighlight && checkKingSquare === squareName;

      let bg = isDark ? '#b58863' : '#f0d9b5';
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

          {isLegalTarget && showHints && !isGameOver && (
            <div
              style={{
                ...styles.hintDot,
                backgroundColor: isCaptureTarget ? 'rgba(255, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.35)',
              }}
            />
          )}

          {piece && (
            <div
              draggable={!isGameOver && inputMode === 'drag' && piece.color === chessGame.turn()}
              onDragStart={(e) => handleDragStart(e, squareName)}
              style={{
                ...styles.pieceWrapper,
                cursor: !isGameOver && inputMode === 'drag' && piece.color === chessGame.turn() ? 'grab' : 'pointer',
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

        <div style={styles.boardWrapper}>
          <div style={styles.boardGrid}>{boardSquares}</div>

          {isGameOver && (
            <div style={styles.gameOverOverlay}>
              <div style={styles.gameOverModal}>
                <h2 style={{ margin: '0 0 10px 0', color: '#ffcc00' }}>Game Over</h2>
                <p style={{ margin: '0 0 15px 0', fontSize: '15px' }}>{statusText}</p>
                <button style={styles.newGameButton} onClick={handleReset}>
                  🎮 Play Again
                </button>
              </div>
            </div>
          )}
        </div>

        <div style={styles.controls}>
          <button
            style={{ ...styles.button, backgroundColor: '#d97706' }}
            onClick={() => setIsFlipped(!isFlipped)}
          >
            🔄 Flip Board ({isFlipped ? 'Black' : 'White'})
          </button>

          <button
            style={{ ...styles.button, backgroundColor: '#5c32a8' }}
            onClick={() => setInputMode(inputMode === 'click' ? 'drag' : 'click')}
          >
            Mode: {inputMode === 'click' ? 'Click' : 'Drag'}
          </button>

          <button
            style={{ ...styles.button, backgroundColor: showHints ? '#2e7d32' : '#555' }}
            onClick={() => setShowHints(!showHints)}
          >
            Hints: {showHints ? 'ON' : 'OFF'}
          </button>

          <button style={{ ...styles.button, backgroundColor: '#a83232' }} onClick={handleReset}>
            ⚠️ Reset
          </button>
        </div>

        <div style={{ ...styles.status, color: isGameOver ? '#ffcc00' : '#aaa' }}>{statusText}</div>
      </div>

      <div style={styles.sideContainer}>
        <h2 style={styles.sectionHeader}>Full Move History</h2>
        <div style={styles.outputBox}>
          {formatFullNotation()}
        </div>

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
      </div>
    </div>
  );
}

const styles = {
  container: { display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: '20px', maxWidth: '1000px', margin: '0 auto', padding: '12px', backgroundColor: '#121212', color: '#e0e0e0', fontFamily: 'sans-serif', borderRadius: '8px', boxSizing: 'border-box', width: '100%' },
  lobbyContainer: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#121212', fontFamily: 'sans-serif' },
  lobbyCard: { backgroundColor: '#1e1e1e', padding: '30px', borderRadius: '8px', width: '340px', textAlign: 'center', border: '1px solid #333', color: '#fff' },
  input: { flex: 1, padding: '10px', backgroundColor: '#121212', border: '1px solid #444', borderRadius: '6px', color: '#fff', fontSize: '14px' },
  boardContainer: { flex: '1 1 340px', maxWidth: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  roomHeader: { display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: '420px', marginBottom: '8px', alignItems: 'center', backgroundColor: '#1a1a1a', padding: '8px 12px', borderRadius: '6px', boxSizing: 'border-box' },
  toastBanner: { width: '100%', maxWidth: '420px', backgroundColor: '#d32f2f', color: '#fff', padding: '6px', borderRadius: '4px', fontSize: '13px', textAlign: 'center', marginBottom: '8px' },
  boardWrapper: { width: '100%', maxWidth: '420px', aspectRatio: '1 / 1', margin: '0 auto 15px auto', position: 'relative' },
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
  outputBox: { backgroundColor: '#1e1e1e', border: '1px solid #333', borderRadius: '6px', padding: '12px', minHeight: '180px', maxHeight: '250px', overflowY: 'auto', fontFamily: 'monospace', fontSize: '14px', whiteSpace: 'pre-wrap' },
  buttonGroup: { display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }
};