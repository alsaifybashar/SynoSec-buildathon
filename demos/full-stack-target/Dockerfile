FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY package.json .
RUN npm install
COPY server.js .
COPY public ./public
EXPOSE 8891
CMD ["node", "server.js"]
