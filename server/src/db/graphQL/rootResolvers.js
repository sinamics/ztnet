const { userResolvers } = require('../../api/users/resolvers');
const { authResolvers } = require('../../api/auth/resolvers');
const { settingsResolvers } = require('../../api/settings/resolvers');
const { networkResolvers } = require('../../api/network/resolvers');
const { controllerResolvers } = require('../../api/networkController/resolvers');
const { GraphQLDateTime } = require('graphql-iso-date');
const { GraphQLUpload } = require('graphql-upload');
const { GraphQLJSON, GraphQLJSONObject } = require('graphql-type-json');

const resolvers = [
  userResolvers,
  authResolvers,
  settingsResolvers,
  networkResolvers,
  controllerResolvers,
  { Upload: GraphQLUpload },
  { DateTime: GraphQLDateTime },
  { JSON: GraphQLJSON },
  { JSONObject: GraphQLJSONObject },
];

module.exports = {
  resolvers,
};
