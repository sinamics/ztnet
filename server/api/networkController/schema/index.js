const { gql } = require('apollo-server-express');

const controllerTypes = gql`
  type ControllerCallback {
    network: [Network]
    error: Error
  }
  type ControllerDetailsCallback {
    network: Network
    members: [Member]
    error: Error
  }
  type Controller {
    nwid: ID!
    name: String
    private: Boolean
    routes: [Routes]
    ipAssignmentPools: [IpAssignmentPools]
    cidr: [String]
  }

  extend type Query {
    controllerStats: JSON @hasRole(roles: [ADMIN])
  }
`;

module.exports = {
  controllerTypes,
};
