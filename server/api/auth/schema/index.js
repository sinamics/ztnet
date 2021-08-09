const { gql } = require('apollo-server-express');

const authTypes = gql`
  directive @hasRole(roles: [Role!]) on FIELD_DEFINITION | FIELD
  enum Role {
    USER
    MODERATOR
    ADMIN
  }

  type Register {
    firstname: String!
    lastname: String!
    email: String!
    password: String!
    tokenVersion: Int
  }

  type RegisterResponse {
    error: Error
    user: Users
  }

  type Error {
    mailNotValidated: Boolean
    email: String
    userId: ID
    message: String
  }

  type LoginResponse {
    accessToken: String
    user: Users
    error: Error
  }

  type Auth {
    email: String
    password: String
  }

  extend type Mutation {
    validateEmail(token: String): Users
    sendMailLink(userId: ID!): Boolean
    register(
      lastname: String!
      firstname: String!
      email: String!
      password: String!
      orderId: Int
      licenseStatus: String
      licenseKey: String
      orderStatus: String
    ): RegisterResponse

    login(email: String!, password: String!): LoginResponse
    forgot(email: String!): Boolean
    changePassword(password: String!, newPassword: String!, token: String!): RegisterResponse
    firstTimeLoginChangePassword(password: String!, newPassword: String!): Users @hasRole(roles: [USER, ADMIN, MODERATOR])
  }

  extend type Query {
    me: Users @hasRole(roles: [USER, ADMIN, MODERATOR])
    admin: Users @hasRole(roles: [ADMIN])
    token: String
  }
`;

module.exports = {
  authTypes,
};
