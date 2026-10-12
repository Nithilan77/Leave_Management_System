# ---- Leave Management System — Server ----
FROM node:22-alpine AS build

WORKDIR /app

# Install deps first (better layer caching: only reinstalls if package*.json change)
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy the rest of the server source
COPY . .

ENV NODE_ENV=production
EXPOSE 5000

# server.js connects to MONGO_URI (Atlas) at boot — passed in via docker-compose/.env,
# never baked into the image.
CMD ["node", "server.js"]
