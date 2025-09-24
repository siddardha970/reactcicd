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
RUN npm i -g vite@5.4.10
COPY --from=build /app/dist ./dist
EXPOSE 5173
CMD ["vite", "preview", "--host", "0.0.0.0", "--port", "5173"]

