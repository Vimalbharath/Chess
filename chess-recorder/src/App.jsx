import React, { useState, useRef } from 'react';
import { Chess } from 'chess.js';

// Unicode chess pieces mapping
const pieceSymbols = {
  w: { p: '♙', n: '♘', b: '♗', r: '♖', q: '♕', k: '♔' },
  b: { p: '♟', n: '♞', b: '♝', r: '♜', q: '♛', k: '♚' }
};

export default function ChessRecorderApp() {
  const chessGameRef = useRef(new Chess());
  const chessGame = chessGameRef.current;

  const [moveHistory, setMoveHistory] = useState([]);
  const [statusText, setStatusText] = useState("White's turn to move.");
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [legalMoves, setLegalMoves] = useState([]);
  const [inputMode, setInputMode] = useState('click'); // 'click' or 'drag'
  const [showHints, setShowHints] = useState(true);
  const [showCheckHighlight, setShowCheckHighlight] = useState(true);
  const [showToast, setShowToast] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [, setRefreshKey] = useState(0);

  // Locate the square of the king currently in turn
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

  const refreshGameState = () => {
    setMoveHistory(chessGame.history({ verbose: true }));
    setRefreshKey(prev => prev + 1);

    if (chessGame.isGameOver()) {
      setIsGameOver(true);
      if (chessGame.isCheckmate()) {
        const winner = chessGame.turn() === 'w' ? 'Black' : 'White';
        setStatusText(`🎉 Checkmate! ${winner} wins the game!`);
      } else if (chessGame.isDraw()) {
        setStatusText(`🤝 Game Drawn! (Stalemate / Insufficient Material)`);
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
    if (chessGame.isGameOver()) return false;

    try {
      const move = chessGame.move({
        from,
        to,
        promotion: 'q'
      });

      if (move) {
        setSelectedSquare(null);
        setLegalMoves([]);
        refreshGameState();
        return true;
      }
    } catch {
      // Invalid move
    }
    return false;
  };

  // --- Click Handler ---
  const handleSquareClick = (squareCoord) => {
    if (inputMode !== 'click' || chessGame.isGameOver()) return;

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

  // --- Drag and Drop Handlers ---
  const handleDragStart = (e, squareCoord) => {
    if (inputMode !== 'drag' || chessGame.isGameOver()) {
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
    if (inputMode === 'drag' && !chessGame.isGameOver()) {
      e.preventDefault();
    }
  };

  const handleDrop = (e, targetSquare) => {
    if (inputMode !== 'drag' || chessGame.isGameOver()) return;
    e.preventDefault();
    const sourceSquare = e.dataTransfer.getData('text/plain');
    if (sourceSquare && targetSquare) {
      executeMove(sourceSquare, targetSquare);
    }
  };

  const handleUndo = () => {
    chessGame.undo();
    setSelectedSquare(null);
    setLegalMoves([]);
    refreshGameState();
  };

  const handleNewGame = () => {
    chessGame.reset();
    setSelectedSquare(null);
    setLegalMoves([]);
    setIsGameOver(false);
    refreshGameState();
  };

  const formatNotation = () => {
    if (moveHistory.length === 0) return '1. ';
    let text = '';
    for (let i = 0; i < moveHistory.length; i += 2) {
      const moveNum = Math.floor(i / 2) + 1;
      const wMove = moveHistory[i] ? moveHistory[i].san : '';
      const bMove = moveHistory[i + 1] ? moveHistory[i + 1].san : '';
      text += `${moveNum}. ${wMove} ${bMove}\n`;
    }
    return text.trim();
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      setShowToast(true);
      setTimeout(() => setShowToast(false), 1500);
    });
  };

  const checkKingSquare = chessGame.inCheck() ? getKingSquare(chessGame.turn()) : null;

  // Generate 8x8 board squares
  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];

  const boardSquares = [];
  ranks.forEach((rank, rIdx) => {
    files.forEach((file, fIdx) => {
      const squareName = `${file}${rank}`;
      const piece = chessGame.get(squareName);
      const isDark = (rIdx + fIdx) % 2 === 1;
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
        <h1 style={styles.appTitle}>Chess Notation Recorder</h1>

        {/* Responsive Chess Board Container with 1:1 Aspect Ratio */}
        <div style={styles.boardWrapper}>
          <div style={styles.boardGrid}>{boardSquares}</div>

          {/* Game Over Banner Overlay */}
          {isGameOver && (
            <div style={styles.gameOverOverlay}>
              <div style={styles.gameOverModal}>
                <h2 style={{ margin: '0 0 10px 0', color: '#ffcc00' }}>Game Over</h2>
                <p style={{ margin: '0 0 15px 0', fontSize: '15px' }}>{statusText}</p>
                <button style={styles.newGameButton} onClick={handleNewGame}>
                  🎮 Start New Game
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Action & Mode Controls */}
        <div style={styles.controls}>
          <button
            style={{ ...styles.button, backgroundColor: '#5c32a8' }}
            onClick={() => {
              setInputMode(inputMode === 'click' ? 'drag' : 'click');
              setSelectedSquare(null);
              setLegalMoves([]);
            }}
          >
            Mode: {inputMode === 'click' ? 'Click' : 'Drag'}
          </button>

          <button
            style={{ ...styles.button, backgroundColor: showHints ? '#2e7d32' : '#555' }}
            onClick={() => setShowHints(!showHints)}
          >
            Hints: {showHints ? 'ON' : 'OFF'}
          </button>

          <button
            style={{ ...styles.button, backgroundColor: showCheckHighlight ? '#b85c00' : '#555' }}
            onClick={() => setShowCheckHighlight(!showCheckHighlight)}
          >
            Check Marker: {showCheckHighlight ? 'ON' : 'OFF'}
          </button>

          <button style={styles.button} onClick={handleUndo}>
            ↩ Undo
          </button>
          <button
            style={{ ...styles.button, backgroundColor: isGameOver ? '#2e7d32' : '#a83232' }}
            onClick={handleNewGame}
          >
            {isGameOver ? '🎮 New Game' : '⚠️ Reset'}
          </button>
        </div>

        <div style={{ ...styles.status, color: isGameOver ? '#ffcc00' : '#aaa' }}>{statusText}</div>
      </div>

      {/* Live Notation Sidebar */}
      <div style={styles.sideContainer}>
        <h2 style={styles.sectionHeader}>Live Move Notation</h2>
        <div style={styles.outputBox}>{formatNotation()}</div>

        <div style={styles.buttonGroup}>
          <button
            style={{ ...styles.button, backgroundColor: '#2e7d32' }}
            onClick={() => copyToClipboard(formatNotation())}
          >
            📋 Copy Notation
          </button>
          <button
            style={styles.button}
            onClick={() => copyToClipboard(chessGame.pgn())}
          >
            📋 Copy PGN
          </button>
          {showToast && <div style={styles.toast}>Copied!</div>}
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: '20px',
    maxWidth: '1000px',
    margin: '0 auto',
    padding: '12px',
    backgroundColor: '#121212',
    color: '#e0e0e0',
    fontFamily: 'sans-serif',
    borderRadius: '8px',
    boxSizing: 'border-box',
    width: '100%',
  },
  boardContainer: {
    flex: '1 1 340px',
    maxWidth: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  appTitle: {
    fontSize: 'clamp(18px, 4vw, 24px)',
    margin: '0 0 12px 0',
    textAlign: 'center',
    width: '100%',
  },
  boardWrapper: {
    width: '100%',
    maxWidth: '420px',
    aspectRatio: '1 / 1',
    margin: '0 auto 15px auto',
    position: 'relative',
  },
  boardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(8, 1fr)',
    gridTemplateRows: 'repeat(8, 1fr)',
    width: '100%',
    height: '100%',
    border: '3px solid #333',
    borderRadius: '4px',
    boxSizing: 'border-box',
  },
  gameOverOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    borderRadius: '4px',
  },
  gameOverModal: {
    backgroundColor: '#1e1e1e',
    padding: '20px 24px',
    borderRadius: '8px',
    textAlign: 'center',
    border: '2px solid #ffcc00',
    boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
  },
  newGameButton: {
    backgroundColor: '#2e7d32',
    color: '#fff',
    border: 'none',
    padding: '10px 18px',
    borderRadius: '6px',
    fontSize: '15px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  square: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    userSelect: 'none',
  },
  pieceWrapper: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  piece: {
    fontSize: 'clamp(24px, 7vw, 38px)',
    lineHeight: '1',
  },
  hintDot: {
    position: 'absolute',
    width: 'clamp(10px, 3.5vw, 16px)',
    height: 'clamp(10px, 3.5vw, 16px)',
    borderRadius: '50%',
    zIndex: 3,
  },
  rankLabel: {
    position: 'absolute',
    top: '2px',
    left: '3px',
    fontSize: 'clamp(8px, 2vw, 10px)',
    color: '#333',
    opacity: 0.7,
    fontWeight: 'bold',
    pointerEvents: 'none',
  },
  fileLabel: {
    position: 'absolute',
    bottom: '2px',
    right: '4px',
    fontSize: 'clamp(8px, 2vw, 10px)',
    color: '#333',
    opacity: 0.7,
    fontWeight: 'bold',
    pointerEvents: 'none',
  },
  controls: {
    display: 'flex',
    gap: '8px',
    justifyContent: 'center',
    marginBottom: '10px',
    flexWrap: 'wrap',
    width: '100%',
  },
  button: {
    backgroundColor: '#2b5c8f',
    color: '#fff',
    border: 'none',
    padding: '8px 12px',
    borderRadius: '6px',
    fontSize: 'clamp(12px, 3vw, 14px)',
    cursor: 'pointer',
  },
  status: {
    fontSize: '14px',
    padding: '8px 12px',
    backgroundColor: '#1a1a1a',
    borderRadius: '4px',
    textAlign: 'center',
    width: '100%',
    boxSizing: 'border-box',
    fontWeight: 'bold',
  },
  sideContainer: {
    flex: '1 1 280px',
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
    width: '100%',
  },
  sectionHeader: {
    fontSize: 'clamp(16px, 3.5vw, 20px)',
    margin: '0',
  },
  outputBox: {
    backgroundColor: '#1e1e1e',
    border: '1px solid #333',
    borderRadius: '6px',
    padding: '12px',
    minHeight: '160px',
    maxHeight: '220px',
    overflowY: 'auto',
    fontFamily: 'monospace',
    fontSize: '14px',
    whiteSpace: 'pre-wrap',
  },
  buttonGroup: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  toast: {
    padding: '6px 12px',
    backgroundColor: '#2e7d32',
    color: 'white',
    borderRadius: '4px',
    fontSize: '13px',
  },
};