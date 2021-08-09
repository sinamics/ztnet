# ZTNET - Web application for self-hosted zerotier controller.

Read more about **zerotier** (https://www.zerotier.com/)

## About

This application was initally built for https://uavmatrix.com members which use the zerotier vpn to communicate with their UAV or Drone.
We decided to put this repo public and make it as generic as possible. (still some naming convensions to be changed).

## Features

- User Registration
- Admin panel, set roles and remove members and networks.
- Manage Network
- Add / Remove Members from Network

## Built with

- Docker DEV Container (easy setup)
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

## Developers

1. Clone package: `git clone https://github.com/Sinamics/ztnet.git`
2. Create `.env` file with the following variables in the project root folder:

```
SITE_NAME="ztnet"
SERVER_PORT=4000
ACCESS_TOKEN_SECRET=random_token
REFRESH_TOKEN_SECRET=random_token
REFRESH_TOKEN_LIFE="7 days"
ACCESS_TOKEN_LIFE="5s"
JWT_CLOCKDIFFRENCE_ALLOWED=5

POSTGRES_USER="ztnet"
POSTGRES_PASSWORD=random_token
POSTGRES_PORT=5432
POSTGRES_DB="ztnet"
CONNECTION_STRING="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:${POSTGRES_PORT}/${POSTGRES_DB}?schema=public"

EMAIL_USER="post@domain.com"
EMAIL_SUPPORT="support@domain.com"
EMAIL_PASSWORD="password"
EMAIL_ACTIVATIONLINK="https://domain.com/validation/email"
EMAIL_RESETPASSWORDLINK="https://domain.com/resetpassword"

WEB_ADDRESS="https://domain.com"

#random 32 character token (ONLY FOR DEV)
#NOTE - For production, use the token in "/var/lib/zerotier-one/authtoken.secret"
ZT_SECRET="EouV2KcEVozwx4zrofVoDsZ44lOCAp66"

#When creating a user, a new network is automatically added. Set the name below.
ZT_DEFAULT_NETWORKNAME="ztnetwork"

```

3. Install vscode remote extension (https://github.com/Microsoft/vscode-remote-release)
4. Ctrl + Shift + p => select open in container.
5. Add new shell and type "npm start"

### Old fasion way

1. Install PostgreSql from the offical site.
2. Install Zerotier from their offical site. If you are on windows, you need to set the ZT_SECRET enviroment in .env
3. Clone package: `git clone https://github.com/Sinamics/ztnet.git`
4. Create `.env` file with the variables (above) in the project root folder:
5. `npm install -g concurrently nodemon ts-node typescript`
6. `npm install`
7. `npx prisma generate`
8. `npx prisma migrate dev --name init --preview-feature`
9. `npx prisma db seed --preview-feature`
10. `npm start`

If you make any changes to the graphql files, you need to generate new sources using the `npm run codegen` command.

## Notes

- First user that register will automatically get Admin role.

## Images

Dashboard
![dashboard](https://i.ibb.co/pnRcd4t/Dashboard.png)

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
