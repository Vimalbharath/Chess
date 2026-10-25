export function getNextValidMoveHint(chessGame, showNextValidMove, isGameOver, isReviewing, playerColor) {
  if (!showNextValidMove || isGameOver || isReviewing) return null;
  if (playerColor && chessGame.turn() !== playerColor) return null;
  const moves = chessGame.moves({ verbose: true });
  if (moves.length === 0) return null;
  const hint = moves[0];
  return `${hint.from.toUpperCase()} ➔ ${hint.to.toUpperCase()} (${hint.san})`;
}
