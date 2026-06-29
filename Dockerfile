FROM node:22-alpine

WORKDIR /app

# Install dependencies first for Docker caching
COPY package*.json ./
RUN npm install --production

# Copy source code
COPY . .

# Expose port
EXPOSE 5000

# Start server
CMD ["node", "src/app.js"]
