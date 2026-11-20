FROM node:18-bullseye

# Install Stockfish engine inside the microservice container
RUN apt-get update && apt-get install -y stockfish && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3002

CMD ["node", "server.js"]
