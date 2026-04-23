FROM node:20-alpine AS builder
WORKDIR /app

# Copier les manifests pour profiter du cache Docker
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY shared/package*.json ./shared/
RUN npm install

# Copier les sources
COPY backend/src ./backend/src
COPY backend/tsconfig.json ./backend/
COPY shared/src ./shared/src

RUN npm run build --workspace=@garminia/backend

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
COPY backend/package*.json ./backend/
COPY shared/package*.json ./shared/
RUN npm install --omit=dev

COPY --from=builder /app/backend/dist ./backend/dist

WORKDIR /app/backend
EXPOSE 3001
CMD ["node", "dist/index.js"]
