FROM node:24-alpine AS build

WORKDIR /src
COPY package*.json ./
ENV NODE_ENV=development
ENV NPM_CONFIG_PRODUCTION=false
RUN npm ci --include=dev --production=false \
  && npm install --no-save --package-lock=false --production=false \
    @vitejs/plugin-react@6.0.1 typescript@6.0.3 vite@8.0.10 \
  && test -x node_modules/.bin/vite
COPY . .
RUN npm run build

FROM nginx:1.29-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /src/dist /usr/share/nginx/html
EXPOSE 80
