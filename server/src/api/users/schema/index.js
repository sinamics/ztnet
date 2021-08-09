const { gql } = require('apollo-server-express');

const userTypes = gql`
  # type UsersCallback {
  #   users: Users
  #   error: Error
  # }
  type Users {
    userid: ID
    firstname: String
    lastname: String
    tokenVersion: String
    email: String
    emailConfirmed: Boolean
    createdDate: DateTime
    lastlogin: String
    loggedIn: Boolean
    firstTime: Boolean
    expirationDate: String
    hash: String
    role: String
    licenseKey: String
    licenseStatus: String
    orderStatus: String
    orderId: Int
    max_instance_number: String
    product_id: Int
  }

  input User {
    userid: ID
    firstname: String
    lastname: String
    tokenVersion: String
    email: String
    emailConfirmed: Boolean
    createdDate: DateTime
    lastlogin: String
    loggedIn: Boolean
    expirationDate: String
    hash: String
    role: String
    licenseKey: String
    licenseStatus: String
    orderStatus: String
    orderId: Int
    max_instance_number: String
    product_id: Int
  }
  extend type Query {
    getUsers: [Users] @hasRole(roles: [ADMIN])
    getUser(userid: ID!): Users @hasRole(roles: [ADMIN])
  }
  extend type Mutation {
    updateUser(userid: ID!, user: User!): Users @hasRole(roles: [ADMIN])
    removeUser(userid: ID!): Boolean @hasRole(roles: [ADMIN])
    uploadProfileImage(file: Upload!, userid: ID): Boolean
  }
`;

module.exports = {
  userTypes,
};
