# Update the VARIANT arg in docker-compose.yml to pick a Node version: 10, 12, 14
ARG VARIANT=14
FROM mcr.microsoft.com/vscode/devcontainers/javascript-node:0-${VARIANT} as server

ENV NPM_CONFIG_PREFIX=/home/node/.npm-global
ENV PATH=$PATH:/home/node/.npm-global/bin

WORKDIR /app

USER node
RUN sudo mkdir -p node_modules && sudo chown -R node:node node_modules

COPY ./package.json ./
COPY ./zt_install.sh .

RUN npm i
RUN npm i -g typescript 
RUN npm i -g ts-node 
RUN npm i -g @types/node 
RUN npm i -g nodemon

COPY . .

USER root
RUN apt-get update && apt-get install -y postgresql-client && \
    groupadd -g 2222 zerotier-one && \
    useradd -u 2222 -g 2222 zerotier-one

RUN curl -s https://install.zerotier.com | sudo bash && \
    sudo chmod 755 /var/lib/zerotier-one/authtoken.secret && \
    sudo chmod 755 zt_install.sh

USER node
