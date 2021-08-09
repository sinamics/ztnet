const { gql } = require('apollo-server-express');

const networkTypes = gql`
  type NetworkCallback {
    network: [Network]
    error: Error
  }
  type NetworkDetailsCallback {
    network: Network
    members: [Member]
    zombieMembers: [Member]
    error: Error
  }
  type Network {
    nwid: ID!
    name: String
    private: Boolean
    routes: [Routes]
    ipAssignmentPools: [IpAssignmentPools]
    cidr: [String]
  }
  type Peers {
    address: String
    isBonded: Boolean
    latency: Int
    paths: [PeerPaths]
    role: String
    version: String
    versionMajor: Int
    versionMinor: Int
    versionRev: Int
  }
  type PeerPaths {
    active: Boolean
    address: String
    expired: Boolean
    lastReceive: Float
    lastSend: Float
    preferred: Boolean
    trustedPathId: Int
  }
  type Routes {
    target: String
    via: String
  }
  type IpAssignmentPools {
    ipRangeEnd: String
    ipRangeStart: String
  }

  # Members type
  type MemberCallback {
    member: Member
    error: Error
  }
  type Member {
    nodeid: ID
    id: ID
    name: String
    ip: [String]
    lastseen: DateTime
    online: Boolean
    deleted: Boolean
    address: String
    authorized: Boolean
    creationTime: DateTime
    ipAssignments: [String]
    noAutoAssignIps: Boolean
    nwid: String
    peers: Peers
  }

  extend type Query {
    allNetworks: [JSONObject]
    networkDetails(nwid: ID!): NetworkDetailsCallback @hasRole(roles: [USER, ADMIN, MODERATOR])
  }

  extend type Mutation {
    # Network CRUD
    createNetwork: NetworkCallback
    deleteNetwork(nwid: ID!): Boolean
    updateNetwork(nwid: ID!, data: JSONObject): NetworkDetailsCallback

    # Member CRUD
    memberUpdate(nwid: ID!, memberId: String!, data: JSONObject): MemberCallback
    memberUpdateDatabaseOnly(nwid: ID!, nodeid: ID!, data: JSONObject): MemberCallback
    removeMember(nwid: ID!, memberId: String!): JSONObject
    addMember(nwid: ID!, memberId: ID!): MemberCallback
  }
`;

module.exports = {
  networkTypes,
};
