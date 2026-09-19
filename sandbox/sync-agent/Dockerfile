FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install 

COPY sync.js .

# Runs with cwd /app; the pod manifest mounts the shared workspace volume at
# /app/workspace so the agent's localDirectory (./workspace) sees the project.
CMD [ "node", "sync.js" ]