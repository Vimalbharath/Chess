FROM node:18-bullseye-slim

# Install curl and tar to fetch the official Stockfish 19 Linux binary
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    tar \
    && rm -rf /var/lib/apt/lists/*

# Download and install Stockfish 19 universal Linux x86-64 binary
RUN curl -L https://github.com/official-stockfish/Stockfish/releases/download/sf_19/stockfish-ubuntu-x86-64.tar -o /tmp/stockfish.tar \
    && tar -xf /tmp/stockfish.tar -C /tmp \
    && mv /tmp/stockfish/stockfish-ubuntu-x86-64 /usr/local/bin/stockfish \
    && chmod +x /usr/local/bin/stockfish \
    && rm -rf /tmp/stockfish*

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3002

CMD ["node", "server.js"]