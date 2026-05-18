FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --production
COPY . .
EXPOSE 3000
CMD ["sh", "-c", "node wait-for-db.js && node server.js"]
