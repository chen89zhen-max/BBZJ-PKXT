FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Set npm mirror to Taobao to prevent npm install from hanging in China
RUN npm config set registry https://registry.npmmirror.com/

# Install dependencies
RUN npm install

# Copy project files
COPY . .

# Build the application
RUN npm run build

# Set environment to production
ENV NODE_ENV=production

# Expose the port the app runs on
EXPOSE 3000

# Start the application using tsx
CMD ["npx", "tsx", "server.ts"]
