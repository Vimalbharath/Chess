import React, { useState, useEffect, useRef } from 'react';
import { Chess } from 'chess.js';

const ELO_LEVELS = [];
for (let elo = 500; elo <= 2500; elo += 100) {
  ELO_LEVELS.push(elo);
}
ELO_LEVELS.push(2800);

const pieceSymbols = {
  w: { p: '♙', n: '♘', b: '♗', r: '♖', q: '♕', k: '♔' },
  b: { p: '♟', n: '♞', b: '♝', r: '♜', q: '♛', k: '♚' }
};

const pieceValues = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

export default function PlayStockfish() {
  const chessRef = useRef(new Chess());
  const chess = chessRef.current;

  const [elo, setElo] = useState(1200);
  const [playerColor, setPlayerColor] = useState('w');
  const [engineSource, setEngineSource] = useState('public'); // 'public' or 'docker'
  const [dockerApiUrl, setDockerApiUrl] = useState('http://localhost:3001/api/stockfish');

  const [gameStarted, setGameStarted] = useState(false);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [legalMoves, setLegalMoves] = useState([]);
  const [moveHistory, setMoveHistory] = useState([]);
  const [isFlipped, setIsFlipped] = useState(false);
  const [inputMode, setInputMode] = useState('click');
  const [showLastMove, setShowLastMove] = useState(true);
  const [pendingPromotion, setPendingPromotion] = useState(null);
  const [, setRefreshKey] = useState(0);

  // Analysis state
  const [isGameOver, setIsGameOver] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [evalText, setEvalText] = useState('');
  const [bestMoveHint, setBestMoveHint] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const getDepthFromElo = (eloVal) => {
    if (eloVal <= 1000) return 6;
    if (eloVal <= 1400) return 8;
    if (eloVal <= 1800) return 10;
    if (eloVal <= 2200) return 12;
    if (eloVal <= 2600) return 14;
    return 15;
  };

  const startGame = () => {
    chess.reset();
    setMoveHistory([]);
    setIsGameOver(false);
    setIsReviewing(false);
    setSelectedSquare(null);
    setLegalMoves([]);
    setPendingPromotion(null);
    setGameStarted(true);
    setIsFlipped(playerColor === 'b');
    setStatusText(playerColor === 'w' ? 'Your turn to move!' : 'Stockfish is thinking...');
    setRefreshKey(prev => prev + 1);

    if (playerColor === 'b') {
      makeStockfishMove();
    }
  };

  const makeStockfishMove = async () => {
    if (chess.isGameOver()) return;
    setIsAiThinking(true);
    const depth = getDepthFromElo(elo);
    const currentFen = chess.fen();

    try {
      let moveStr = null;

      if (engineSource === 'docker') {
        const res = await fetch(`${dockerApiUrl}?fen=${encodeURIComponent(currentFen)}&depth=${depth}&elo=${elo}`);
        const data = await res.json();
        if (data.bestmove) {
          moveStr = data.bestmove;
        }
      } else {
        const res = await fetch(`https://stockfish.online/api/s/v2.php?fen=${encodeURIComponent(currentFen)}&depth=${depth}`);
        const data = await res.json();
        if (data.ok && data.bestmove) {
          moveStr = data.bestmove.split(' ')[1];
        }
      }

      if (moveStr) {
        const from = moveStr.substring(0, 2);
        const to = moveStr.substring(2, 4);
        const promotion = moveStr.length > 4 ? moveStr.substring(4, 5) : undefined;

        chess.move({ from, to, promotion });
        setMoveHistory(chess.history({ verbose: true }));
        setRefreshKey(prev => prev + 1);
        checkGameStatus();
      } else {
        fallbackRandomMove();
      }
    } catch (err) {
      console.error('Failed to get Stockfish move:', err);
      fallbackRandomMove();
    } finally {
      setIsAiThinking(false);
    }
  };

  const fallbackRandomMove = () => {
    const moves = chess.moves({ verbose: true });
    if (moves.length > 0) {
      const randomMove = moves[Math.floor(Math.random() * moves.length)];
      chess.move(randomMove);
      setMoveHistory(chess.history({ verbose: true }));
      setRefreshKey(prev => prev + 1);
      checkGameStatus();
    }
  };

  const checkGameStatus = () => {
    if (chess.isGameOver()) {
      setIsGameOver(true);
      if (chess.isCheckmate()) {
        const winner = chess.turn() === 'w' ? 'Black (Stockfish)' : 'White (You)';
        setStatusText(`🎉 Checkmate! ${winner} wins!`);
      } else if (chess.isDraw()) {
        setStatusText('🤝 Game Drawn!');
      } else {
        setStatusText('🏁 Game Over.');
      }
    } else {
      const isPlayerTurn = chess.turn() === playerColor;
      setStatusText(isPlayerTurn ? 'Your turn!' : 'Stockfish is thinking...');
    }
  };

  const executePlayerMove = (from, to, promotionPiece = 'q') => {
    if (!gameStarted || isGameOver || isReviewing || isAiThinking) return false;
    if (chess.turn() !== playerColor) return false;

    try {
      const move = chess.move({ from, to, promotion: promotionPiece });
      if (move) {
        setSelectedSquare(null);
        setLegalMoves([]);
        setPendingPromotion(null);
        setMoveHistory(chess.history({ verbose: true }));
        setRefreshKey(prev => prev + 1);

        if (!chess.isGameOver()) {
          setStatusText('Stockfish is thinking...');
          makeStockfishMove();
        } else {
          checkGameStatus();
        }
        return true;
      }
    } catch {
      // Invalid move
    }
    return false;
  };

  const handleSquareClick = (coord) => {
    if (inputMode !== 'click' || !gameStarted || isGameOver || isReviewing || isAiThinking) return;
    if (chess.turn() !== playerColor) return;

    if (!selectedSquare) {
      const piece = chess.get(coord);
      if (piece && piece.color === playerColor) {
        setSelectedSquare(coord);
        const moves = chess.moves({ square: coord, verbose: true });
        setLegalMoves(moves.map(m => m.to));
      }
      return;
    }

    if (selectedSquare === coord) {
      setSelectedSquare(null);
      setLegalMoves([]);
      return;
    }

    const piece = chess.get(selectedSquare);
    const isPromo = piece && piece.type === 'p' && ((piece.color === 'w' && coord[1] === '8') || (piece.color === 'b' && coord[1] === '1'));
    if (isPromo) {
      const moves = chess.moves({ square: selectedSquare, verbose: true });
      if (moves.some(m => m.to === coord)) {
        setPendingPromotion({ from: selectedSquare, to: coord });
        return;
      }
    }

    const success = executePlayerMove(selectedSquare, coord);
    if (!success) {
      const clickedPiece = chess.get(coord);
      if (clickedPiece && clickedPiece.color === playerColor) {
        setSelectedSquare(coord);
        const moves = chess.moves({ square: coord, verbose: true });
        setLegalMoves(moves.map(m => m.to));
      } else {
        setSelectedSquare(null);
        setLegalMoves([]);
      }
    }
  };

  const handleDragStart = (e, coord) => {
    if (isGameOver || isReviewing || inputMode !== 'drag' || isAiThinking) {
      e.preventDefault();
      return;
    }
    const piece = chess.get(coord);
    if (!piece || piece.color !== playerColor) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData('text/plain', coord);
    setSelectedSquare(coord);
    const moves = chess.moves({ square: coord, verbose: true });
    setLegalMoves(moves.map(m => m.to));
  };

  const handleDragOver = (e) => {
    if (inputMode === 'drag' && !isGameOver && !isReviewing) {
      e.preventDefault();
    }
  };

  const handleDrop = (e, targetSquare) => {
    if (inputMode !== 'drag' || isGameOver || isReviewing || isAiThinking) return;
    e.preventDefault();
    const sourceSquare = e.dataTransfer.getData('text/plain');
    if (sourceSquare && targetSquare) {
      const piece = chess.get(sourceSquare);
      const isPromo = piece && piece.type === 'p' && ((piece.color === 'w' && targetSquare[1] === '8') || (piece.color === 'b' && targetSquare[1] === '1'));
      if (isPromo) {
        setPendingPromotion({ from: sourceSquare, to: targetSquare });
        return;
      }
      executePlayerMove(sourceSquare, targetSquare);
    }
  };

  const getCapturedPieces = () => {
    const initialCounts = { p: 8, n: 2, b: 2, r: 2, q: 1 };
    const currentCounts = { w: { p: 0, n: 0, b: 0, r: 0, q: 0 }, b: { p: 0, n: 0, b: 0, r: 0, q: 0 } };

    const board = chess.board();
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

  // Review & Post-Game Analysis
  const startReview = () => {
    setIsReviewing(true);
    setReviewIndex(moveHistory.length);
    updateReviewBoard(moveHistory.length);
  };

  const updateReviewBoard = async (idx) => {
    chess.reset();
    for (let i = 0; i < idx; i++) {
      if (moveHistory[i]) {
        chess.move(moveHistory[i]);
      }
    }
    setReviewIndex(idx);
    setRefreshKey(prev => prev + 1);
    fetchPositionAnalysis(chess.fen());
  };

  const fetchPositionAnalysis = async (fen) => {
    setIsAnalyzing(true);
    setEvalText('Evaluating...');
    setBestMoveHint('');
    try {
      if (engineSource === 'docker') {
        const res = await fetch(`${dockerApiUrl}?fen=${encodeURIComponent(fen)}&depth=10`);
        const data = await res.json();
        if (data.bestmove) {
          setEvalText(`Evaluation: ${data.evaluation !== undefined ? data.evaluation : 'N/A'}`);
          setBestMoveHint(`Best Move: ${data.bestmove}`);
        }
      } else {
        const res = await fetch(`https://stockfish.online/api/s/v2.php?fen=${encodeURIComponent(fen)}&depth=10`);
        const data = await res.json();
        if (data.ok) {
          setEvalText(`Evaluation: ${data.evaluation !== undefined ? data.evaluation : 'N/A'} (Mate: ${data.mate ?? 'None'})`);
          if (data.bestmove) {
            const bMove = data.bestmove.split(' ')[1];
            setBestMoveHint(bMove ? `Best Move: ${bMove}` : '');
          }
        }
      }
    } catch (e) {
      setEvalText('Evaluation unavailable');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const exitReview = () => {
    setIsReviewing(false);
    chess.reset();
    moveHistory.forEach(m => chess.move(m));
    setRefreshKey(prev => prev + 1);
  };

  // Board setup logic
  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];

  const displayRanks = isFlipped ? [...ranks].reverse() : ranks;
  const displayFiles = isFlipped ? [...files].reverse() : files;

  const capturedInfo = getCapturedPieces();
  const lastMove = isReviewing && reviewIndex > 0
    ? moveHistory[reviewIndex - 1]
    : (moveHistory.length > 0 ? moveHistory[moveHistory.length - 1] : null);

  const boardSquares = [];
  displayRanks.forEach((rank, rIdx) => {
    displayFiles.forEach((file, fIdx) => {
      const squareName = `${file}${rank}`;
      const piece = chess.get(squareName);

      const actualFileIdx = files.indexOf(file);
      const actualRankIdx = ranks.indexOf(rank);
      const isDark = (actualRankIdx + actualFileIdx) % 2 === 1;

      const isSelected = selectedSquare === squareName;
      const isLegalTarget = legalMoves.includes(squareName);
      const isCaptureTarget = isLegalTarget && piece !== null;
      const isLastMoveSquare = showLastMove && lastMove && (lastMove.from === squareName || lastMove.to === squareName);

      let bg = isDark ? '#b58863' : '#f0d9b5';
      if (isLastMoveSquare) bg = isDark ? '#b9ca41' : '#cdd26a';
      if (isSelected) bg = 'rgba(255, 255, 0, 0.65)';

      boardSquares.push(
        <div
          key={squareName}
          onClick={() => handleSquareClick(squareName)}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, squareName)}
          style={{
            ...styles.square,
            backgroundColor: bg,
          }}
        >
          {fIdx === 0 && <span style={styles.rankLabel}>{rank}</span>}
          {rIdx === 7 && <span style={styles.fileLabel}>{file}</span>}

          {isLegalTarget && !isGameOver && !isReviewing && (
            <div
              style={{
                ...styles.hintDot,
                backgroundColor: isCaptureTarget ? 'rgba(255, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.35)',
              }}
            />
          )}

          {piece && (
            <div
              draggable={!isGameOver && !isReviewing && inputMode === 'drag' && piece.color === playerColor && !isAiThinking}
              onDragStart={(e) => handleDragStart(e, squareName)}
              style={{
                ...styles.pieceWrapper,
                cursor: !isGameOver && !isReviewing && inputMode === 'drag' && piece.color === playerColor && !isAiThinking ? 'grab' : 'pointer',
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
      <h2 style={{ color: '#ffcc00', textAlign: 'center', width: '100%', margin: '0 0 10px 0' }}>🤖 Play vs Stockfish AI</h2>

      {/* Control Panel / Setup */}
      <div style={styles.setupCard}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontWeight: 'bold', fontSize: '14px' }}>Elo Rating:</label>
          <select value={elo} onChange={e => setElo(Number(e.target.value))} disabled={gameStarted && !isGameOver} style={styles.select}>
            {ELO_LEVELS.map(level => (
              <option key={level} value={level}>{level} ELO</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontWeight: 'bold', fontSize: '14px' }}>Play As:</label>
          <select value={playerColor} onChange={e => setPlayerColor(e.target.value)} disabled={gameStarted && !isGameOver} style={styles.select}>
            <option value="w">White (Moves First)</option>
            <option value="b">Black (Moves Second)</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontWeight: 'bold', fontSize: '14px' }}>Engine Source:</label>
          <select value={engineSource} onChange={e => setEngineSource(e.target.value)} disabled={gameStarted && !isGameOver} style={styles.select}>
            <option value="public">Cloud Public API (Stockfish.online)</option>
            <option value="docker">⚡ Local / Dockerised Stockfish</option>
          </select>
        </div>

        {engineSource === 'docker' && (
          <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '5px' }}>
            <label style={{ fontSize: '12px', color: '#888' }}>Docker URL:</label>
            <input
              type="text"
              value={dockerApiUrl}
              onChange={e => setDockerApiUrl(e.target.value)}
              style={{ flex: 1, padding: '4px 8px', borderRadius: '4px', backgroundColor: '#121212', color: '#fff', border: '1px solid #444', fontSize: '12px' }}
            />
          </div>
        )}

        <button onClick={startGame} style={{ ...styles.button, backgroundColor: '#2e7d32', padding: '8px 16px', fontWeight: 'bold', width: '100%' }}>
          {gameStarted ? 'Restart Game' : 'Start Game'}
        </button>
      </div>

      {gameStarted && (
        <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: '20px', width: '100%' }}>
          {/* Board Container */}
          <div style={styles.boardContainer}>
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
                          onClick={() => executePlayerMove(pendingPromotion.from, pendingPromotion.to, type)}
                          style={{ fontSize: '30px', padding: '10px', backgroundColor: '#333', border: '1px solid #555', borderRadius: '6px', cursor: 'pointer', color: '#fff' }}
                        >
                          {pieceSymbols[playerColor][type]}
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
                        🔍 Post-Mortem Analysis
                      </button>
                      <button style={{ ...styles.newGameButton, backgroundColor: '#2b5c8f' }} onClick={startGame}>
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
            </div>

            <div style={{ ...styles.status, color: isGameOver ? '#ffcc00' : '#aaa' }}>
              {isReviewing ? `🔍 Reviewing step ${reviewIndex} of ${moveHistory.length}` : statusText}
            </div>
          </div>

          {/* Side Panel: Move History & Analysis */}
          <div style={styles.sideContainer}>
            <h3 style={styles.sectionHeader}>📋 Move History {"&"} Analysis</h3>

            {isGameOver && !isReviewing && (
              <button onClick={startReview} style={{ width: '100%', padding: '10px', backgroundColor: '#007bff', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                🔍 Analyse Game Post-Mortem
              </button>
            )}

            {isReviewing && (
              <div style={{ backgroundColor: '#161616', padding: '12px', borderRadius: '6px', border: '1px solid #444' }}>
                <h4 style={{ margin: '0 0 8px 0', color: '#17a2b8' }}>🔬 Post-Game Analysis Mode</h4>
                <p style={{ margin: '4px 0', fontSize: '13px' }}>Move Step: {reviewIndex} / {moveHistory.length}</p>
                <p style={{ margin: '4px 0', fontSize: '13px', color: '#ffcc00' }}>{isAnalyzing ? 'Calculating evaluation...' : evalText}</p>
                {bestMoveHint && <p style={{ margin: '4px 0', fontSize: '13px', color: '#4ade80', fontWeight: 'bold' }}>{bestMoveHint}</p>}

                <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
                  <button onClick={() => updateReviewBoard(0)} disabled={reviewIndex === 0} style={styles.subBtn}>⏮ First</button>
                  <button onClick={() => updateReviewBoard(reviewIndex - 1)} disabled={reviewIndex === 0} style={styles.subBtn}>◀ Prev</button>
                  <button onClick={() => updateReviewBoard(reviewIndex + 1)} disabled={reviewIndex === moveHistory.length} style={styles.subBtn}>Next ▶</button>
                  <button onClick={() => updateReviewBoard(moveHistory.length)} disabled={reviewIndex === moveHistory.length} style={styles.subBtn}>⏭ Last</button>
                </div>
                <button onClick={exitReview} style={{ ...styles.subBtn, marginTop: '8px', backgroundColor: '#dc3545', width: '100%' }}>Exit Analysis</button>
              </div>
            )}

            <div style={styles.outputBox}>
              {moveHistory.length === 0 ? (
                <p style={{ color: '#666', fontStyle: 'italic', margin: 0, fontSize: '13px' }}>No moves played yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {Array.from({ length: Math.ceil(moveHistory.length / 2) }).map((_, rIdx) => {
                    const wMove = moveHistory[rIdx * 2];
                    const bMove = moveHistory[rIdx * 2 + 1];
                    return (
                      <div key={rIdx} style={{ display: 'flex', fontSize: '13px', fontFamily: 'monospace' }}>
                        <span style={{ width: '35px', color: '#888' }}>{rIdx + 1}.</span>
                        <span
                          onClick={() => isReviewing && updateReviewBoard(rIdx * 2 + 1)}
                          style={{
                            width: '70px',
                            cursor: isReviewing ? 'pointer' : 'default',
                            backgroundColor: reviewIndex === rIdx * 2 + 1 ? '#2e7d32' : 'transparent',
                            padding: '1px 4px',
                            borderRadius: '3px'
                          }}
                        >
                          {wMove ? wMove.san : ''}
                        </span>
                        <span
                          onClick={() => bMove && isReviewing && updateReviewBoard(rIdx * 2 + 2)}
                          style={{
                            width: '70px',
                            cursor: bMove && isReviewing ? 'pointer' : 'default',
                            backgroundColor: reviewIndex === rIdx * 2 + 2 ? '#2e7d32' : 'transparent',
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
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: '20px', maxWidth: '1000px', margin: '20px auto', padding: '12px', backgroundColor: '#121212', color: '#e0e0e0', fontFamily: 'sans-serif', borderRadius: '8px', boxSizing: 'border-box', width: '100%' },
  setupCard: { backgroundColor: '#1e1e1e', padding: '15px 20px', borderRadius: '8px', width: '100%', display: 'flex', flexWrap: 'wrap', gap: '15px', alignItems: 'center', justifyContent: 'space-between', border: '1px solid #333', boxSizing: 'border-box' },
  select: { padding: '6px 10px', borderRadius: '4px', backgroundColor: '#2a2a2a', color: '#fff', border: '1px solid #555' },
  boardContainer: { flex: '1 1 340px', maxWidth: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' },
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
  sectionHeader: { fontSize: 'clamp(16px, 3.5vw, 20px)', margin: '0', color: '#ffcc00' },
  outputBox: { backgroundColor: '#1e1e1e', border: '1px solid #333', borderRadius: '6px', padding: '12px', minHeight: '180px', maxHeight: '300px', overflowY: 'auto', fontFamily: 'monospace', fontSize: '14px' },
  subBtn: { flex: 1, padding: '6px', backgroundColor: '#3a3a3a', color: '#fff', border: '1px solid #555', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }
};
