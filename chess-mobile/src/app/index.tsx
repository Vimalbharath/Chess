import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Dimensions,
  Platform,
  Alert,
} from 'react-native';
import { Chess } from 'chess.js';
import { io } from 'socket.io-client';

const SOCKET_URL = 'https://chess-server-c5fk.onrender.com';
const socket = io(SOCKET_URL);

const pieceSymbols = {
  w: { p: '♙', n: '♘', b: '♗', r: '♖', q: '♕', k: '♔' },
  b: { p: '♟', n: '♞', b: '♝', r: '♜', q: '♛', k: '♚' },
};

const pieceValues = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

export default function HomeScreen() {
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
  const [timerType, setTimerType] = useState('timed');
  const [selectedMinutes, setSelectedMinutes] = useState(10);
  const [selectedIncrement, setSelectedIncrement] = useState(0);

  // Clocks State
  const [timeControl, setTimeControl] = useState({ type: 'untimed' });
  const [whiteTime, setWhiteTime] = useState(null);
  const [blackTime, setBlackTime] = useState(null);

  // Gameplay Settings
  const [alertOnCheck, setAlertOnCheck] = useState(true);

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
  const [showHints, setShowHints] = useState(true);
  const [showCheckHighlight, setShowCheckHighlight] = useState(true);
  const [showLastMove, setShowLastMove] = useState(true);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewIndex, setReviewIndex] = useState(-1);
  const [pendingPromotion, setPendingPromotion] = useState(null);
  const [drawOffered, setDrawOffered] = useState(false);
  const [, setRefreshKey] = useState(0);

  // --- Clock Interval Timer ---
  useEffect(() => {
    if (inLobby || isGameOver || isReviewing || timeControl.type !== 'timed') return;
    if (playersList.length < 2) return;

    const interval = setInterval(() => {
      const turn = chessGame.turn();
      if (turn === 'w') {
        setWhiteTime((prev) => {
          if (prev === null) return null;
          if (prev <= 1) {
            clearInterval(interval);
            handleTimeExpiration('w');
            return 0;
          }
          return prev - 1;
        });
      } else {
        setBlackTime((prev) => {
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

      const me = players?.find((p) => p.id === socket.id);
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
      setRefreshKey((prev) => prev + 1);

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
      setRefreshKey((prev) => prev + 1);
      checkGameStatus();
    });

    socket.on('time-expired', ({ color }) => {
      const winner = color === 'w' ? 'Black' : 'White';
      setIsGameOver(true);
      setStatusText(`⏰ Time out! ${winner} wins on time.`);
    });

    socket.on('chat-message', (msg) => {
      setChatMessages((prev) => [...prev, msg]);
    });

    socket.on('player-disconnected', ({ disconnectedPlayer }) => {
      showToast(`⚠️ ${disconnectedPlayer || 'Opponent'} disconnected!`);
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
      if (wt !== undefined) setWhiteTime(wt);
      if (bt !== undefined) setBlackTime(bt);
      setRefreshKey((prev) => prev + 1);
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
      Alert.alert('Room Full', 'This room is already full!');
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

    ['q', 'r', 'b', 'n', 'p'].forEach((type) => {
      const whiteLost = initialCounts[type] - currentCounts['w'][type];
      for (let i = 0; i < whiteLost; i++) capturedByBlack.push(pieceSymbols['w'][type]);

      const blackLost = initialCounts[type] - currentCounts['b'][type];
      for (let i = 0; i < blackLost; i++) capturedByWhite.push(pieceSymbols['b'][type]);
    });

    let whiteScore = 0;
    let blackScore = 0;
    Object.keys(currentCounts.w).forEach((type) => {
      whiteScore += currentCounts.w[type] * pieceValues[type];
      blackScore += currentCounts.b[type] * pieceValues[type];
    });

    const diff = whiteScore - blackScore;

    return {
      capturedByWhite,
      capturedByBlack,
      whiteAdvantage: diff > 0 ? `+${diff}` : '',
      blackAdvantage: diff < 0 ? `+${Math.abs(diff)}` : '',
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
      showToast("Waiting for an opponent to join!");
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
        setRefreshKey((prev) => prev + 1);
        checkGameStatus();

        socket.emit('make-move', {
          roomCode,
          pgn: currentPgn,
          history: fullHistory,
          move,
          whiteTime: updatedWhiteTime,
          blackTime: updatedBlackTime,
        });
        return true;
      }
    } catch {
      showToast("⚠️ Invalid move!");
    }
    return false;
  };

  const handlePromotionSelect = (promoPiece) => {
    if (!pendingPromotion) return;
    executeMove(pendingPromotion.from, pendingPromotion.to, promoPiece);
  };

  const handleSquareClick = (squareCoord) => {
    if (isGameOver || isReviewing) return;

    if (!selectedSquare) {
      const piece = chessGame.get(squareCoord);
      if (piece && piece.color === chessGame.turn()) {
        setSelectedSquare(squareCoord);
        if (showHints) {
          const moves = chessGame.moves({ square: squareCoord, verbose: true });
          setLegalMoves(moves.map((m) => m.to));
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
      const isValid = moves.some((m) => m.to === squareCoord);
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
          setLegalMoves(moves.map((m) => m.to));
        } else {
          setLegalMoves([]);
        }
      } else {
        setSelectedSquare(null);
        setLegalMoves([]);
      }
    }
  };

  const handleResign = () => {
    Alert.alert('Resign', 'Are you sure you want to resign?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Resign',
        style: 'destructive',
        onPress: () => {
          const me = playersList.find((p) => p.id === socket.id);
          const playerNameFormatted = me ? me.name : 'Player';
          socket.emit('resign', { roomCode, player: playerNameFormatted });
          setIsGameOver(true);
          setStatusText(`🏳️ You resigned. Game Over!`);
        },
      },
    ]);
  };

  const handleOfferDraw = () => {
    const me = playersList.find((p) => p.id === socket.id);
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
    Alert.alert('Play Again', 'Reset board for both players?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', onPress: () => socket.emit('reset-game', { roomCode }) },
    ]);
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
    setRefreshKey((prev) => prev + 1);
  };

  const goToReviewStep = (idx) => {
    setReviewIndex(idx);
    updateReviewBoard(idx);
  };

  const exitReview = () => {
    setIsReviewing(false);
    chessGame.reset();
    moveHistory.forEach((m) => chessGame.move(m));
    setRefreshKey((prev) => prev + 1);
  };

  const copyInviteLink = () => {
    const inviteUrl = `https://chess-qct9.onrender.com/?room=${roomCode}`;
    Alert.alert('Invite Link', inviteUrl);
  };

  const createRoom = () => {
    const name = playerName.trim() || 'Player 1';
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const tc = timerType === 'timed'
      ? { type: 'timed', minutes: Number(selectedMinutes), increment: Number(selectedIncrement) }
      : { type: 'untimed' };
    socket.emit('join-room', { roomCode: code, playerName: name, timeControl: tc });
  };

  const joinRoom = () => {
    if (!roomInput.trim()) return;
    const name = playerName.trim() || 'Player 2';
    socket.emit('join-room', { roomCode: roomInput.trim().toUpperCase(), playerName: name });
  };

  const sendChat = () => {
    if (!chatInput.trim()) return;
    socket.emit('send-chat', {
      roomCode,
      playerName: playerName || 'Player',
      message: chatInput.trim(),
    });
    setChatInput('');
  };

  const formatTime = (seconds) => {
    if (seconds === null || seconds === undefined) return '--:--';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const checkKingSquare = chessGame.inCheck() ? getKingSquare(chessGame.turn()) : null;
  const capturedInfo = getCapturedPieces();
  const lastMove = isReviewing && reviewIndex >= 0
    ? moveHistory[reviewIndex]
    : (moveHistory.length > 0 ? moveHistory[moveHistory.length - 1] : null);

  // --- Render Lobby ---
  if (inLobby) {
    return (
      <SafeAreaView style={styles.lobbyContainer}>
        <View style={styles.lobbyCard}>
          <Text style={styles.lobbyTitle}>Multiplayer Chess</Text>
          <Text style={styles.lobbySubtitle}>Set your name, timer rules, and preferences.</Text>

          <Text style={styles.label}>Your Name:</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Player 1"
            placeholderTextColor="#666"
            value={playerName}
            onChangeText={setPlayerName}
          />

          <View style={styles.templateBox}>
            <Text style={styles.templateTitle}>⏱️ Timer & Templates:</Text>
            <View style={styles.templateButtons}>
              <TouchableOpacity
                style={[styles.templateBtn, selectedMinutes === 3 && selectedIncrement === 5 ? styles.btnActive : styles.btnInactive]}
                onPress={() => { setTimerType('timed'); setSelectedMinutes(3); setSelectedIncrement(5); }}
              >
                <Text style={styles.btnText}>3m + 5s</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.templateBtn, selectedMinutes === 10 && selectedIncrement === 0 ? styles.btnActive : styles.btnInactive]}
                onPress={() => { setTimerType('timed'); setSelectedMinutes(10); setSelectedIncrement(0); }}
              >
                <Text style={styles.btnText}>10m</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.templateBtn, timerType === 'untimed' ? styles.btnActive : styles.btnInactive]}
                onPress={() => setTimerType('untimed')}
              >
                <Text style={styles.btnText}>No Timer</Text>
              </TouchableOpacity>
            </View>

            {timerType === 'timed' && (
              <View style={styles.timerInputsRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.subLabel}>Minutes:</Text>
                  <TextInput
                    style={styles.input}
                    keyboardValue="numeric"
                    keyboardType="numeric"
                    value={String(selectedMinutes)}
                    onChangeText={(val) => setSelectedMinutes(Number(val))}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.subLabel}>Inc (sec):</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={String(selectedIncrement)}
                    onChangeText={(val) => setSelectedIncrement(Number(val))}
                  />
                </View>
              </View>
            )}
          </View>

          <View style={styles.checkboxRow}>
            <Text style={styles.label}>Alert on Check:</Text>
            <TouchableOpacity onPress={() => setAlertOnCheck(!alertOnCheck)}>
              <Text style={{ color: alertOnCheck ? '#4ade80' : '#888', fontSize: 16, fontWeight: 'bold' }}>
                {alertOnCheck ? '☑️ ON' : '☐ OFF'}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={[styles.primaryButton, { backgroundColor: '#2e7d32', marginBottom: 15 }]} onPress={createRoom}>
            <Text style={styles.buttonText}>➕ Create New Room</Text>
          </TouchableOpacity>

          <View style={styles.divider}>
            <Text style={styles.label}>Or Join Existing Room:</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 5 }}>
              <TextInput
                style={styles.input}
                placeholder="Room Code"
                placeholderTextColor="#666"
                autoCapitalize="characters"
                value={roomInput}
                onChangeText={(val) => setRoomInput(val.toUpperCase())}
              />
              <TouchableOpacity style={[styles.primaryButton, { backgroundColor: '#2b5c8f', paddingHorizontal: 16 }]} onPress={joinRoom}>
                <Text style={styles.buttonText}>Join</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </SafeAreaView>
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
        <TouchableOpacity
          key={squareName}
          activeOpacity={0.9}
          onPress={() => handleSquareClick(squareName)}
          style={[styles.square, { backgroundColor: bg }]}
        >
          {fIdx === 0 && <Text style={styles.rankLabel}>{rank}</Text>}
          {rIdx === 7 && <Text style={styles.fileLabel}>{file}</Text>}

          {isLegalTarget && showHints && !isGameOver && !isReviewing && (
            <View
              style={[
                styles.hintDot,
                { backgroundColor: isCaptureTarget ? 'rgba(255, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.35)' },
              ]}
            />
          )}

          {piece && (
            <View style={styles.pieceWrapper}>
              <Text
                style={[
                  styles.piece,
                  { color: piece.color === 'w' ? '#ffffff' : '#000000' },
                ]}
              >
                {pieceSymbols[piece.color][piece.type]}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      );
    });
  });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.roomHeader}>
          <View>
            <Text style={styles.roomTitle}>Room: <Text style={{ color: '#ffcc00' }}>{roomCode}</Text></Text>
            <Text style={styles.subText}>
              You: <Text style={{ fontWeight: 'bold' }}>{playerName || 'Player'}</Text> ({playerColor === 'w' ? 'White ⚪' : 'Black ⚫'})
            </Text>
          </View>
          <TouchableOpacity style={styles.smallBtn} onPress={copyInviteLink}>
            <Text style={styles.btnText}>🔗 Invite</Text>
          </TouchableOpacity>
        </View>

        {toastMessage !== '' && (
          <View style={styles.toastBanner}>
            <Text style={{ color: '#fff', fontSize: 13, textAlign: 'center' }}>{toastMessage}</Text>
          </View>
        )}

        {drawOffered && !isGameOver && (
          <View style={styles.drawBanner}>
            <Text style={{ color: '#fff', fontSize: 13 }}>🤝 Opponent offered a draw!</Text>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <TouchableOpacity style={[styles.smallBtn, { backgroundColor: '#2e7d32' }]} onPress={handleAcceptDraw}>
                <Text style={styles.btnText}>Accept</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.smallBtn, { backgroundColor: '#a83232' }]} onPress={() => setDrawOffered(false)}>
                <Text style={styles.btnText}>Decline</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {timeControl.type === 'timed' && (
          <View style={styles.timerBar}>
            <View style={[styles.clockBox, chessGame.turn() === 'w' && !isGameOver && { borderColor: '#ffcc00' }]}>
              <Text style={styles.clockText}>⚪ White: {formatTime(whiteTime)}</Text>
            </View>
            <View style={[styles.clockBox, chessGame.turn() === 'b' && !isGameOver && { borderColor: '#ffcc00' }]}>
              <Text style={styles.clockText}>⚫ Black: {formatTime(blackTime)}</Text>
            </View>
          </View>
        )}

        <View style={styles.capturedBar}>
          <Text style={styles.capturedText}>Black: {capturedInfo.capturedByBlack.join(' ')}</Text>
          <Text style={{ color: '#ffcc00', fontWeight: 'bold' }}>{capturedInfo.blackAdvantage}</Text>
        </View>

        <View style={styles.boardWrapper}>
          <View style={styles.boardGrid}>{boardSquares}</View>

          {pendingPromotion && (
            <View style={styles.gameOverOverlay}>
              <View style={styles.gameOverModal}>
                <Text style={styles.modalTitle}>Choose Promotion Piece</Text>
                <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'center' }}>
                  {['q', 'r', 'b', 'n'].map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={styles.promoBtn}
                      onPress={() => handlePromotionSelect(type)}
                    >
                      <Text style={{ fontSize: 30, color: '#fff' }}>{pieceSymbols[chessGame.turn()][type]}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          )}

          {isGameOver && !isReviewing && (
            <View style={styles.gameOverOverlay}>
              <View style={styles.gameOverModal}>
                <Text style={styles.modalTitle}>Game Over</Text>
                <Text style={styles.modalSub}>{statusText}</Text>
                <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <TouchableOpacity style={styles.newGameButton} onPress={startReview}>
                    <Text style={styles.buttonText}>🔍 Review</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.newGameButton, { backgroundColor: '#2b5c8f' }]} onPress={handleReset}>
                    <Text style={styles.buttonText}>🎮 Play Again</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </View>

        <View style={styles.capturedBar}>
          <Text style={styles.capturedText}>White: {capturedInfo.capturedByWhite.join(' ')}</Text>
          <Text style={{ color: '#ffcc00', fontWeight: 'bold' }}>{capturedInfo.whiteAdvantage}</Text>
        </View>

        <View style={styles.controls}>
          <TouchableOpacity style={[styles.controlBtn, { backgroundColor: '#d97706' }]} onPress={() => setIsFlipped(!isFlipped)}>
            <Text style={styles.btnText}>🔄 Flip</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.controlBtn, { backgroundColor: showLastMove ? '#2e7d32' : '#555' }]} onPress={() => setShowLastMove(!showLastMove)}>
            <Text style={styles.btnText}>Last Move</Text>
          </TouchableOpacity>
          {!isGameOver && (
            <>
              <TouchableOpacity style={[styles.controlBtn, { backgroundColor: '#9a3412' }]} onPress={handleOfferDraw}>
                <Text style={styles.btnText}>🤝 Draw</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.controlBtn, { backgroundColor: '#a83232' }]} onPress={handleResign}>
                <Text style={styles.btnText}>🏳️ Resign</Text>
              </TouchableOpacity>
            </>
          )}
          {isGameOver && !isReviewing && (
            <TouchableOpacity style={[styles.controlBtn, { backgroundColor: '#2e7d32' }]} onPress={startReview}>
              <Text style={styles.btnText}>🔍 Review</Text>
            </TouchableOpacity>
          )}
          {isReviewing && (
            <TouchableOpacity style={[styles.controlBtn, { backgroundColor: '#2e7d32' }]} onPress={exitReview}>
              <Text style={styles.btnText}>❌ Exit Review</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={[styles.statusBox, isGameOver && { borderColor: '#ffcc00' }]}>
          <Text style={[styles.statusText, isGameOver && { color: '#ffcc00' }]}>
            {isReviewing ? `🔍 Reviewing move ${reviewIndex + 1} of ${moveHistory.length}` : statusText}
          </Text>
        </View>

        <View style={styles.sectionHeaderContainer}>
          <Text style={styles.sectionHeader}>Full Move History</Text>
        </View>
        <View style={styles.outputBox}>
          {moveHistory.length === 0 ? (
            <Text style={{ color: '#666', fontStyle: 'italic', fontSize: 13 }}>No moves yet...</Text>
          ) : (
            Array.from({ length: Math.ceil(moveHistory.length / 2) }).map((_, rIdx) => {
              const wMove = moveHistory[rIdx * 2];
              const bMove = moveHistory[rIdx * 2 + 1];
              return (
                <View key={rIdx} style={{ flexDirection: 'row', fontSize: 13, marginBottom: 4 }}>
                  <Text style={{ width: 35, color: '#888', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' }}>{rIdx + 1}.</Text>
                  <Text
                    onPress={() => isReviewing && goToReviewStep(rIdx * 2)}
                    style={{
                      width: 70,
                      color: '#fff',
                      backgroundColor: reviewIndex === rIdx * 2 ? '#2e7d32' : 'transparent',
                      fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
                    }}
                  >
                    {wMove ? wMove.san : ''}
                  </Text>
                  <Text
                    onPress={() => bMove && isReviewing && goToReviewStep(rIdx * 2 + 1)}
                    style={{
                      width: 70,
                      color: '#fff',
                      backgroundColor: reviewIndex === rIdx * 2 + 1 ? '#2e7d32' : 'transparent',
                      fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
                    }}
                  >
                    {bMove ? bMove.san : ''}
                  </Text>
                </View>
              );
            })
          )}
        </View>

        {isReviewing && (
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
            <TouchableOpacity style={[styles.controlBtn, { flex: 1 }]} onPress={() => reviewIndex > -1 && goToReviewStep(reviewIndex - 1)}>
              <Text style={styles.btnText}>◀ Prev</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.controlBtn, { flex: 1 }]} onPress={() => reviewIndex < moveHistory.length - 1 && goToReviewStep(reviewIndex + 1)}>
              <Text style={styles.btnText}>Next ▶</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.sectionHeaderContainer}>
          <Text style={styles.sectionHeader}>Room Chat</Text>
        </View>
        <View style={styles.chatBox}>
          {chatMessages.length === 0 ? (
            <Text style={{ color: '#666', fontStyle: 'italic', fontSize: 13 }}>No messages yet...</Text>
          ) : (
            chatMessages.map((msg, idx) => (
              <View key={idx} style={{ marginBottom: 6 }}>
                <Text style={{ color: '#ffcc00', fontWeight: 'bold', fontSize: 13 }}>{msg.playerName}: <Text style={{ color: '#e0e0e0', fontWeight: 'normal' }}>{msg.message}</Text></Text>
              </View>
            ))
          )}
        </View>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, marginBottom: 30 }}>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor="#666"
            value={chatInput}
            onChangeText={setChatInput}
          />
          <TouchableOpacity style={[styles.primaryButton, { backgroundColor: '#2e7d32', paddingHorizontal: 16, marginBottom: 0 }]} onPress={sendChat}>
            <Text style={styles.buttonText}>Send</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const screenWidth = Dimensions.get('window').width;
const boardSize = Math.min(screenWidth - 24, 400);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  scrollContent: { padding: 12, alignItems: 'center' },
  lobbyContainer: { flex: 1, backgroundColor: '#121212', justifyContent: 'center', alignItems: 'center' },
  lobbyCard: { backgroundColor: '#1e1e1e', padding: 20, borderRadius: 8, width: '90%', maxWidth: 380, borderWidth: 1, borderColor: '#333' },
  lobbyTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff', marginBottom: 6, textAlign: 'center' },
  lobbySubtitle: { color: '#aaa', marginBottom: 15, fontSize: 13, textAlign: 'center' },
  label: { fontSize: 12, color: '#888', marginBottom: 4 },
  subLabel: { fontSize: 11, color: '#888', marginBottom: 2 },
  input: { flex: 1, backgroundColor: '#121212', borderWidth: 1, borderColor: '#444', borderRadius: 6, color: '#fff', padding: 10, fontSize: 14 },
  templateBox: { backgroundColor: '#161616', padding: 10, borderRadius: 6, borderWidth: 1, borderColor: '#333', marginBottom: 12 },
  templateTitle: { fontSize: 12, color: '#ffcc00', fontWeight: 'bold', marginBottom: 6 },
  templateButtons: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  templateBtn: { flex: 1, paddingVertical: 6, borderRadius: 4, alignItems: 'center' },
  btnActive: { backgroundColor: '#2e7d32' },
  btnInactive: { backgroundColor: '#333' },
  btnText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  timerInputsRow: { flexDirection: 'row', gap: 8 },
  checkboxRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#161616', padding: 10, borderRadius: 6, borderWidth: 1, borderColor: '#333', marginBottom: 15 },
  primaryButton: { padding: 12, borderRadius: 6, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  divider: { borderTopWidth: 1, borderTopColor: '#333', paddingTop: 12 },
  roomHeader: { flexDirection: 'row', justifyContent: 'space-between', width: boardSize, marginBottom: 8, alignItems: 'center', backgroundColor: '#1a1a1a', padding: 10, borderRadius: 6 },
  roomTitle: { fontSize: 15, fontWeight: 'bold', color: '#fff' },
  subText: { fontSize: 12, color: '#888' },
  smallBtn: { backgroundColor: '#2b5c8f', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 6 },
  toastBanner: { width: boardSize, backgroundColor: '#d32f2f', padding: 6, borderRadius: 4, marginBottom: 8 },
  drawBanner: { width: boardSize, backgroundColor: '#9a3412', padding: 8, borderRadius: 6, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  timerBar: { width: boardSize, flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6, gap: 8 },
  clockBox: { flex: 1, backgroundColor: '#1a1a1a', borderWidth: 2, borderColor: '#444', padding: 6, borderRadius: 6, alignItems: 'center' },
  clockText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  capturedBar: { width: boardSize, flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#1a1a1a', padding: 4, borderRadius: 4, marginBottom: 6 },
  capturedText: { fontSize: 12, color: '#bbb' },
  boardWrapper: { width: boardSize, height: boardSize, marginBottom: 6, position: 'relative' },
  boardGrid: { width: '100%', height: '100%', borderWidth: 3, borderColor: '#333', borderRadius: 4, flexDirection: 'row', flexWrap: 'wrap' },
  square: { width: '12.5%', height: '12.5%', justifyContent: 'center', alignItems: 'center', position: 'relative' },
  pieceWrapper: { justifyContent: 'center', alignItems: 'center' },
  piece: { fontSize: 32 },
  hintDot: { position: 'absolute', width: 14, height: 14, borderRadius: 7 },
  rankLabel: { position: 'absolute', top: 2, left: 3, fontSize: 9, color: '#333', opacity: 0.7, fontWeight: 'bold' },
  fileLabel: { position: 'absolute', bottom: 2, right: 4, fontSize: 9, color: '#333', opacity: 0.7, fontWeight: 'bold' },
  gameOverOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', borderRadius: 4 },
  gameOverModal: { backgroundColor: '#1e1e1e', padding: 20, borderRadius: 8, alignItems: 'center', borderWidth: 2, borderColor: '#ffcc00', width: '80%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#ffcc00', marginBottom: 10 },
  modalSub: { fontSize: 14, color: '#fff', marginBottom: 15, textAlign: 'center' },
  promoBtn: { backgroundColor: '#333', borderWidth: 1, borderColor: '#555', borderRadius: 6, padding: 8 },
  newGameButton: { backgroundColor: '#2e7d32', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 6 },
  controls: { flexDirection: 'row', gap: 6, justifyContent: 'center', marginBottom: 8, width: boardSize, flexWrap: 'wrap' },
  controlBtn: { backgroundColor: '#2b5c8f', paddingVertical: 8, paddingHorizontal: 10, borderRadius: 6 },
  statusBox: { width: boardSize, backgroundColor: '#1a1a1a', padding: 8, borderRadius: 4, alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: '#444' },
  statusText: { fontSize: 13, fontWeight: 'bold', color: '#aaa', textAlign: 'center' },
  sectionHeaderContainer: { width: boardSize, marginTop: 6, marginBottom: 4 },
  sectionHeader: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  outputBox: { width: boardSize, backgroundColor: '#1e1e1e', borderWidth: 1, borderColor: '#333', borderRadius: 6, padding: 10, height: 130 },
  chatBox: { width: boardSize, backgroundColor: '#1e1e1e', borderWidth: 1, borderColor: '#333', borderRadius: 6, padding: 10, height: 110 },
});
