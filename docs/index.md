## About

This application was initally built for https://uavmatrix.com members which use the zerotier vpn to communicate with their UAV or Drone.
We decided to put this repo public and make it as generic as possible. (still some naming convensions to be changed).

## Features

- User Registration
- Admin panel, set roles and add / remove members / Network admin.
- Add / Remove Members from Network
- Light / Dark Theme

## Built with

- React & Typescript
- React Lazy Loading with Suspense
- Semantic-Ui React (https://react.semantic-ui.com/)
- Nodejs Express Server
- type-GraphQL Entry Point (/graphql)
- GraphQL-code-generator
- GraphQL Playground Page (http://localhost:4000/graphql)
- GraphQL Decorators for hasRole (@hasRole(roles: [USER, ...]))
- PostgreSQL database.
- Prisma
- JasonWebToken (JWT) accessToken / refreshToken cookie for authorization.

## Images

Dashboard
![dashboard](https://i.ibb.co/G08MYPj/dashboard.jpg)

Networks
![networks](https://i.ibb.co/mTJwrsR/Network.png)

Network Details
![network](https://i.ibb.co/DWdxVkq/Network-Details.png)

Members
![members](https://i.ibb.co/GCMYpqw/Members.png)

Settings
![settings](https://i.ibb.co/yQHR6pH/settings.png)
