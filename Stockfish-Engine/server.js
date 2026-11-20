const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');

const app = express();
app.use(cors());

app.get('/api/stockfish', (req, res) => {
  const rawFen = req.query.fen;
  if (!rawFen || typeof rawFen !== 'string') {
    return res.status(400).json({ error: 'FEN string is required' });
  }

  // Sanitize inputs to prevent newline command injection and CPU exhaustion
  const fen = rawFen.replace(/[\r\n]/g, '').trim();
  const depth = Math.min(Math.max(parseInt(req.query.depth, 10) || 10, 1), 18);
  const rawElo = req.query.elo ? parseInt(req.query.elo, 10) : null;
  const elo = rawElo ? Math.min(Math.max(rawElo, 1320), 3190) : null;

  const stockfishProc = spawn('stockfish');
  let buffer = '';
  let evaluation = '0.00';
  let errorOutput = '';
  let responded = false;

  // Safety timeout (15 seconds) so requests never hang indefinitely
  const timeout = setTimeout(() => {
    if (!responded) {
      responded = true;
      stockfishProc.kill();
      res.status(504).json({ error: 'Stockfish analysis timed out' });
    }
  }, 15000);

  stockfishProc.stdout.on('data', (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop(); // Keep incomplete trailing line for next chunk

    for (const line of lines) {
      if (line.includes('CRITICAL ERROR')) {
        errorOutput = line;
      }
      if (line.includes('score cp')) {
        const parts = line.split(' ');
        const cpIdx = parts.indexOf('cp');
        if (cpIdx !== -1 && parts[cpIdx + 1]) {
          evaluation = (parseInt(parts[cpIdx + 1], 10) / 100).toFixed(2);
        }
      } else if (line.includes('score mate')) {
        const parts = line.split(' ');
        const mateIdx = parts.indexOf('mate');
        if (mateIdx !== -1 && parts[mateIdx + 1]) {
          evaluation = `#${parts[mateIdx + 1]}`;
        }
      }

      if (line.startsWith('bestmove') && !responded) {
        responded = true;
        clearTimeout(timeout);
        const bestmove = line.split(' ')[1];
        stockfishProc.kill();
        return res.json({ ok: true, bestmove, evaluation });
      }
    }
  });

  stockfishProc.on('error', () => {
    if (!responded) {
      responded = true;
      clearTimeout(timeout);
      res.status(500).json({ error: 'Stockfish binary failed to start' });
    }
  });

  stockfishProc.on('close', (code) => {
    if (!responded) {
      responded = true;
      clearTimeout(timeout);
      res.status(400).json({
        error: errorOutput || `Stockfish exited unexpectedly (code ${code})`,
      });
    }
  });

  stockfishProc.stdin.write('uci\n');
  if (elo) {
    stockfishProc.stdin.write('setoption name UCI_LimitStrength value true\n');
    stockfishProc.stdin.write(`setoption name UCI_Elo value ${elo}\n`);
  }
  stockfishProc.stdin.write(`position fen ${fen}\n`);
  stockfishProc.stdin.write(`go depth ${depth}\n`);
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', engine: 'Stockfish Microservice' });
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Stockfish Engine Microservice listening on port ${PORT}`);
});