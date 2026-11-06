export const EPISODES = [
  {
    id: "ep-01",
    title: "Episode 01: The Board & Coordinates",
    youtubeId: "VMj-3S1tku0",
    taskDescription: "Learn how the chess board coordinates work from a1 to h8.",
    initialBoard: [],
    targetSquare: null
  },
  {
    id: "ep-02",
    title: "Episode 02: Pawn Power",
    youtubeId: "VMj-3S1tku0",
    taskDescription: "Learn pawn movement and captures.",
    initialBoard: [],
    targetSquare: null
  },
  {
    id: "ep-03",
    title: "Episode 03: The Mighty Rook",
    youtubeId: "VMj-3S1tku0",
    taskDescription: "Practice Rook Movement: Move your Rook to (h5) to capture the target!",
    initialBoard: [
      { piece: 'R', row: 3, col: 4 },
      { piece: 'target', row: 3, col: 7 }
    ],
    targetSquare: { row: 3, col: 7 }
  }
];
