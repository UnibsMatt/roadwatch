FROM node:26-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund
COPY . .
# Optional: point at your own tile server, e.g. --build-arg VITE_TILE_URL=https://tiles.example.com/{z}/{x}/{y}.png
ARG VITE_TILE_URL=""
ENV VITE_TILE_URL=$VITE_TILE_URL
RUN npm run build

FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
