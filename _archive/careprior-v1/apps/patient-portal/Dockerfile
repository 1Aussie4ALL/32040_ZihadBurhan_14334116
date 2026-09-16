FROM node:20-slim

WORKDIR /app

COPY apps/patient-portal/package.json apps/patient-portal/package-lock.json ./
RUN npm install

COPY apps/patient-portal /app

EXPOSE 3000
CMD ["npm", "run", "dev"]
