FROM node:22-alpine AS build
WORKDIR /app/apps-sdk
COPY apps-sdk/package*.json ./
RUN npm ci
COPY apps-sdk/ ./
RUN npm run build

FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app/apps-sdk
COPY apps-sdk/package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/apps-sdk/dist ./dist
COPY marketplace /app/marketplace
EXPOSE 3000
USER node
CMD ["node", "dist/server.js"]
