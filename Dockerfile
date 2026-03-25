FROM node:22-alpine AS builder

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:22-alpine

RUN apk add --no-cache postgresql-client

ARG GIT_COMMIT=unknown
ENV GIT_COMMIT=$GIT_COMMIT

WORKDIR /usr/src/app

COPY --from=builder /usr/src/app/package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /usr/src/app/dist ./dist

RUN mkdir -p uploads

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "dist/index.cjs"]
