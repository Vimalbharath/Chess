FROM node:20-bookworm-slim

# Download and extract the official Stockfish 19 universal Linux x86-64 binary
RUN node -e "fetch('https://github.com/official-stockfish/Stockfish/releases/download/sf_19/stockfish-linux-x86-64-universal.tar.gz').then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.arrayBuffer(); }).then(b => require('fs').writeFileSync('/tmp/stockfish.tar.gz', Buffer.from(b)))" \
    && mkdir -p /tmp/sf \
    && tar -xzf /tmp/stockfish.tar.gz -C /tmp/sf \
    && find /tmp/sf -type f -name "stockfish*" -exec mv {} /usr/local/bin/stockfish \; \
    && chmod +x /usr/local/bin/stockfish \
    && rm -rf /tmp/stockfish.tar.gz /tmp/sf

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

EXPOSE 3002

CMD ["node", "server.js"]