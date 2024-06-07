# HOW TO create docker image
# docker build -t ecg-xai-evaluation-app:v1.0 .

FROM node:22.1.0

# Create app directory
WORKDIR /app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied where available (npm@5+)
COPY package*.json ./

# Build app (1)
RUN npm install

# Bundle app source
COPY . .

# Build app (2)
RUN npm run build

# Installiere ein einfaches HTTP-Server-Paket, um die Anwendung zu bedienen
RUN npm install -g serve

# Expose port, start server
EXPOSE 3000

# Starte die Anwendung
CMD ["npm", "start"]

# HOW TO build and start container
# docker run -it -d -p 443:4200 --name ecg-xai-evaluation-app-v1.0 ecg-xai-evaluation-app:v1.0
