import React, { useState } from 'react';
import { EPISODES } from '../data/episodesData';

const whitePieceSymbols = {
  wP: '♙', wN: '♘', wB: '♗', wR: '♖', wQ: '♕', wK: '♔'
};

const allPieceSymbols = {
  wP: '♙', wN: '♘', wB: '♗', wR: '♖', wQ: '♕', wK: '♔',
  bP: '♟', bN: '♞', bB: '♝', bR: '♜', bQ: '♛', bK: '♚'
};

export default function LearnHub() {
  const [selectedEpisode, setSelectedEpisode] = useState(EPISODES[0]);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [showResults, setShowResults] = useState({});
  
  // Classic Setup Challenge state
  const [placedPieces, setPlacedPieces] = useState({});
  const [selectedTrayPiece, setSelectedTrayPiece] = useState(null);
  const [practiceSuccess, setPracticeSuccess] = useState(false);

  const handleSelectEpisode = (ep) => {
    setSelectedEpisode(ep);
    setQuizAnswers({});
    setShowResults({});
    setPlacedPieces(ep.prePlaced ? { ...ep.prePlaced } : {});
    setSelectedTrayPiece(null);
    setPracticeSuccess(false);
  };

  const handleAnswerSelect = (qIdx, optIdx) => {
    setQuizAnswers(prev => ({ ...prev, [qIdx]: optIdx }));
    setShowResults(prev => ({ ...prev, [qIdx] : true }));
  };

  const handleSquareClick = (r, c) => {
    if (!selectedEpisode.isClassicSetupChallenge || practiceSuccess) return;

    // Do not allow overwriting preplaced black pieces
    if (selectedEpisode.prePlaced && selectedEpisode.prePlaced[`${r}-${c}`]) return;

    if (selectedTrayPiece) {
      const targetPiece = selectedEpisode.classicTargets[`${r}-${c}`];
      if (targetPiece === selectedTrayPiece) {
        const newPlaced = { ...placedPieces, [`${r}-${c}`]: selectedTrayPiece };
        setPlacedPieces(newPlaced);
        setSelectedTrayPiece(null);

        if (Object.keys(newPlaced).length === (Object.keys(selectedEpisode.prePlaced || {}).length + Object.keys(selectedEpisode.classicTargets).length)) {
          setPracticeSuccess(true);
        }
      } else {
        const tempPlaced = { ...placedPieces, [`${r}-${c}`]: selectedTrayPiece };
        setPlacedPieces(tempPlaced);
        setTimeout(() => {
          setPlacedPieces(prev => {
            const copy = { ...prev };
            delete copy[`${r}-${c}`];
            return copy;
          });
        }, 800);
      }
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={{ color: '#ffcc00', marginBottom: '15px' }}><span>🎓</span> Learn & Practice Hub</h2>
      
      <div style={{ marginBottom: '15px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {EPISODES.map(ep => (
          <button
            key={ep.id}
            onClick={() => handleSelectEpisode(ep)}
            style={{
              ...styles.tabButton,
              backgroundColor: selectedEpisode.id === ep.id ? '#2e7d32' : '#2b5c8f'
            }}
          >
            {ep.title}
          </button>
        ))}
      </div>

      <div style={styles.gridContainer}>
        <div style={styles.card}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '16px' }}>{selectedEpisode.title}</h3>
          <div style={styles.videoWrapper}>
            <iframe
              width="100%"
              height="100%"
              src={`https://www.youtube.com/embed/${selectedEpisode.youtubeId}`}
              title="YouTube video player"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
          </div>
          <p style={{ marginTop: '10px', fontSize: '13px', color: '#ccc' }}>
            <strong>Task:</strong> {selectedEpisode.taskDescription}
          </p>
        </div>

        <div style={styles.card}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '16px' }}>
            {selectedEpisode.quiz ? '🧠 Interactive Quiz & Facts' : 'Classic Setup Practice Board'}
          </h3>

          {selectedEpisode.quiz ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxHeight: '400px', overflowY: 'auto', paddingRight: '5px' }}>
              {selectedEpisode.quiz.map((q, qIdx) => {
                const isAnswered = showResults[qIdx];
                const selectedOpt = quizAnswers[qIdx];

                return (
                  <div key={qIdx} style={{ backgroundColor: '#161616', padding: '12px', borderRadius: '6px', border: '1px solid #333' }}>
                    <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#ffcc00', fontWeight: 'bold' }}>
                      Q{qIdx + 1}: {q.question}
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                      {q.options.map((opt, optIdx) => {
                        let btnBg = '#2b5c8f';
                        if (isAnswered) {
                          if (optIdx === q.correct) btnBg = '#2e7d32';
                          else if (selectedOpt === optIdx) btnBg = '#a83232';
                        }

                        return (
                          <button
                            key={optIdx}
                            onClick={() => !isAnswered && handleAnswerSelect(qIdx, optIdx)}
                            style={{
                              padding: '8px',
                              borderRadius: '4px',
                              border: 'none',
                              color: '#fff',
                              cursor: isAnswered ? 'default' : 'pointer',
                              backgroundColor: btnBg,
                              fontSize: '13px'
                            }}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                    {isAnswered && (
                      <p style={{ marginTop: '8px', fontSize: '12px', color: '#a3e635', fontStyle: 'italic' }}>
                        {q.fact}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <>
              <div style={styles.boardPlaceholder}>
                <div style={styles.miniBoard}>
                  {Array.from({ length: 8 }).map((_, r) =>
                    Array.from({ length: 8 }).map((_, c) => {
                      const isDark = (r + c) % 2 === 1;
                      const placedPiece = placedPieces[`${r}-${c}`];
                      const isTargetSquare = selectedEpisode.classicTargets && selectedEpisode.classicTargets[`${r}-${c}`];

                      return (
                        <div
                          key={`${r}-${c}`}
                          onClick={() => handleSquareClick(r, c)}
                          style={{
                            backgroundColor: isDark ? '#b58863' : '#f0d9b5',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            position: 'relative',
                            fontSize: '20px',
                            cursor: selectedTrayPiece ? 'pointer' : 'default',
                            boxShadow: isTargetSquare && !placedPiece ? 'inset 0 0 4px 1px rgba(255, 215, 0, 0.5)' : 'none'
                          }}
                        >
                          {placedPiece && (
                            <span style={{ color: placedPiece.startsWith('w') ? '#fff' : '#000', textShadow: placedPiece.startsWith('w') ? '0 1px 2px rgba(0,0,0,0.9)' : '0 1px 2px rgba(255,255,255,0.5)' }}>
                              {allPieceSymbols[placedPiece]}
                            </span>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Piece Tray at the downside (White pieces for user placement) */}
              <div style={styles.pieceTrayContainer}>
                <span style={{ fontSize: '12px', color: '#aaa', display: 'block', marginBottom: '4px' }}>Select White Piece from Tray:</span>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'center' }}>
                  {Object.keys(whitePieceSymbols).map(pieceKey => (
                    <div
                      key={pieceKey}
                      onClick={() => !practiceSuccess && setSelectedTrayPiece(pieceKey)}
                      style={{
                        ...styles.trayPiece,
                        backgroundColor: selectedTrayPiece === pieceKey ? '#2e7d32' : '#2b5c8f',
                        cursor: practiceSuccess ? 'default' : 'pointer'
                      }}
                    >
                      {whitePieceSymbols[pieceKey]}
                    </div>
                  ))}
                </div>
              </div>

              <p style={{ marginTop: '10px', fontSize: '13px', color: practiceSuccess ? '#4ade80' : '#ffcc00', textAlign: 'center' }}>
                {practiceSuccess ? '🎉 Fantastic! All white pieces placed correctly on ranks 1 & 2!' : selectedTrayPiece ? `Selected ${whitePieceSymbols[selectedTrayPiece]}. Click correct square!` : 'Select a white piece from the tray below.'}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { padding: '20px', maxWidth: '1000px', margin: '0 auto', color: '#fff', fontFamily: 'sans-serif' },
  tabButton: { padding: '8px 14px', borderRadius: '6px', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '13px' },
  gridContainer: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' },
  card: { backgroundColor: '#1e1e1e', border: '1px solid #333', borderRadius: '8px', padding: '15px', boxSizing: 'border-box' },
  videoWrapper: { width: '100%', aspectRatio: '16 / 9', backgroundColor: '#000', borderRadius: '6px', overflow: 'hidden' },
  pieceTrayContainer: { marginTop: '12px', backgroundColor: '#161616', padding: '8px 12px', borderRadius: '6px', border: '1px solid #333' },
  trayPiece: { width: '32px', height: '32px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', color: '#fff' },
  boardPlaceholder: { width: '100%', aspectRatio: '1 / 1', maxWidth: '260px', margin: '0 auto' },
  miniBoard: { display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gridTemplateRows: 'repeat(8, 1fr)', width: '100%', height: '100%', border: '2px solid #333' }
};
