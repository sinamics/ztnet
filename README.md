# ZTNET - Web application for self-hosted zerotier controller.

Read more about **zerotier** (https://www.zerotier.com/)

## About

This application was initally built for https://uavmatrix.com members which use the zerotier vpn to communicate with their UAV or Drone.
We decided to put this repo public and make it as generic as possible. (still some naming convensions to be changed).

## Features

- User Registration
- Admin panel, set roles and add / remove members / Network admin.
- Add / Remove Members from Network

## Built with

- React & Typescript
- React Lazy Loading with Suspense
- Semantic-Ui React (https://react.semantic-ui.com/)
- Express Server (port 4000)
- type-GraphQL Entry Point (/graphql)
- GraphQL-code-generator
- GraphQL Playground Page (http://localhost:4000/graphql)
- GraphQL Decorators for hasRole (@hasRole(roles: [USER, ...]))
- PostgrSQL database.
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
EMAIL_PASSWORD="password"
EMAIL_ACTIVATIONLINK="https://domain.com/validation/email"
EMAIL_RESETPASSWORDLINK="https://domain.com/resetpassword"

WEB_ADDRESS="https://domain.com"

#When creating a user, a new network is automatically added. Set the name below.
ZT_DEFAULT_NETWORKNAME="ztnetwork"

#(OPTIONAL)
#ztnet will get the token from zerotier automatically, but you can override the token if you uncomment the zt_secret below.
#32 character token.
#ZT_SECRET="zerotier_auth_token"

################################
#                              #
#        PRODUCTION            #
################################

REACT_APP_WEB_ADDRESS="https://domain.com"

#(optional) will override the ZT_SECRET token
#ZT_SECRET="zerotier_token"


```

6. `npx prisma generate && npx prisma migrate dev --name init --preview-feature`
7. `npx prisma db seed --preview-feature`
8. `npm start`

## Notes

- If you make any changes to the graphql files, you need to generate new sources using the `npm run codegen` command.
- First user that register will automatically get Admin role.

## Images

Dashboard
![dashboard](https://i.ibb.co/47XSvNx/dashboard.jpg)

Networks
![networks](https://i.ibb.co/mTJwrsR/Network.png)

Network Details
![network](https://i.ibb.co/DWdxVkq/Network-Details.png)

Members
![members](https://i.ibb.co/GCMYpqw/Members.png)

Settings
![settings](https://i.ibb.co/yQHR6pH/settings.png)

# Security

This project is still "work in progess", ztnet is provided "as is" without any warranty. Use at your own risk!
