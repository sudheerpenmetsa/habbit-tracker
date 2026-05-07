FROM node:22-alpine

WORKDIR /app

COPY index.html styles.css script.js manifest.webmanifest server.js ./

ENV NODE_ENV=production
ENV PORT=8080
ENV DATA_FILE=/data/state.json

EXPOSE 8080

CMD ["node", "server.js"]
