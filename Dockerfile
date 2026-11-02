# Production Multi-Stage Dockerfile for Helpio

# Stage 1: Build Client
FROM node:20-alpine AS client-builder
WORKDIR /app/client
COPY shared/ ../shared/
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# Stage 2: Build Server
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

# Install dependencies
COPY shared/ ./shared/
COPY server/package*.json ./server/
WORKDIR /app/server
RUN npm ci --only=production

# Copy server application code
COPY server/ ./

# Copy built frontend assets
COPY --from=client-builder /app/client/dist ./public

EXPOSE 5000

CMD ["node", "src/server.js"]
