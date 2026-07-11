# Wavelength — monorepo production image (App Platform)
# Build context: repository root

FROM node:20-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY client/package.json ./client/
COPY server/package.json ./server/
COPY shared/package.json ./shared/
RUN npm ci

FROM deps AS build
COPY . .
RUN npm run build -w shared \
 && npm run build -w client \
 && npm run build -w server

FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080
ENV CLIENT_DIST=/app/client/dist
ENV MIGRATIONS_DIR=/app/server/migrations

COPY package.json package-lock.json ./
COPY client/package.json ./client/
COPY server/package.json ./server/
COPY shared/package.json ./shared/
RUN npm ci --omit=dev

COPY --from=build /app/shared/dist ./shared/dist
COPY --from=build /app/server/dist ./server/dist
COPY --from=build /app/client/dist ./client/dist
COPY server/src/db/migrations ./server/migrations
COPY server/docker-entrypoint.sh ./server/docker-entrypoint.sh
RUN chmod +x ./server/docker-entrypoint.sh

WORKDIR /app/server
EXPOSE 8080
CMD ["./docker-entrypoint.sh"]
