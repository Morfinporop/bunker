FROM node:22-alpine

WORKDIR /app

RUN apk add --no-cache git curl bash

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

EXPOSE 3000

CMD ["node", "server.js"]
