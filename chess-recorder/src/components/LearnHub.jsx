import React, { useState } from 'react';
import { EPISODES } from '../data/episodesData';

export default function LearnHub() {
  const [selectedEpisode, setSelectedEpisode] = useState(EPISODES[0]);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [showResults, setShowResults] = useState({});
  
  // Practice board state for episodes with placement/challenges
  const [placedPieces, setPlacedPieces] = useState({});
  const [selectedTrayPiece, setSelectedTrayPiece] = useState(null);
  const [practiceSuccess, setPracticeSuccess] = useState(false);

  const handleSelectEpisode = (ep) => {
    setSelectedEpisode(ep);
    setQuizAnswers({});
    setShowResults({});
    setPlacedPieces({});
    setSelectedTrayPiece(null);
    setPracticeSuccess(false);
  };

  const handleAnswerSelect = (qIdx, optIdx) => {
    setQuizAnswers(prev => ({ ...prev, [qIdx]: optIdx }));
    setShowResults(prev => ({ ...prev, [qIdx]: true }));
  };

  const handleSquareClick = (r, c) => {
    if (!selectedEpisode.targetSquare || practiceSuccess) return;

    if (selectedTrayPiece) {
      if (r === selectedEpisode.targetSquare.row && c === selectedEpisode.targetSquare.col && selectedTrayPiece === selectedEpisode.targetSquare.piece) {
        setPlacedPieces({ [`${r}-${c}`]: selectedTrayPiece });
        setPracticeSuccess(true);
        setSelectedTrayPiece(null);
      } else {
        // Incorrect square
        setPlacedPieces({ [`${r}-${c}`]: selectedTrayPiece });
        setTimeout(() => setPlacedPieces({}), 1000);
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
            {selectedEpisode.quiz ? '🧠 Interactive Quiz & Facts' : 'Interactive Practice Board'}
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
              {/* Piece Tray */}
              <div style={styles.pieceTray}>
                <span style={{ fontSize: '13px', color: '#aaa' }}>Available Piece:</span>
                <div
                  onClick={() => !practiceSuccess && setSelectedTrayPiece('R')}
                  style={{
                    ...styles.trayPiece,
                    backgroundColor: selectedTrayPiece === 'R' ? '#2e7d32' : '#2b5c8f',
                    cursor: practiceSuccess ? 'default' : 'pointer'
                  }}
                  title="Click to select Rook, then click target square"
                >
                  ♖
                </div>
              </div>

              <div style={styles.boardPlaceholder}>
                <div style={styles.miniBoard}>
                  {Array.from({ length: 8 }).map((_, r) =>
                    Array.from({ length: 8 }).map((_, c) => {
                      const isDark = (r + c) % 2 === 1;
                      const isTarget = selectedEpisode.targetSquare && selectedEpisode.targetSquare.row === r && selectedEpisode.targetSquare.col === c;
                      const placedPiece = placedPieces[`${r}-${c}`];

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
                            fontSize: '24px',
                            cursor: selectedTrayPiece ? 'pointer' : 'default'
                          }}
                        >
                          {isTarget && !placedPiece && <span style={{ color: 'gold', fontSize: '16px' }}>⭐</span>}
                          {placedPiece && <span>{placedPiece === 'R' ? '♖' : ''}</span>}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
              <p style={{ marginTop: '10px', fontSize: '13px', color: practiceSuccess ? '#4ade80' : '#ffcc00', textAlign: 'center' }}>
                {practiceSuccess ? '🎉 Correct! You placed the Rook on h5 successfully!' : 'Select the Rook from above, then click target square (h5, row 4, col 7)!'}
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
  pieceTray: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', backgroundColor: '#161616', padding: '8px 12px', borderRadius: '6px', border: '1px solid #333' },
  trayPiece: { width: '36px', height: '36px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', color: '#fff' },
  boardPlaceholder: { width: '100%', aspectRatio: '1 / 1', maxWidth: '300px', margin: '0 auto' },
  miniBoard: { display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gridTemplateRows: 'repeat(8, 1fr)', width: '100%', height: '100%', border: '2px solid #333' }
};
