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

ENV NODE_ENV=production
ENV PORT=3000

# Build Next.js project
RUN npm run build

EXPOSE 3000

# Start server
CMD ["npm", "run", "start"]
