FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN apk add --no-cache openssl libc6-compat
RUN npm ci --only=production
COPY prisma ./prisma
RUN npx prisma generate
COPY src ./src
COPY public ./public
ENV NODE_ENV=production
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s CMD wget -qO- http://127.0.0.1:${PORT:-3000}/api/v1/health || exit 1
CMD ["sh", "-c", "npx prisma migrate deploy && node src/server.js"]
