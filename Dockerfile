FROM node:22-alpine

WORKDIR /app

RUN apk add --no-cache python3 make g++ git curl bash

COPY package*.json ./

RUN npm install --legacy-peer-deps

COPY . .

RUN npm run build

EXPOSE 3000

CMD ["node", "server.js"]
