# Base image: official Node.js 20 slim (Debian-based)
FROM node:20-slim

# Install system dependencies: FFmpeg for audio extraction and ca-certificates
RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install production dependencies
RUN npm ci --omit=dev

# Copy application source files
COPY . .

# Ensure uploads directory exists
RUN mkdir -p uploads

# Expose port (Render automatically provides $PORT environment variable)
ENV PORT=3000
EXPOSE 3000

# Start Captionize Studio
CMD ["node", "server.js"]

