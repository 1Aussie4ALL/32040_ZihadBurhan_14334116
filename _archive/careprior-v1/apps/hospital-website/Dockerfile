FROM node:20-slim

WORKDIR /app

COPY apps/hospital-website/package.json apps/hospital-website/package-lock.json* ./
RUN npm install

COPY apps/hospital-website /app

EXPOSE 3000
CMD ["npm", "run", "dev"]
