# Build stage
FROM node:22-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Production stage
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev && npm install -g tsx
COPY --from=build /app/dist ./dist
COPY server.ts ./
COPY src/types.ts ./src/

EXPOSE 3000
ENV NODE_ENV=production
CMD ["npm", "start"]
