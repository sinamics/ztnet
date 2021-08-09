const { gql } = require('@apollo/client');
const { authTypes } = require('../../api/auth/schema');
const { userTypes } = require('../../api/users/schema');
const { settingsTypes } = require('../../api/settings/schema');
const { networkTypes } = require('../../api/network/schema');
const { controllerTypes } = require('../../api/networkController/schema');

/* initilize the query and mutation string.
  These will be extended in the project files
   */
const query = gql`
  scalar DateTime
  scalar Upload
  scalar JSON
  scalar JSONObject
  type Query {
    _empty: String
  }
  type Mutation {
    _empty: String
  }
  type Subscription {
    _empty: String
  }
`;

const typeDefs = [query, authTypes, userTypes, networkTypes, controllerTypes, settingsTypes];

module.exports = {
  typeDefs,
};
