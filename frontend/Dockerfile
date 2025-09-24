FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci || npm install --no-audit --no-fund
ARG VITE_API_BASE
ARG VITE_MOCK
ENV VITE_API_BASE=${VITE_API_BASE}
ENV VITE_MOCK=${VITE_MOCK}
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci || npm install --no-audit --no-fund
COPY --from=build /app/dist ./dist
COPY server.js ./server.js
EXPOSE 5173
CMD ["node", "server.js"]

