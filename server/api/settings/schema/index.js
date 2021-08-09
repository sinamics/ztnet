const { gql } = require('apollo-server-express');

const settingsTypes = gql`
  type updateSettings {
    id: ID
    enableRegistration: Boolean
  }

  input updateSettingsInput {
    id: ID
    enableRegistration: Boolean
  }

  extend type Query {
    getSettings: updateSettings @hasRole(roles: [ADMIN])
  }
  extend type Mutation {
    updateSettings(data: updateSettingsInput): updateSettings @hasRole(roles: [ADMIN])
  }
`;

module.exports = {
  settingsTypes,
};
