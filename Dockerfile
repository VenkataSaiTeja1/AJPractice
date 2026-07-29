# =========================================================================
# PRODUCTION DOCKERFILE - NODE.JS 20 + OPENJDK 17
# Enables unlimited, free, local Java compilation & execution on your hosting server
# =========================================================================

FROM node:20-slim

# Install OpenJDK 17 (both JRE and JDK for javac compilation)
RUN apt-get update && \
    apt-get install -y --no-install-recommends openjdk-17-jdk openjdk-17-jre && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package lockfiles
COPY package*.json ./

# Install project dependencies
RUN npm ci

# Copy application source files
COPY . .

# Set default production environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Provide build-time fallback placeholders for Supabase keys to prevent Next.js compilation crashes.
# These will be overwritten by the actual environment variables you configured in your Render dashboard at runtime.
ENV NEXT_PUBLIC_SUPABASE_URL=https://oackmxxdeelyqrfxwvie.supabase.co
ENV NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_ZOlaYAlh9OpUAARLnbwwTQ_RglUR47v

# Build Next.js project
RUN npm run build

# Expose port
EXPOSE 3000

# Start server.
# Using the shell format allows the PORT variable (which Render sets to 10000 or similar) to expand correctly.
CMD npx next start -p ${PORT:-3000}
