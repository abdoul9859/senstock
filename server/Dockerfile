FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY prisma ./prisma/
RUN npx prisma generate

COPY . .

EXPOSE 5000

RUN npm install -g nodemon

CMD ["nodemon", "--legacy-watch", "--polling-interval", "1000", "index.js"]
