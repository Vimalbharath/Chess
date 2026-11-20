const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');

const app = express();
app.use(cors());

// Dedicated Stockfish Engine Endpoint
app.get('/api/stockfish', (req, res) => {
  const { fen, depth = 8, elo = 1200 } = req.query;

  if (!fen) {
    return res.status(400).json({ error: 'FEN string is required' });
  }

  let stockfishProc;
  try {
    stockfishProc = spawn('stockfish');
  } catch (err) {
    return res.status(500).json({ error: 'Stockfish binary not found on server host' });
  }

  let bestmove = null;
  let evaluation = '0.00';

  stockfishProc.stdout.on('data', (data) => {
    const lines = data.toString().split('\n');
    for (const line of lines) {
      if (line.includes('score cp')) {
        const parts = line.split(' ');
        const cpIdx = parts.indexOf('cp');
        if (cpIdx !== -1 && parts[cpIdx + 1]) {
          evaluation = (parseInt(parts[cpIdx + 1]) / 100).toFixed(2);
        }
      }
      if (line.startsWith('bestmove')) {
        const parts = line.split(' ');
        bestmove = parts[1];
        stockfishProc.kill();
        res.json({ ok: true, bestmove, evaluation });
        break;
      }
    }
  });

  stockfishProc.on('error', () => {
    if (!res.headersSent) {
      res.status(500).json({ error: 'Stockfish process execution error' });
    }
  });

  stockfishProc.stdin.write(`uci\n`);
  stockfishProc.stdin.write(`setoption name UCI_LimitStrength value true\n`);
  stockfishProc.stdin.write(`setoption name UCI_Elo value ${elo}\n`);
  stockfishProc.stdin.write(`position fen ${fen}\n`);
  stockfishProc.stdin.write(`go depth ${depth}\n`);
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', engine: 'Stockfish Microservice' });
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`Stockfish Engine Microservice listening on port ${PORT}`);
});
