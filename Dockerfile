# =========================================================================
# PRODUCTION MULTI-STAGE DOCKERFILE - NODE.JS 20 + GCC + OPENJDK 17
# Optimized for Render Free Tier (512MB RAM) with Native C and Java execution
# =========================================================================

# Stage 1: Dependencies installation
FROM node:20-bookworm-slim AS deps
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

# Stage 2: Application build
FROM node:20-bookworm-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Provide build-time fallback values for Supabase environment variables
ARG NEXT_PUBLIC_SUPABASE_URL=https://oackmxxdeelyqrfxwvie.supabase.co
ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_ZOlaYAlh9OpUAARLnbwwTQ_RglUR47v
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

RUN npm run build

# Stage 3: Minimal runtime image with native GCC and Java compilers
FROM node:20-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV HOSTNAME="0.0.0.0"
ENV NEXT_TELEMETRY_DISABLED=1

# Install GCC, G++, libc-dev, and OpenJDK 17 headless for local compilation
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    make \
    libc6-dev \
    openjdk-17-jdk-headless \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Create execution scratch directories for sandboxed runs with full read/write permissions
RUN mkdir -p /app/.temp_runs /app/.temp_runs_c && chmod 777 /app/.temp_runs /app/.temp_runs_c

# Copy Next.js standalone build
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Render injects PORT dynamically (typically 10000 or 3000)
EXPOSE 3000

CMD ["node", "server.js"]
