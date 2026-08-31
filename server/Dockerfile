# ─── Stage 1: Builder ─────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Copy manifests first for layer-cache efficiency
COPY package.json package-lock.json ./
COPY prisma ./prisma

# Install ALL deps (including devDependencies needed for tsc)
RUN npm ci

# Generate Prisma client
RUN npx prisma generate

# Copy source and compile
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ─── Stage 2: Runner ──────────────────────────────────────────────────────────
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nodeuser

# Copy only what is needed at runtime
COPY --from=builder /app/package.json        ./package.json
COPY --from=builder /app/package-lock.json   ./package-lock.json
COPY --from=builder /app/prisma              ./prisma
COPY --from=builder /app/dist               ./dist
COPY --from=builder /app/src/generated      ./src/generated

# Install production dependencies only
RUN npm ci --omit=dev

# Re-generate the Prisma client against the production node_modules
RUN npx prisma generate

USER nodeuser

EXPOSE 8080

# Apply pending migrations, then start the server
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
