const { gql } = require('apollo-server-express');

const settingsTypes = gql`
  type updateSettings {
    id: ID
    enableRegistration: Boolean
    firstUserRegistration: Boolean
  }
  input updateSettingsInput {
    id: ID
    enableRegistration: Boolean
    firstUserRegistration: Boolean
  }
  extend type Query {
    getSettings: updateSettings
  }
  extend type Mutation {
    updateSettings(data: updateSettingsInput): updateSettings @hasRole(roles: [ADMIN])
  }
`;

module.exports = {
  settingsTypes,
};
