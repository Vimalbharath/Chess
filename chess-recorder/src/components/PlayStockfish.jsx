import React, { useState, useEffect, useRef } from 'react';
import { Chess } from 'chess.js';

const ELO_LEVELS = [];
for (let elo = 500; elo <= 2500; elo += 100) {
  ELO_LEVELS.push(elo);
}
ELO_LEVELS.push(2800);

export default function PlayStockfish() {
  const chessRef = useRef(new Chess());
  const chess = chessRef.current;

  const [elo, setElo] = useState(1200);
  const [playerColor, setPlayerColor] = useState('w');
  const [gameStarted, setGameStarted] = useState(false);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [legalMoves, setLegalMoves] = useState([]);
  const [moveHistory, setMoveHistory] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);

  // Analysis state
  const [isGameOver, setIsGameOver] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [evalText, setEvalText] = useState('');
  const [bestMoveHint, setBestMoveHint] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Convert ELO rating to Stockfish Search Depth (1 to 15)
  const getDepthFromElo = (eloVal) => {
    if (eloVal <= 800) return 1;
    if (eloVal <= 1200) return 3;
    if (eloVal <= 1600) return 6;
    if (eloVal <= 2000) return 9;
    if (eloVal <= 2400) return 12;
    return 15;
  };

  const startGame = () => {
    chess.reset();
    setMoveHistory([]);
    setIsGameOver(false);
    setIsReviewing(false);
    setSelectedSquare(null);
    setLegalMoves([]);
    setGameStarted(true);
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
    const currentFen = encodeURIComponent(chess.fen());

    try {
      const res = await fetch(`https://stockfish.online/api/s/v2.php?fen=${currentFen}&depth=${depth}`);
      const data = await res.json();

      if (data.ok && data.bestmove) {
        // format: "bestmove e2e4 ponder e7e5"
        const moveStr = data.bestmove.split(' ')[1];
        if (moveStr) {
          const from = moveStr.substring(0, 2);
          const to = moveStr.substring(2, 4);
          const promotion = moveStr.length > 4 ? moveStr.substring(4, 5) : undefined;

          chess.move({ from, to, promotion });
          setMoveHistory(chess.history({ verbose: true }));
          setRefreshKey(prev => prev + 1);
          checkGameStatus();
        }
      }
    } catch (err) {
      console.error('Failed to get Stockfish move:', err);
      // Fallback: random move
      const moves = chess.moves({ verbose: true });
      if (moves.length > 0) {
        const randomMove = moves[Math.floor(Math.random() * moves.length)];
        chess.move(randomMove);
        setMoveHistory(chess.history({ verbose: true }));
        setRefreshKey(prev => prev + 1);
        checkGameStatus();
      }
    } opacity {
      setIsAiThinking(false);
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

  const handleSquareClick = (coord) => {
    if (!gameStarted || isGameOver || isReviewing || isAiThinking) return;
    if (chess.turn() !== playerColor) return;

    if (!selectedSquare) {
      const piece = chess.get(coord);
      if (piece && piece.color === playerColor) {
        setSelectedSquare(coord);
        const moves = chess.moves({ square: coord, verbose: true });
        setLegalMoves(moves.map(m => m.to));
      }
    } else {
      if (selectedSquare === coord) {
        setSelectedSquare(null);
        setLegalMoves([]);
        return;
      }

      try {
        const move = chess.move({ from: selectedSquare, to: coord, promotion: 'q' });
        if (move) {
          setSelectedSquare(null);
          setLegalMoves([]);
          setMoveHistory(chess.history({ verbose: true }));
          setRefreshKey(prev => prev + 1);

          if (!chess.isGameOver()) {
            setStatusText('Stockfish is thinking...');
            makeStockfishMove();
          } else {
            checkGameStatus();
          }
        } else {
          const piece = chess.get(coord);
          if (piece && piece.color === playerColor) {
            setSelectedSquare(coord);
            const moves = chess.moves({ square: coord, verbose: true });
            setLegalMoves(moves.map(m => m.to));
          } else {
            setSelectedSquare(null);
            setLegalMoves([]);
          }
        }
      } catch (e) {
        setSelectedSquare(null);
        setLegalMoves([]);
      }
    }
  };

  // Review & Analyse Game
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
      const res = await fetch(`https://stockfish.online/api/s/v2.php?fen=${encodeURIComponent(fen)}&depth=10`);
      const data = await res.json();

      if (data.ok) {
        setEvalText(`Evaluation: ${data.evaluation !== undefined ? data.evaluation : 'N/A'} (Mate: ${data.mate ?? 'None'})`);
        if (data.bestmove) {
          const bMove = data.bestmove.split(' ')[1];
          setBestMoveHint(bMove ? `Best Move: ${bMove}` : '');
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

  // Rendering Board
  const board = chess.board();
  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const ranks = playerColor === 'w' ? ['8', '7', '6', '5', '4', '3', '2', '1'] : ['1', '2', '3', '4', '5', '6', '7', '8'];
  const displayFiles = playerColor === 'w' ? files : [...files].reverse();

  const getPieceSymbol = (piece) => {
    if (!piece) return '';
    const symbols = {
      w: { p: '♙', r: '♖', n: '♘', b: '♗', q: '♕', k: '♔' },
      b: { p: '♟', r: '♜', n: '♞', b: '♝', q: '♛', k: '♚' }
    };
    return symbols[piece.color][piece.type];
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', color: '#fff', fontFamily: 'sans-serif' }}>
      <h2 style={{ color: '#ffcc00', textAlign: 'center' }}>🤖 Play vs Stockfish AI</h2>

      {/* Control Panel / Setup */}
      <div style={{ backgroundColor: '#1e1e1e', padding: '15px 20px', borderRadius: '8px', marginBottom: '20px', display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'center', justifyContent: 'space-between', border: '1px solid #333' }}>
        <div>
          <label style={{ marginRight: '10px', fontWeight: 'bold' }}>Stockfish ELO Rating:</label>
          <select value={elo} onChange={e => setElo(Number(e.target.value))} disabled={gameStarted && !isGameOver} style={{ padding: '6px 10px', borderRadius: '4px', backgroundColor: '#2a2a2a', color: '#fff', border: '1px solid #555' }}>
            {ELO_LEVELS.map(level => (
              <option key={level} value={level}>{level} ELO</option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ marginRight: '10px', fontWeight: 'bold' }}>Play As:</label>
          <select value={playerColor} onChange={e => setPlayerColor(e.target.value)} disabled={gameStarted && !isGameOver} style={{ padding: '6px 10px', borderRadius: '4px', backgroundColor: '#2a2a2a', color: '#fff', border: '1px solid #555' }}>
            <option value="w">White (Moves First)</option>
            <option value="b">Black (Moves Second)</option>
          </select>
        </div>

        <button onClick={startGame} style={{ padding: '8px 18px', borderRadius: '6px', backgroundColor: '#28a745', color: '#fff', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>
          {gameStarted ? 'Restart Game' : 'Start Game'}
        </button>
      </div>

      {gameStarted && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 450px) 1fr', gap: '20px', alignItems: 'start' }}>
          {/* Board Container */}
          <div>
            <div style={{ backgroundColor: '#2a2a2a', padding: '10px', borderRadius: '8px', border: '1px solid #444' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', width: '100%', aspectRatio: '1/1', border: '2px solid #555' }}>
                {ranks.map((rank, rIdx) =>
                  displayFiles.map((file, cIdx) => {
                    const coord = `${file}${rank}`;
                    const isDark = (files.indexOf(file) + parseInt(rank)) % 2 === 0;
                    const piece = chess.get(coord);
                    const isSelected = selectedSquare === coord;
                    const isLegal = legalMoves.includes(coord);

                    return (
                      <div
                        key={coord}
                        onClick={() => handleSquareClick(coord)}
                        style={{
                          backgroundColor: isSelected ? '#769656' : isDark ? '#b58863' : '#f0d9b5',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '32px',
                          cursor: 'pointer',
                          position: 'relative',
                          userSelect: 'none'
                        }}
                      >
                        {isLegal && (
                          <div style={{
                            position: 'absolute',
                            width: '14px',
                            height: '14px',
                            borderRadius: '50%',
                            backgroundColor: 'rgba(0,0,0,0.35)',
                            zIndex: 2
                          }} />
                        )}
                        <span style={{ color: piece?.color === 'w' ? '#fff' : '#000', textShadow: piece?.color === 'w' ? '0 0 2px #000' : 'none', zIndex: 1 }}>
                          {getPieceSymbol(piece)}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div style={{ marginTop: '12px', textAlign: 'center', fontWeight: 'bold', fontSize: '16px', color: '#ffcc00' }}>
              {statusText}
            </div>
          </div>

          {/* Side Panel: Game Info & Analysis */}
          <div style={{ backgroundColor: '#1e1e1e', padding: '15px', borderRadius: '8px', border: '1px solid #333' }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#ffcc00' }}>📋 Move History {"&"} Analysis</h3>

            {isGameOver && !isReviewing && (
              <button onClick={startReview} style={{ width: '100%', padding: '10px', backgroundColor: '#007bff', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', marginBottom: '15px' }}>
                🔍 Analyse Game Post-Mortem
              </button>
            )}

            {isReviewing && (
              <div style={{ backgroundColor: '#2a2a2a', padding: '12px', borderRadius: '6px', marginBottom: '15px', border: '1px solid #444' }}>
                <h4 style={{ margin: '0 0 8px 0', color: '#17a2b8' }}>🔬 Post-Game Analysis Mode</h4>
                <p style={{ margin: '4px 0', fontSize: '14px' }}>Move Step: {reviewIndex} / {moveHistory.length}</p>
                <p style={{ margin: '4px 0', fontSize: '14px', color: '#ffcc00' }}>{isAnalyzing ? 'Calculating evaluation...' : evalText}</p>
                {bestMoveHint && <p style={{ margin: '4px 0', fontSize: '14px', color: '#28a745', fontWeight: 'bold' }}>{bestMoveHint}</p>}

                <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                  <button onClick={() => updateReviewBoard(0)} disabled={reviewIndex === 0} style={btnStyle}>⏮ First</button>
                  <button onClick={() => updateReviewBoard(reviewIndex - 1)} disabled={reviewIndex === 0} style={btnStyle}>◀ Prev</button>
                  <button onClick={() => updateReviewBoard(reviewIndex + 1)} disabled={reviewIndex === moveHistory.length} style={btnStyle}>Next ▶</button>
                  <button onClick={() => updateReviewBoard(moveHistory.length)} disabled={reviewIndex === moveHistory.length} style={btnStyle}>⏭ Last</button>
                </div>
                <button onClick={exitReview} style={{ ...btnStyle, marginTop: '8px', backgroundColor: '#dc3545', width: '100%' }}>Exit Analysis</button>
              </div>
            )}

            <div style={{ maxHeight: '250px', overflowY: 'auto', backgroundColor: '#121212', padding: '10px', borderRadius: '6px', fontSize: '14px', border: '1px solid #333' }}>
              {moveHistory.length === 0 ? (
                <p style={{ color: '#888', fontStyle: 'italic', margin: 0 }}>No moves played yet.</p>
              ) : (
                <ol style={{ margin: 0, paddingLeft: '20px' }}>
                  {moveHistory.reduce((acc, move, idx) => {
                    if (idx % 2 === 0) acc.push([move]);
                    else acc[acc.length - 1].push(move);
                    return acc;
                  }, []).map((pair, idx) => (
                    <li key={idx} style={{ marginBottom: '4px' }}>
                      <span style={{ color: '#aaa' }}>{pair[0].san}</span>
                      {pair[1] && <span style={{ color: '#aaa', marginLeft: '12px' }}>{pair[1].san}</span>}
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const btnStyle = {
  flex: 1,
  padding: '6px',
  backgroundColor: '#3a3a3a',
  color: '#fff',
  border: '1px solid #555',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '12px'
};
