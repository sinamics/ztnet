ARG VARIANT=14
FROM mcr.microsoft.com/vscode/devcontainers/javascript-node:0-${VARIANT}

# Build args
ARG NODE_ENV
ARG WEB_ADDRESS

# Environment vars
ENV NODE_ENV=$NODE_ENV
ENV WEB_ADDRESS=$WEB_ADDRESS

WORKDIR /app
RUN sudo mkdir -p node_modules && sudo chown -R node:node node_modules

COPY ./package.json ./
COPY . .

RUN npm i -g ts-node typescript
RUN npm i

# CMD npm run build
CMD npm run build --max-old-space-size=1024 && tail -f /dev/null