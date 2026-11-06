import React, { useState } from 'react';
import { EPISODES } from '../data/episodesData';

export default function LearnHub() {
  const [selectedEpisode, setSelectedEpisode] = useState(EPISODES[0]);
  const [practiceStatus] = useState('Challenge: Move your piece to the target square!');

  return (
    <div style={styles.container}>
      <h2 style={{ color: '#ffcc00', marginBottom: '15px' }}><span>🎓</span> Learn & Practice Hub</h2>
      
      <div style={{ marginBottom: '15px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {EPISODES.map(ep => (
          <button
            key={ep.id}
            onClick={() => setSelectedEpisode(ep)}
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
          <h3 style={{ margin: '0 0 10px 0', fontSize: '16px' }}>Interactive Practice Board</h3>
          <div style={styles.boardPlaceholder}>
            <div style={styles.miniBoard}>
              {Array.from({ length: 8 }).map((_, r) =>
                Array.from({ length: 8 }).map((_, c) => {
                  const isDark = (r + c) % 2 === 1;
                  const isTarget = selectedEpisode.targetSquare && selectedEpisode.targetSquare.row === r && selectedEpisode.targetSquare.col === c;
                  const pieceObj = selectedEpisode.initialBoard.find(p => p.row === r && p.col === c);

                  return (
                    <div
                      key={`${r}-${c}`}
                      style={{
                        backgroundColor: isDark ? '#b58863' : '#f0d9b5',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                        fontSize: '24px'
                      }}
                    >
                      {isTarget && <span style={{ color: 'gold' }}>⭐</span>}
                      {pieceObj && pieceObj.piece === 'R' && <span>♖</span>}
                    </div>
                  );
                })
              )}
            </div>
          </div>
          <p style={{ marginTop: '10px', fontSize: '13px', color: '#ffcc00' }}>{practiceStatus}</p>
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
  boardPlaceholder: { width: '100%', aspectRatio: '1 / 1', maxWidth: '320px', margin: '0 auto' },
  miniBoard: { display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gridTemplateRows: 'repeat(8, 1fr)', width: '100%', height: '100%', border: '2px solid #333' }
};
