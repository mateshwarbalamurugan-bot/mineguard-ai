# Multi-stage Dockerfile for NotesBoard
FROM node:22-bookworm-slim AS build

WORKDIR /app

# Install build dependencies for native modules
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# Copy root and workspace package files
COPY package.json package-lock.json* ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/

# Install dependencies
RUN npm install --prefix backend
RUN npm install --prefix frontend

# Copy all source files
COPY backend ./backend
COPY frontend ./frontend

# Build frontend production bundle
RUN npm run build --prefix frontend

# Production runtime image
FROM node:22-bookworm-slim AS runtime

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001
ENV DB_PATH=/app/data/notes.db
ENV UPLOAD_DIR=/app/data/uploads

# Install runtime tools
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Create persistent data directory
RUN mkdir -p /app/data/uploads

# Copy backend dependencies and code
COPY --from=build /app/backend/node_modules ./backend/node_modules
COPY --from=build /app/backend ./backend
COPY --from=build /app/frontend/dist ./frontend/dist
COPY package.json ./

# Expose server port
EXPOSE 3001

# Run server as one process
CMD ["node", "backend/server.js"]
