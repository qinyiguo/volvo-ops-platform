# ============================================================
# Volvo 售後服務營運平台 - Zeabur 部署用 Dockerfile
# ============================================================

# Stage 1: Build React frontend
FROM node:20-alpine AS frontend-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# Stage 2: Production server
FROM node:20-alpine
WORKDIR /app/server

# Copy server files and install dependencies
COPY server/package*.json ./
RUN npm install --omit=dev

COPY server/ ./

# Copy built frontend to ../client/dist (matches server/index.js static path)
COPY --from=frontend-build /app/client/dist /app/client/dist

# Zeabur injects PORT automatically
ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

CMD ["node", "index.js"]
