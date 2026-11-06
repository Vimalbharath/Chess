export const EPISODES = [
  {
    id: "ep-01",
    title: "Episode 01: The Board & Coordinates",
    youtubeId: "VMj-3S1tku0",
    taskDescription: "Test your knowledge on the chess board geometry, squares, and coordinates!",
    quiz: [
      {
        question: "How many total squares are on a standard chess board?",
        options: ["32", "48", "64", "80"],
        correct: 2,
        fact: "Interesting Fact: The 64 squares alternate in color between light and dark."
      },
      {
        question: "How many dark (or light) squares are on the board?",
        options: ["16", "32", "64", "24"],
        correct: 1,
        fact: "Interesting Fact: Exactly half of the board is light and half is dark!"
      },
      {
        question: "How many horizontal rows (ranks) and vertical columns (files) does a chess board have?",
        options: ["6 rows, 6 columns", "8 rows, 8 columns", "10 rows, 10 columns", "7 rows, 7 columns"],
        correct: 1,
        fact: "Interesting Fact: Ranks are numbered 1-8 and files are lettered a-h."
      }
    ],
    initialBoard: [],
    targetSquare: null
  },
  {
    id: "ep-02",
    title: "Episode 02: Pawn Power",
    youtubeId: "VMj-3S1tku0",
    taskDescription: "Test your knowledge on chess pieces, counts, and pawn setup!",
    quiz: [
      {
        question: "How many total pieces are on the board at the start of a game?",
        options: ["16", "24", "32", "64"],
        correct: 2,
        fact: "Interesting Fact: Each player starts with 16 pieces, making 32 pieces in total."
      },
      {
        question: "How many pawns does each player start with?",
        options: ["4", "6", "8", "16"],
        correct: 2,
        fact: "Interesting Fact: Pawns form the frontline defense for the major pieces."
      },
      {
        question: "What is the starting number of pieces for one player (White or Black)?",
        options: ["8", "12", "16", "32"],
        correct: 2,
        fact: "Interesting Fact: 1 King, 1 Queen, 2 Rooks, 2 Knights, 2 Bishops, and 8 Pawns = 16 pieces."
      }
    ],
    initialBoard: [],
    targetSquare: null
  },
  {
    id: "ep-03",
    title: "Episode 03: Classic Starting Position Challenge",
    youtubeId: "VMj-3S1tku0",
    taskDescription: "Challenge: Place all white and black pieces in their correct classic starting positions!",
    isClassicSetupChallenge: true,
    classicTargets: {
      // Black Major/Minor pieces (Rank 8, row 0)
      '0-0': 'bR', '0-1': 'bN', '0-2': 'bB', '0-3': 'bQ', '0-4': 'bK', '0-5': 'bB', '0-6': 'bN', '0-7': 'bR',
      // Black Pawns (Rank 7, row 1)
      '1-0': 'bP', '1-1': 'bP', '1-2': 'bP', '1-3': 'bP', '1-4': 'bP', '1-5': 'bP', '1-6': 'bP', '1-7': 'bP',
      // White Pawns (Rank 2, row 6)
      '6-0': 'wP', '6-1': 'wP', '6-2': 'wP', '6-3': 'wP', '6-4': 'wP', '6-5': 'wP', '6-6': 'wP', '6-7': 'wP',
      // White Major/Minor pieces (Rank 1, row 7)
      '7-0': 'wR', '7-1': 'wN', '7-2': 'wB', '7-3': 'wQ', '7-4': 'wK', '7-5': 'wB', '7-6': 'wN', '7-7': 'wR'
    }
  }
];
