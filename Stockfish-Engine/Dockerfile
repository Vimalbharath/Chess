FROM node:20-bookworm-slim

RUN node -e "fetch('https://github.com/official-stockfish/Stockfish/releases/download/sf_19/stockfish-ubuntu-x86-64.tar').then(r => r.arrayBuffer()).then(b => require('fs').writeFileSync('/tmp/stockfish.tar', Buffer.from(b)))" \
    && tar -xf /tmp/stockfish.tar -C /tmp \
    && mv /tmp/stockfish/stockfish-ubuntu-x86-64 /usr/local/bin/stockfish \
    && chmod +x /usr/local/bin/stockfish \
    && rm -rf /tmp/stockfish*

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

EXPOSE 3002

CMD ["node", "server.js"]