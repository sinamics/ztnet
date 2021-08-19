# ZTNET - User interface for self hosted zerotier network controller.

Read more about **zerotier** (https://www.zerotier.com/)

## About

This application was initally built for https://uavmatrix.com members which use the zerotier vpn to communicate with their UAV or Drone.
We decided to put this repo public and make it as generic as possible. (still some naming convensions to be changed).

## Features

- User Registration
- Admin panel, set roles and add / remove members / Network admin.
- Users can add / remove members from VPN Network
- Users are able to change network name, subnet, private or public.
- Light / Dark Theme

## Built with

- React & Typescript
- React Lazy Loading with Suspense
- Semantic-Ui React (https://react.semantic-ui.com/)
- Nodejs Express Server
- type-GraphQL Entry Point (/graphql)
- Graphql subscription, pushing live network data to users.
- GraphQL-code-generator
- GraphQL Playground Page (http://localhost:4000/graphql)
- GraphQL Decorators for hasRole (@hasRole(roles: [USER, ...]))
- PostgreSQL database.
- Prisma
- JasonWebToken (JWT) accessToken / refreshToken cookie for authorization.

## Usage

1. Install PostgreSQL from the offical site.
2. Install Zerotier from their offical site.
3. Clone package: `git clone https://github.com/Sinamics/ztnet.git`
4. `cd ztnet && npm install && npm install -g concurrently nodemon ts-node typescript`
5. Create `.env` file with the following variables in the project root folder:

```
REACT_APP_SITE_NAME="ztnet"
SERVER_PORT=4000
ACCESS_TOKEN_SECRET=(random_token)
REFRESH_TOKEN_SECRET=(random_token)
REFRESH_TOKEN_LIFE="7 days"
ACCESS_TOKEN_LIFE="5s"
JWT_CLOCKDIFFRENCE_ALLOWED=5

POSTGRES_USER="ztnet"
POSTGRES_PASSWORD=(random_password)
POSTGRES_PORT=5432
POSTGRES_DB="ztnet"
CONNECTION_STRING="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:${POSTGRES_PORT}/${POSTGRES_DB}?schema=public"

EMAIL_USER="post@domain.com"
EMAIL_SUPPORT="support@domain.com"
EMAIL_PASSWORD="smtp_password"
EMAIL_ACTIVATIONLINK="https://domain.com/validation/email"
EMAIL_RESETPASSWORDLINK="https://domain.com/resetpassword"

#When creating a user, a new network is automatically added. Set the name below.
ZT_DEFAULT_NETWORKNAME="ztnetwork"

################################
#                              #
#        PRODUCTION            #
#                              #
################################

REACT_APP_WEB_ADDRESS="https://domain.com"
REACT_APP_WEBSOCKET_ADDRESS="wss://domain.com"

#(OPTIONAL)
#ztnet will get the token from zerotier automatically, but you can override the token if you uncomment the zt_secret below.
#32 character token.
#ZT_SECRET="zerotier_auth_token"
```

6. `npx prisma generate && npx prisma migrate dev --name init --preview-feature`
7. `npx prisma db seed --preview-feature`
8. `npm start`

## Notes

- If you make any changes to the graphql files, you need to generate new sources using the `npm run codegen` command.
- First user that register will automatically get Admin role.

# Security

This project is still "work in progess", ztnet is provided "as is" without any warranty. Use at your own risk!

## Work to be done

- Convert all files to TS
- Implement more detailed TS
- Generall improvement

## Demo Video

Video from Dev server, all Network ID`s and sensitivity data would not be valid.
[![Demo Video](https://i.ibb.co/PFZFrLP/thumb.jpg)](https://drive.google.com/file/d/1xWPNRzGePCmrZ6iiMjcyFIQkrDUrBItj/view?usp=sharing 'Demo Video')
