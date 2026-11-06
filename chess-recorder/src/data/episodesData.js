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
    taskDescription: "Challenge: Place all white pieces in their classic starting positions on ranks 1 and 2!",
    isClassicSetupChallenge: true,
    classicTargets: {
      // Rank 2: Pawns
      '6-0': 'P', '6-1': 'P', '6-2': 'P', '6-3': 'P', '6-4': 'P', '6-5': 'P', '6-6': 'P', '6-7': 'P',
      // Rank 1: Major/Minor pieces
      '7-0': 'R', '7-1': 'N', '7-2': 'B', '7-3': 'Q', '7-4': 'K', '7-5': 'B', '7-6': 'N', '7-7': 'R'
    }
  }
];
