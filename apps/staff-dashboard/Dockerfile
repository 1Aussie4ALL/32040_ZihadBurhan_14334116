FROM node:20-slim

WORKDIR /app

COPY apps/staff-dashboard/package.json apps/staff-dashboard/package-lock.json ./
RUN npm install

COPY apps/staff-dashboard /app

EXPOSE 3000
CMD ["npm", "run", "dev"]
