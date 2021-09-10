import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
export type Maybe<T> = T | null;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: string;
  String: string;
  Boolean: boolean;
  Int: number;
  Float: number;
  /** A date-time string at UTC, such as 2007-12-03T10:15:30Z, compliant with the `date-time` format outlined in section 5.6 of the RFC 3339 profile of the ISO 8601 standard for representation of dates and times using the Gregorian calendar. */
  DateTime: any;
  /** The `JSONObject` scalar type represents JSON objects as specified by [ECMA-404](http://www.ecma-international.org/publications/files/ECMA-ST/ECMA-404.pdf). */
  JSONObject: any;
  /** The `JSON` scalar type represents JSON values as specified by [ECMA-404](http://www.ecma-international.org/publications/files/ECMA-ST/ECMA-404.pdf). */
  JSON: any;
  /** The `Upload` scalar type represents a file upload. */
  Upload: any;
};

export type Auth = {
  __typename?: 'Auth';
  email?: Maybe<Scalars['String']>;
  password?: Maybe<Scalars['String']>;
};

export enum CacheControlScope {
  Public = 'PUBLIC',
  Private = 'PRIVATE'
}

export type Controller = {
  __typename?: 'Controller';
  nwid: Scalars['ID'];
  name?: Maybe<Scalars['String']>;
  private?: Maybe<Scalars['Boolean']>;
  routes?: Maybe<Array<Maybe<Routes>>>;
  ipAssignmentPools?: Maybe<Array<Maybe<IpAssignmentPools>>>;
  cidr?: Maybe<Array<Maybe<Scalars['String']>>>;
};

export type ControllerCallback = {
  __typename?: 'ControllerCallback';
  network?: Maybe<Array<Maybe<Network>>>;
  error?: Maybe<Error>;
};

export type ControllerDetailsCallback = {
  __typename?: 'ControllerDetailsCallback';
  network?: Maybe<Network>;
  members?: Maybe<Array<Maybe<Member>>>;
  error?: Maybe<Error>;
};


export type Error = {
  __typename?: 'Error';
  mailNotValidated?: Maybe<Scalars['Boolean']>;
  email?: Maybe<Scalars['String']>;
  userId?: Maybe<Scalars['ID']>;
  message?: Maybe<Scalars['String']>;
};

export type IpAssignmentPools = {
  __typename?: 'IpAssignmentPools';
  ipRangeEnd?: Maybe<Scalars['String']>;
  ipRangeStart?: Maybe<Scalars['String']>;
};



export type LoginResponse = {
  __typename?: 'LoginResponse';
  accessToken?: Maybe<Scalars['String']>;
  user?: Maybe<Users>;
  error?: Maybe<Error>;
};

export type Member = {
  __typename?: 'Member';
  nodeid?: Maybe<Scalars['ID']>;
  identity?: Maybe<Scalars['ID']>;
  id?: Maybe<Scalars['ID']>;
  name?: Maybe<Scalars['String']>;
  ip?: Maybe<Array<Maybe<Scalars['String']>>>;
  lastseen?: Maybe<Scalars['DateTime']>;
  online?: Maybe<Scalars['Boolean']>;
  deleted?: Maybe<Scalars['Boolean']>;
  address?: Maybe<Scalars['String']>;
  authorized?: Maybe<Scalars['Boolean']>;
  creationTime?: Maybe<Scalars['DateTime']>;
  ipAssignments?: Maybe<Array<Maybe<Scalars['String']>>>;
  noAutoAssignIps?: Maybe<Scalars['Boolean']>;
  nwid?: Maybe<Scalars['String']>;
  peers?: Maybe<Peers>;
};

export type MemberCallback = {
  __typename?: 'MemberCallback';
  member?: Maybe<Member>;
  error?: Maybe<Error>;
};

export type Mutation = {
  __typename?: 'Mutation';
  _empty?: Maybe<Scalars['String']>;
  validateEmail?: Maybe<Users>;
  sendMailLink?: Maybe<Scalars['Boolean']>;
  register?: Maybe<RegisterResponse>;
  login?: Maybe<LoginResponse>;
  forgot?: Maybe<Scalars['Boolean']>;
  changePassword?: Maybe<RegisterResponse>;
  firstTimeLoginChangePassword?: Maybe<Users>;
  updateUser?: Maybe<Users>;
  removeUser?: Maybe<Scalars['Boolean']>;
  uploadProfileImage?: Maybe<Scalars['Boolean']>;
  createNetwork?: Maybe<NetworkCallback>;
  deleteNetwork?: Maybe<Scalars['Boolean']>;
  updateNetwork?: Maybe<NetworkDetailsCallback>;
  memberUpdate?: Maybe<MemberCallback>;
  memberUpdateDatabaseOnly?: Maybe<MemberCallback>;
  removeMember?: Maybe<Scalars['JSONObject']>;
  addMember?: Maybe<MemberCallback>;
  updateSettings?: Maybe<UpdateSettings>;
};


export type MutationValidateEmailArgs = {
  token?: Maybe<Scalars['String']>;
};


export type MutationSendMailLinkArgs = {
  userId: Scalars['ID'];
};


export type MutationRegisterArgs = {
  lastname: Scalars['String'];
  firstname: Scalars['String'];
  email: Scalars['String'];
  password: Scalars['String'];
  orderId?: Maybe<Scalars['Int']>;
  licenseStatus?: Maybe<Scalars['String']>;
  licenseKey?: Maybe<Scalars['String']>;
  orderStatus?: Maybe<Scalars['String']>;
};


export type MutationLoginArgs = {
  email: Scalars['String'];
  password: Scalars['String'];
};


export type MutationForgotArgs = {
  email: Scalars['String'];
};


export type MutationChangePasswordArgs = {
  password: Scalars['String'];
  newPassword: Scalars['String'];
  token: Scalars['String'];
};


export type MutationFirstTimeLoginChangePasswordArgs = {
  password: Scalars['String'];
  newPassword: Scalars['String'];
};


export type MutationUpdateUserArgs = {
  userid: Scalars['ID'];
  user: User;
};


export type MutationRemoveUserArgs = {
  userid: Scalars['ID'];
};


export type MutationUploadProfileImageArgs = {
  file: Scalars['Upload'];
  userid?: Maybe<Scalars['ID']>;
};


export type MutationDeleteNetworkArgs = {
  nwid: Scalars['ID'];
};


export type MutationUpdateNetworkArgs = {
  nwid: Scalars['ID'];
  data?: Maybe<Scalars['JSONObject']>;
};


export type MutationMemberUpdateArgs = {
  nwid: Scalars['ID'];
  memberId: Scalars['String'];
  data?: Maybe<Scalars['JSONObject']>;
};


export type MutationMemberUpdateDatabaseOnlyArgs = {
  nwid: Scalars['ID'];
  nodeid: Scalars['ID'];
  identity?: Maybe<Scalars['ID']>;
  data?: Maybe<Scalars['JSONObject']>;
};


export type MutationRemoveMemberArgs = {
  nwid: Scalars['ID'];
  memberId: Scalars['String'];
};


export type MutationAddMemberArgs = {
  nwid: Scalars['ID'];
  memberId: Scalars['ID'];
};


export type MutationUpdateSettingsArgs = {
  data?: Maybe<UpdateSettingsInput>;
};

export type Network = {
  __typename?: 'Network';
  nwid: Scalars['ID'];
  name?: Maybe<Scalars['String']>;
  private?: Maybe<Scalars['Boolean']>;
  routes?: Maybe<Array<Maybe<Routes>>>;
  ipAssignmentPools?: Maybe<Array<Maybe<IpAssignmentPools>>>;
  cidr?: Maybe<Array<Maybe<Scalars['String']>>>;
};

export type NetworkCallback = {
  __typename?: 'NetworkCallback';
  network?: Maybe<Array<Maybe<Network>>>;
  error?: Maybe<Error>;
};

export type NetworkDetailsCallback = {
  __typename?: 'NetworkDetailsCallback';
  network?: Maybe<Network>;
  members?: Maybe<Array<Maybe<Member>>>;
  zombieMembers?: Maybe<Array<Maybe<Member>>>;
  error?: Maybe<Error>;
};

export type PeerPaths = {
  __typename?: 'PeerPaths';
  active?: Maybe<Scalars['Boolean']>;
  address?: Maybe<Scalars['ID']>;
  expired?: Maybe<Scalars['Boolean']>;
  lastReceive?: Maybe<Scalars['Float']>;
  lastSend?: Maybe<Scalars['Float']>;
  preferred?: Maybe<Scalars['Boolean']>;
  trustedPathId?: Maybe<Scalars['Int']>;
};

export type Peers = {
  __typename?: 'Peers';
  address?: Maybe<Scalars['ID']>;
  isBonded?: Maybe<Scalars['Boolean']>;
  latency?: Maybe<Scalars['Int']>;
  paths?: Maybe<Array<Maybe<PeerPaths>>>;
  role?: Maybe<Scalars['String']>;
  version?: Maybe<Scalars['String']>;
  versionMajor?: Maybe<Scalars['Int']>;
  versionMinor?: Maybe<Scalars['Int']>;
  versionRev?: Maybe<Scalars['Int']>;
};

export type Query = {
  __typename?: 'Query';
  _empty?: Maybe<Scalars['String']>;
  me?: Maybe<Users>;
  admin?: Maybe<Users>;
  token?: Maybe<Scalars['String']>;
  getUsers?: Maybe<Array<Maybe<Users>>>;
  getUser?: Maybe<Users>;
  allNetworks?: Maybe<Array<Maybe<Scalars['JSONObject']>>>;
  networkDetails?: Maybe<NetworkDetailsCallback>;
  controllerStats?: Maybe<Scalars['JSON']>;
  getSettings?: Maybe<UpdateSettings>;
};


export type QueryGetUserArgs = {
  userid: Scalars['ID'];
};


export type QueryNetworkDetailsArgs = {
  nwid: Scalars['ID'];
};

export type Register = {
  __typename?: 'Register';
  firstname: Scalars['String'];
  lastname: Scalars['String'];
  email: Scalars['String'];
  password: Scalars['String'];
  tokenVersion?: Maybe<Scalars['Int']>;
};

export type RegisterResponse = {
  __typename?: 'RegisterResponse';
  error?: Maybe<Error>;
  user?: Maybe<Users>;
};

export enum Role {
  User = 'USER',
  Moderator = 'MODERATOR',
  Admin = 'ADMIN'
}

export type Routes = {
  __typename?: 'Routes';
  target?: Maybe<Scalars['String']>;
  via?: Maybe<Scalars['String']>;
};

export type Subscription = {
  __typename?: 'Subscription';
  _empty?: Maybe<Scalars['String']>;
  memberInformation?: Maybe<NetworkDetailsCallback>;
};


export type SubscriptionMemberInformationArgs = {
  nwid?: Maybe<Scalars['String']>;
  userid?: Maybe<Scalars['ID']>;
};

export type UpdateSettings = {
  __typename?: 'updateSettings';
  id?: Maybe<Scalars['ID']>;
  enableRegistration?: Maybe<Scalars['Boolean']>;
  firstUserRegistration?: Maybe<Scalars['Boolean']>;
};

export type UpdateSettingsInput = {
  id?: Maybe<Scalars['ID']>;
  enableRegistration?: Maybe<Scalars['Boolean']>;
  firstUserRegistration?: Maybe<Scalars['Boolean']>;
};


export type User = {
  userid?: Maybe<Scalars['ID']>;
  firstname?: Maybe<Scalars['String']>;
  lastname?: Maybe<Scalars['String']>;
  tokenVersion?: Maybe<Scalars['String']>;
  email?: Maybe<Scalars['String']>;
  emailConfirmed?: Maybe<Scalars['Boolean']>;
  createdDate?: Maybe<Scalars['DateTime']>;
  lastlogin?: Maybe<Scalars['String']>;
  loggedIn?: Maybe<Scalars['Boolean']>;
  expirationDate?: Maybe<Scalars['String']>;
  hash?: Maybe<Scalars['String']>;
  role?: Maybe<Scalars['String']>;
  licenseKey?: Maybe<Scalars['String']>;
  licenseStatus?: Maybe<Scalars['String']>;
  orderStatus?: Maybe<Scalars['String']>;
  orderId?: Maybe<Scalars['Int']>;
  max_instance_number?: Maybe<Scalars['String']>;
  product_id?: Maybe<Scalars['Int']>;
};

export type Users = {
  __typename?: 'Users';
  userid?: Maybe<Scalars['ID']>;
  firstname?: Maybe<Scalars['String']>;
  lastname?: Maybe<Scalars['String']>;
  tokenVersion?: Maybe<Scalars['String']>;
  email?: Maybe<Scalars['String']>;
  emailConfirmed?: Maybe<Scalars['Boolean']>;
  createdDate?: Maybe<Scalars['DateTime']>;
  lastlogin?: Maybe<Scalars['String']>;
  loggedIn?: Maybe<Scalars['Boolean']>;
  firstTime?: Maybe<Scalars['Boolean']>;
  expirationDate?: Maybe<Scalars['String']>;
  hash?: Maybe<Scalars['String']>;
  role?: Maybe<Scalars['String']>;
  licenseKey?: Maybe<Scalars['String']>;
  licenseStatus?: Maybe<Scalars['String']>;
  orderStatus?: Maybe<Scalars['String']>;
  orderId?: Maybe<Scalars['Int']>;
  max_instance_number?: Maybe<Scalars['String']>;
  product_id?: Maybe<Scalars['Int']>;
};

export type UpdateUserMutationVariables = Exact<{
  userid: Scalars['ID'];
  user: User;
}>;


export type UpdateUserMutation = (
  { __typename?: 'Mutation' }
  & { updateUser?: Maybe<(
    { __typename?: 'Users' }
    & Pick<Users, 'userid' | 'role' | 'licenseStatus'>
  )> }
);

export type RemoveUserMutationVariables = Exact<{
  userid: Scalars['ID'];
}>;


export type RemoveUserMutation = (
  { __typename?: 'Mutation' }
  & Pick<Mutation, 'removeUser'>
);

export type ChangePasswordMutationVariables = Exact<{
  newPassword: Scalars['String'];
  password: Scalars['String'];
  token: Scalars['String'];
}>;


export type ChangePasswordMutation = (
  { __typename?: 'Mutation' }
  & { changePassword?: Maybe<(
    { __typename?: 'RegisterResponse' }
    & { user?: Maybe<(
      { __typename?: 'Users' }
      & Pick<Users, 'email'>
    )>, error?: Maybe<(
      { __typename?: 'Error' }
      & Pick<Error, 'message'>
    )> }
  )> }
);

export type FirstTimeLoginChangePasswordMutationVariables = Exact<{
  newPassword: Scalars['String'];
  password: Scalars['String'];
}>;


export type FirstTimeLoginChangePasswordMutation = (
  { __typename?: 'Mutation' }
  & { firstTimeLoginChangePassword?: Maybe<(
    { __typename?: 'Users' }
    & Pick<Users, 'userid' | 'email'>
  )> }
);

export type ForgotMutationVariables = Exact<{
  email: Scalars['String'];
}>;


export type ForgotMutation = (
  { __typename?: 'Mutation' }
  & Pick<Mutation, 'forgot'>
);

export type LoginMutationVariables = Exact<{
  email: Scalars['String'];
  password: Scalars['String'];
}>;


export type LoginMutation = (
  { __typename?: 'Mutation' }
  & { login?: Maybe<(
    { __typename?: 'LoginResponse' }
    & Pick<LoginResponse, 'accessToken'>
    & { error?: Maybe<(
      { __typename?: 'Error' }
      & Pick<Error, 'userId' | 'mailNotValidated' | 'email' | 'message'>
    )>, user?: Maybe<(
      { __typename?: 'Users' }
      & Pick<Users, 'userid' | 'firstname' | 'lastname' | 'firstTime' | 'email' | 'role' | 'loggedIn'>
    )> }
  )> }
);

export type MailActivationLinkMutationVariables = Exact<{
  userId: Scalars['ID'];
}>;


export type MailActivationLinkMutation = (
  { __typename?: 'Mutation' }
  & Pick<Mutation, 'sendMailLink'>
);

export type ResendMailActivationMutationVariables = Exact<{
  userId: Scalars['ID'];
}>;


export type ResendMailActivationMutation = (
  { __typename?: 'Mutation' }
  & Pick<Mutation, 'sendMailLink'>
);

export type CreateNetworkMutationVariables = Exact<{ [key: string]: never; }>;


export type CreateNetworkMutation = (
  { __typename?: 'Mutation' }
  & { createNetwork?: Maybe<(
    { __typename?: 'NetworkCallback' }
    & { network?: Maybe<Array<Maybe<(
      { __typename?: 'Network' }
      & Pick<Network, 'name' | 'nwid'>
    )>>> }
  )> }
);

export type DeleteNetworkMutationVariables = Exact<{
  nwid: Scalars['ID'];
}>;


export type DeleteNetworkMutation = (
  { __typename?: 'Mutation' }
  & Pick<Mutation, 'deleteNetwork'>
);

export type UpdateNetworkMutationVariables = Exact<{
  nwid: Scalars['ID'];
  data?: Maybe<Scalars['JSONObject']>;
}>;


export type UpdateNetworkMutation = (
  { __typename?: 'Mutation' }
  & { updateNetwork?: Maybe<(
    { __typename?: 'NetworkDetailsCallback' }
    & { network?: Maybe<(
      { __typename?: 'Network' }
      & Pick<Network, 'name' | 'nwid' | 'private'>
      & { ipAssignmentPools?: Maybe<Array<Maybe<(
        { __typename?: 'IpAssignmentPools' }
        & Pick<IpAssignmentPools, 'ipRangeEnd' | 'ipRangeStart'>
      )>>>, routes?: Maybe<Array<Maybe<(
        { __typename?: 'Routes' }
        & Pick<Routes, 'target'>
      )>>> }
    )>, error?: Maybe<(
      { __typename?: 'Error' }
      & Pick<Error, 'message'>
    )> }
  )> }
);

export type MemberUpdateMutationVariables = Exact<{
  nwid: Scalars['ID'];
  memberId: Scalars['String'];
  data?: Maybe<Scalars['JSONObject']>;
}>;


export type MemberUpdateMutation = (
  { __typename?: 'Mutation' }
  & { memberUpdate?: Maybe<(
    { __typename?: 'MemberCallback' }
    & { member?: Maybe<(
      { __typename?: 'Member' }
      & Pick<Member, 'nodeid' | 'identity' | 'id' | 'address' | 'authorized' | 'creationTime' | 'ip' | 'ipAssignments' | 'noAutoAssignIps' | 'nwid'>
    )>, error?: Maybe<(
      { __typename?: 'Error' }
      & Pick<Error, 'message'>
    )> }
  )> }
);

export type MemberUpdateDatabaseOnlyMutationVariables = Exact<{
  nwid: Scalars['ID'];
  nodeid: Scalars['ID'];
  identity: Scalars['ID'];
  data?: Maybe<Scalars['JSONObject']>;
}>;


export type MemberUpdateDatabaseOnlyMutation = (
  { __typename?: 'Mutation' }
  & { memberUpdateDatabaseOnly?: Maybe<(
    { __typename?: 'MemberCallback' }
    & { member?: Maybe<(
      { __typename?: 'Member' }
      & Pick<Member, 'nodeid' | 'identity' | 'id' | 'name'>
    )>, error?: Maybe<(
      { __typename?: 'Error' }
      & Pick<Error, 'message'>
    )> }
  )> }
);

export type RemoveMemberMutationVariables = Exact<{
  nwid: Scalars['ID'];
  memberId: Scalars['String'];
}>;


export type RemoveMemberMutation = (
  { __typename?: 'Mutation' }
  & Pick<Mutation, 'removeMember'>
);

export type AddMemberMutationVariables = Exact<{
  nwid: Scalars['ID'];
  memberId: Scalars['ID'];
}>;


export type AddMemberMutation = (
  { __typename?: 'Mutation' }
  & { addMember?: Maybe<(
    { __typename?: 'MemberCallback' }
    & { member?: Maybe<(
      { __typename?: 'Member' }
      & Pick<Member, 'nodeid' | 'identity' | 'id' | 'address' | 'authorized' | 'creationTime' | 'ip' | 'ipAssignments' | 'noAutoAssignIps' | 'nwid'>
    )> }
  )> }
);

export type RegisterMutationVariables = Exact<{
  lastname: Scalars['String'];
  firstname: Scalars['String'];
  email: Scalars['String'];
  password: Scalars['String'];
  orderId?: Maybe<Scalars['Int']>;
  licenseStatus?: Maybe<Scalars['String']>;
  licenseKey?: Maybe<Scalars['String']>;
  orderStatus?: Maybe<Scalars['String']>;
}>;


export type RegisterMutation = (
  { __typename?: 'Mutation' }
  & { register?: Maybe<(
    { __typename?: 'RegisterResponse' }
    & { error?: Maybe<(
      { __typename?: 'Error' }
      & Pick<Error, 'message'>
    )>, user?: Maybe<(
      { __typename?: 'Users' }
      & Pick<Users, 'userid' | 'firstname' | 'lastname'>
    )> }
  )> }
);

export type UpdateSettingsMutationVariables = Exact<{
  data?: Maybe<UpdateSettingsInput>;
}>;


export type UpdateSettingsMutation = (
  { __typename?: 'Mutation' }
  & { updateSettings?: Maybe<(
    { __typename?: 'updateSettings' }
    & Pick<UpdateSettings, 'id' | 'enableRegistration'>
  )> }
);

export type UploadProfileImageMutationVariables = Exact<{
  file: Scalars['Upload'];
  userid?: Maybe<Scalars['ID']>;
}>;


export type UploadProfileImageMutation = (
  { __typename?: 'Mutation' }
  & Pick<Mutation, 'uploadProfileImage'>
);

export type ValidateEmailMutationVariables = Exact<{
  token: Scalars['String'];
}>;


export type ValidateEmailMutation = (
  { __typename?: 'Mutation' }
  & { validateEmail?: Maybe<(
    { __typename?: 'Users' }
    & Pick<Users, 'firstname' | 'lastname'>
  )> }
);

export type AdminQueryVariables = Exact<{ [key: string]: never; }>;


export type AdminQuery = (
  { __typename?: 'Query' }
  & { admin?: Maybe<(
    { __typename?: 'Users' }
    & Pick<Users, 'userid' | 'firstname' | 'lastname' | 'email' | 'role'>
  )> }
);

export type GetUsersQueryVariables = Exact<{ [key: string]: never; }>;


export type GetUsersQuery = (
  { __typename?: 'Query' }
  & { getUsers?: Maybe<Array<Maybe<(
    { __typename?: 'Users' }
    & Pick<Users, 'userid' | 'firstname' | 'lastname' | 'email' | 'role' | 'licenseKey' | 'lastlogin' | 'licenseStatus' | 'orderStatus' | 'orderId' | 'max_instance_number' | 'product_id'>
  )>>> }
);

export type ControllerStatsQueryVariables = Exact<{ [key: string]: never; }>;


export type ControllerStatsQuery = (
  { __typename?: 'Query' }
  & Pick<Query, 'controllerStats'>
);

export type MeQueryVariables = Exact<{ [key: string]: never; }>;


export type MeQuery = (
  { __typename?: 'Query' }
  & { me?: Maybe<(
    { __typename?: 'Users' }
    & Pick<Users, 'userid' | 'firstname' | 'lastname' | 'email' | 'role' | 'licenseKey' | 'lastlogin' | 'licenseStatus' | 'orderStatus' | 'orderId' | 'max_instance_number' | 'product_id' | 'expirationDate'>
  )> }
);

export type ZtnetworksQueryVariables = Exact<{ [key: string]: never; }>;


export type ZtnetworksQuery = (
  { __typename?: 'Query' }
  & Pick<Query, 'allNetworks'>
);

export type NetworkDetailsQueryVariables = Exact<{
  nwid: Scalars['ID'];
}>;


export type NetworkDetailsQuery = (
  { __typename?: 'Query' }
  & { networkDetails?: Maybe<(
    { __typename?: 'NetworkDetailsCallback' }
    & { network?: Maybe<(
      { __typename?: 'Network' }
      & Pick<Network, 'name' | 'nwid' | 'private' | 'cidr'>
      & { ipAssignmentPools?: Maybe<Array<Maybe<(
        { __typename?: 'IpAssignmentPools' }
        & Pick<IpAssignmentPools, 'ipRangeEnd' | 'ipRangeStart'>
      )>>>, routes?: Maybe<Array<Maybe<(
        { __typename?: 'Routes' }
        & Pick<Routes, 'target'>
      )>>> }
    )>, members?: Maybe<Array<Maybe<(
      { __typename?: 'Member' }
      & Pick<Member, 'lastseen' | 'identity' | 'nodeid' | 'id' | 'name' | 'ip' | 'address' | 'authorized' | 'creationTime' | 'ipAssignments' | 'noAutoAssignIps' | 'nwid'>
      & { peers?: Maybe<(
        { __typename?: 'Peers' }
        & Pick<Peers, 'address' | 'latency' | 'role' | 'version' | 'versionMajor' | 'versionMinor' | 'versionRev'>
        & { paths?: Maybe<Array<Maybe<(
          { __typename?: 'PeerPaths' }
          & Pick<PeerPaths, 'active' | 'address' | 'expired' | 'lastReceive' | 'lastSend' | 'preferred' | 'trustedPathId'>
        )>>> }
      )> }
    )>>>, zombieMembers?: Maybe<Array<Maybe<(
      { __typename?: 'Member' }
      & Pick<Member, 'nodeid' | 'identity' | 'id' | 'name' | 'ip' | 'address' | 'authorized' | 'creationTime' | 'ipAssignments' | 'noAutoAssignIps' | 'nwid'>
    )>>>, error?: Maybe<(
      { __typename?: 'Error' }
      & Pick<Error, 'message'>
    )> }
  )> }
);

export type GetSettingsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetSettingsQuery = (
  { __typename?: 'Query' }
  & { getSettings?: Maybe<(
    { __typename?: 'updateSettings' }
    & Pick<UpdateSettings, 'id' | 'enableRegistration' | 'firstUserRegistration'>
  )> }
);

export type UsersQueryVariables = Exact<{ [key: string]: never; }>;


export type UsersQuery = (
  { __typename?: 'Query' }
  & { getUsers?: Maybe<Array<Maybe<(
    { __typename?: 'Users' }
    & Pick<Users, 'userid' | 'firstname' | 'lastname' | 'email' | 'tokenVersion' | 'emailConfirmed' | 'createdDate' | 'lastlogin' | 'role'>
  )>>> }
);

export type MemberInformationSubscriptionVariables = Exact<{
  nwid?: Maybe<Scalars['String']>;
  userid?: Maybe<Scalars['ID']>;
}>;


export type MemberInformationSubscription = (
  { __typename?: 'Subscription' }
  & { memberInformation?: Maybe<(
    { __typename?: 'NetworkDetailsCallback' }
    & { members?: Maybe<Array<Maybe<(
      { __typename?: 'Member' }
      & Pick<Member, 'nodeid' | 'name' | 'identity' | 'online' | 'address' | 'authorized' | 'ipAssignments' | 'nwid'>
      & { peers?: Maybe<(
        { __typename?: 'Peers' }
        & Pick<Peers, 'address' | 'latency' | 'role' | 'version' | 'versionMajor' | 'versionMinor' | 'versionRev'>
        & { paths?: Maybe<Array<Maybe<(
          { __typename?: 'PeerPaths' }
          & Pick<PeerPaths, 'active' | 'address' | 'expired' | 'lastReceive' | 'lastSend' | 'preferred'>
        )>>> }
      )> }
    )>>> }
  )> }
);


export const UpdateUserDocument = gql`
    mutation updateUser($userid: ID!, $user: User!) {
  updateUser(userid: $userid, user: $user) {
    userid
    role
    licenseStatus
  }
}
    `;
export type UpdateUserMutationFn = Apollo.MutationFunction<UpdateUserMutation, UpdateUserMutationVariables>;

/**
 * __useUpdateUserMutation__
 *
 * To run a mutation, you first call `useUpdateUserMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateUserMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateUserMutation, { data, loading, error }] = useUpdateUserMutation({
 *   variables: {
 *      userid: // value for 'userid'
 *      user: // value for 'user'
 *   },
 * });
 */
export function useUpdateUserMutation(baseOptions?: Apollo.MutationHookOptions<UpdateUserMutation, UpdateUserMutationVariables>) {
        return Apollo.useMutation<UpdateUserMutation, UpdateUserMutationVariables>(UpdateUserDocument, baseOptions);
      }
export type UpdateUserMutationHookResult = ReturnType<typeof useUpdateUserMutation>;
export type UpdateUserMutationResult = Apollo.MutationResult<UpdateUserMutation>;
export type UpdateUserMutationOptions = Apollo.BaseMutationOptions<UpdateUserMutation, UpdateUserMutationVariables>;
export const RemoveUserDocument = gql`
    mutation removeUser($userid: ID!) {
  removeUser(userid: $userid)
}
    `;
export type RemoveUserMutationFn = Apollo.MutationFunction<RemoveUserMutation, RemoveUserMutationVariables>;

/**
 * __useRemoveUserMutation__
 *
 * To run a mutation, you first call `useRemoveUserMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRemoveUserMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [removeUserMutation, { data, loading, error }] = useRemoveUserMutation({
 *   variables: {
 *      userid: // value for 'userid'
 *   },
 * });
 */
export function useRemoveUserMutation(baseOptions?: Apollo.MutationHookOptions<RemoveUserMutation, RemoveUserMutationVariables>) {
        return Apollo.useMutation<RemoveUserMutation, RemoveUserMutationVariables>(RemoveUserDocument, baseOptions);
      }
export type RemoveUserMutationHookResult = ReturnType<typeof useRemoveUserMutation>;
export type RemoveUserMutationResult = Apollo.MutationResult<RemoveUserMutation>;
export type RemoveUserMutationOptions = Apollo.BaseMutationOptions<RemoveUserMutation, RemoveUserMutationVariables>;
export const ChangePasswordDocument = gql`
    mutation changePassword($newPassword: String!, $password: String!, $token: String!) {
  changePassword(newPassword: $newPassword, password: $password, token: $token) {
    user {
      email
    }
    error {
      message
    }
  }
}
    `;
export type ChangePasswordMutationFn = Apollo.MutationFunction<ChangePasswordMutation, ChangePasswordMutationVariables>;

/**
 * __useChangePasswordMutation__
 *
 * To run a mutation, you first call `useChangePasswordMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useChangePasswordMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [changePasswordMutation, { data, loading, error }] = useChangePasswordMutation({
 *   variables: {
 *      newPassword: // value for 'newPassword'
 *      password: // value for 'password'
 *      token: // value for 'token'
 *   },
 * });
 */
export function useChangePasswordMutation(baseOptions?: Apollo.MutationHookOptions<ChangePasswordMutation, ChangePasswordMutationVariables>) {
        return Apollo.useMutation<ChangePasswordMutation, ChangePasswordMutationVariables>(ChangePasswordDocument, baseOptions);
      }
export type ChangePasswordMutationHookResult = ReturnType<typeof useChangePasswordMutation>;
export type ChangePasswordMutationResult = Apollo.MutationResult<ChangePasswordMutation>;
export type ChangePasswordMutationOptions = Apollo.BaseMutationOptions<ChangePasswordMutation, ChangePasswordMutationVariables>;
export const FirstTimeLoginChangePasswordDocument = gql`
    mutation firstTimeLoginChangePassword($newPassword: String!, $password: String!) {
  firstTimeLoginChangePassword(newPassword: $newPassword, password: $password) {
    userid
    email
  }
}
    `;
export type FirstTimeLoginChangePasswordMutationFn = Apollo.MutationFunction<FirstTimeLoginChangePasswordMutation, FirstTimeLoginChangePasswordMutationVariables>;

/**
 * __useFirstTimeLoginChangePasswordMutation__
 *
 * To run a mutation, you first call `useFirstTimeLoginChangePasswordMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useFirstTimeLoginChangePasswordMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [firstTimeLoginChangePasswordMutation, { data, loading, error }] = useFirstTimeLoginChangePasswordMutation({
 *   variables: {
 *      newPassword: // value for 'newPassword'
 *      password: // value for 'password'
 *   },
 * });
 */
export function useFirstTimeLoginChangePasswordMutation(baseOptions?: Apollo.MutationHookOptions<FirstTimeLoginChangePasswordMutation, FirstTimeLoginChangePasswordMutationVariables>) {
        return Apollo.useMutation<FirstTimeLoginChangePasswordMutation, FirstTimeLoginChangePasswordMutationVariables>(FirstTimeLoginChangePasswordDocument, baseOptions);
      }
export type FirstTimeLoginChangePasswordMutationHookResult = ReturnType<typeof useFirstTimeLoginChangePasswordMutation>;
export type FirstTimeLoginChangePasswordMutationResult = Apollo.MutationResult<FirstTimeLoginChangePasswordMutation>;
export type FirstTimeLoginChangePasswordMutationOptions = Apollo.BaseMutationOptions<FirstTimeLoginChangePasswordMutation, FirstTimeLoginChangePasswordMutationVariables>;
export const ForgotDocument = gql`
    mutation forgot($email: String!) {
  forgot(email: $email)
}
    `;
export type ForgotMutationFn = Apollo.MutationFunction<ForgotMutation, ForgotMutationVariables>;

/**
 * __useForgotMutation__
 *
 * To run a mutation, you first call `useForgotMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useForgotMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [forgotMutation, { data, loading, error }] = useForgotMutation({
 *   variables: {
 *      email: // value for 'email'
 *   },
 * });
 */
export function useForgotMutation(baseOptions?: Apollo.MutationHookOptions<ForgotMutation, ForgotMutationVariables>) {
        return Apollo.useMutation<ForgotMutation, ForgotMutationVariables>(ForgotDocument, baseOptions);
      }
export type ForgotMutationHookResult = ReturnType<typeof useForgotMutation>;
export type ForgotMutationResult = Apollo.MutationResult<ForgotMutation>;
export type ForgotMutationOptions = Apollo.BaseMutationOptions<ForgotMutation, ForgotMutationVariables>;
export const LoginDocument = gql`
    mutation login($email: String!, $password: String!) {
  login(email: $email, password: $password) {
    accessToken
    error {
      userId
      mailNotValidated
      email
      message
    }
    user {
      userid
      firstname
      lastname
      firstTime
      email
      role
      loggedIn
    }
  }
}
    `;
export type LoginMutationFn = Apollo.MutationFunction<LoginMutation, LoginMutationVariables>;

/**
 * __useLoginMutation__
 *
 * To run a mutation, you first call `useLoginMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useLoginMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [loginMutation, { data, loading, error }] = useLoginMutation({
 *   variables: {
 *      email: // value for 'email'
 *      password: // value for 'password'
 *   },
 * });
 */
export function useLoginMutation(baseOptions?: Apollo.MutationHookOptions<LoginMutation, LoginMutationVariables>) {
        return Apollo.useMutation<LoginMutation, LoginMutationVariables>(LoginDocument, baseOptions);
      }
export type LoginMutationHookResult = ReturnType<typeof useLoginMutation>;
export type LoginMutationResult = Apollo.MutationResult<LoginMutation>;
export type LoginMutationOptions = Apollo.BaseMutationOptions<LoginMutation, LoginMutationVariables>;
export const MailActivationLinkDocument = gql`
    mutation mailActivationLink($userId: ID!) {
  sendMailLink(userId: $userId)
}
    `;
export type MailActivationLinkMutationFn = Apollo.MutationFunction<MailActivationLinkMutation, MailActivationLinkMutationVariables>;

/**
 * __useMailActivationLinkMutation__
 *
 * To run a mutation, you first call `useMailActivationLinkMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useMailActivationLinkMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [mailActivationLinkMutation, { data, loading, error }] = useMailActivationLinkMutation({
 *   variables: {
 *      userId: // value for 'userId'
 *   },
 * });
 */
export function useMailActivationLinkMutation(baseOptions?: Apollo.MutationHookOptions<MailActivationLinkMutation, MailActivationLinkMutationVariables>) {
        return Apollo.useMutation<MailActivationLinkMutation, MailActivationLinkMutationVariables>(MailActivationLinkDocument, baseOptions);
      }
export type MailActivationLinkMutationHookResult = ReturnType<typeof useMailActivationLinkMutation>;
export type MailActivationLinkMutationResult = Apollo.MutationResult<MailActivationLinkMutation>;
export type MailActivationLinkMutationOptions = Apollo.BaseMutationOptions<MailActivationLinkMutation, MailActivationLinkMutationVariables>;
export const ResendMailActivationDocument = gql`
    mutation resendMailActivation($userId: ID!) {
  sendMailLink(userId: $userId)
}
    `;
export type ResendMailActivationMutationFn = Apollo.MutationFunction<ResendMailActivationMutation, ResendMailActivationMutationVariables>;

/**
 * __useResendMailActivationMutation__
 *
 * To run a mutation, you first call `useResendMailActivationMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useResendMailActivationMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [resendMailActivationMutation, { data, loading, error }] = useResendMailActivationMutation({
 *   variables: {
 *      userId: // value for 'userId'
 *   },
 * });
 */
export function useResendMailActivationMutation(baseOptions?: Apollo.MutationHookOptions<ResendMailActivationMutation, ResendMailActivationMutationVariables>) {
        return Apollo.useMutation<ResendMailActivationMutation, ResendMailActivationMutationVariables>(ResendMailActivationDocument, baseOptions);
      }
export type ResendMailActivationMutationHookResult = ReturnType<typeof useResendMailActivationMutation>;
export type ResendMailActivationMutationResult = Apollo.MutationResult<ResendMailActivationMutation>;
export type ResendMailActivationMutationOptions = Apollo.BaseMutationOptions<ResendMailActivationMutation, ResendMailActivationMutationVariables>;
export const CreateNetworkDocument = gql`
    mutation createNetwork {
  createNetwork {
    network {
      name
      nwid
    }
  }
}
    `;
export type CreateNetworkMutationFn = Apollo.MutationFunction<CreateNetworkMutation, CreateNetworkMutationVariables>;

/**
 * __useCreateNetworkMutation__
 *
 * To run a mutation, you first call `useCreateNetworkMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateNetworkMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createNetworkMutation, { data, loading, error }] = useCreateNetworkMutation({
 *   variables: {
 *   },
 * });
 */
export function useCreateNetworkMutation(baseOptions?: Apollo.MutationHookOptions<CreateNetworkMutation, CreateNetworkMutationVariables>) {
        return Apollo.useMutation<CreateNetworkMutation, CreateNetworkMutationVariables>(CreateNetworkDocument, baseOptions);
      }
export type CreateNetworkMutationHookResult = ReturnType<typeof useCreateNetworkMutation>;
export type CreateNetworkMutationResult = Apollo.MutationResult<CreateNetworkMutation>;
export type CreateNetworkMutationOptions = Apollo.BaseMutationOptions<CreateNetworkMutation, CreateNetworkMutationVariables>;
export const DeleteNetworkDocument = gql`
    mutation deleteNetwork($nwid: ID!) {
  deleteNetwork(nwid: $nwid)
}
    `;
export type DeleteNetworkMutationFn = Apollo.MutationFunction<DeleteNetworkMutation, DeleteNetworkMutationVariables>;

/**
 * __useDeleteNetworkMutation__
 *
 * To run a mutation, you first call `useDeleteNetworkMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteNetworkMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteNetworkMutation, { data, loading, error }] = useDeleteNetworkMutation({
 *   variables: {
 *      nwid: // value for 'nwid'
 *   },
 * });
 */
export function useDeleteNetworkMutation(baseOptions?: Apollo.MutationHookOptions<DeleteNetworkMutation, DeleteNetworkMutationVariables>) {
        return Apollo.useMutation<DeleteNetworkMutation, DeleteNetworkMutationVariables>(DeleteNetworkDocument, baseOptions);
      }
export type DeleteNetworkMutationHookResult = ReturnType<typeof useDeleteNetworkMutation>;
export type DeleteNetworkMutationResult = Apollo.MutationResult<DeleteNetworkMutation>;
export type DeleteNetworkMutationOptions = Apollo.BaseMutationOptions<DeleteNetworkMutation, DeleteNetworkMutationVariables>;
export const UpdateNetworkDocument = gql`
    mutation updateNetwork($nwid: ID!, $data: JSONObject) {
  updateNetwork(nwid: $nwid, data: $data) {
    network {
      name
      nwid
      private
      ipAssignmentPools {
        ipRangeEnd
        ipRangeStart
      }
      routes {
        target
      }
    }
    error {
      message
    }
  }
}
    `;
export type UpdateNetworkMutationFn = Apollo.MutationFunction<UpdateNetworkMutation, UpdateNetworkMutationVariables>;

/**
 * __useUpdateNetworkMutation__
 *
 * To run a mutation, you first call `useUpdateNetworkMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateNetworkMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateNetworkMutation, { data, loading, error }] = useUpdateNetworkMutation({
 *   variables: {
 *      nwid: // value for 'nwid'
 *      data: // value for 'data'
 *   },
 * });
 */
export function useUpdateNetworkMutation(baseOptions?: Apollo.MutationHookOptions<UpdateNetworkMutation, UpdateNetworkMutationVariables>) {
        return Apollo.useMutation<UpdateNetworkMutation, UpdateNetworkMutationVariables>(UpdateNetworkDocument, baseOptions);
      }
export type UpdateNetworkMutationHookResult = ReturnType<typeof useUpdateNetworkMutation>;
export type UpdateNetworkMutationResult = Apollo.MutationResult<UpdateNetworkMutation>;
export type UpdateNetworkMutationOptions = Apollo.BaseMutationOptions<UpdateNetworkMutation, UpdateNetworkMutationVariables>;
export const MemberUpdateDocument = gql`
    mutation memberUpdate($nwid: ID!, $memberId: String!, $data: JSONObject) {
  memberUpdate(nwid: $nwid, memberId: $memberId, data: $data) {
    member {
      nodeid
      identity
      id
      address
      authorized
      creationTime
      ip
      ipAssignments
      noAutoAssignIps
      nwid
    }
    error {
      message
    }
  }
}
    `;
export type MemberUpdateMutationFn = Apollo.MutationFunction<MemberUpdateMutation, MemberUpdateMutationVariables>;

/**
 * __useMemberUpdateMutation__
 *
 * To run a mutation, you first call `useMemberUpdateMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useMemberUpdateMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [memberUpdateMutation, { data, loading, error }] = useMemberUpdateMutation({
 *   variables: {
 *      nwid: // value for 'nwid'
 *      memberId: // value for 'memberId'
 *      data: // value for 'data'
 *   },
 * });
 */
export function useMemberUpdateMutation(baseOptions?: Apollo.MutationHookOptions<MemberUpdateMutation, MemberUpdateMutationVariables>) {
        return Apollo.useMutation<MemberUpdateMutation, MemberUpdateMutationVariables>(MemberUpdateDocument, baseOptions);
      }
export type MemberUpdateMutationHookResult = ReturnType<typeof useMemberUpdateMutation>;
export type MemberUpdateMutationResult = Apollo.MutationResult<MemberUpdateMutation>;
export type MemberUpdateMutationOptions = Apollo.BaseMutationOptions<MemberUpdateMutation, MemberUpdateMutationVariables>;
export const MemberUpdateDatabaseOnlyDocument = gql`
    mutation memberUpdateDatabaseOnly($nwid: ID!, $nodeid: ID!, $identity: ID!, $data: JSONObject) {
  memberUpdateDatabaseOnly(nwid: $nwid, nodeid: $nodeid, identity: $identity, data: $data) {
    member {
      nodeid
      identity
      id
      name
    }
    error {
      message
    }
  }
}
    `;
export type MemberUpdateDatabaseOnlyMutationFn = Apollo.MutationFunction<MemberUpdateDatabaseOnlyMutation, MemberUpdateDatabaseOnlyMutationVariables>;

/**
 * __useMemberUpdateDatabaseOnlyMutation__
 *
 * To run a mutation, you first call `useMemberUpdateDatabaseOnlyMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useMemberUpdateDatabaseOnlyMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [memberUpdateDatabaseOnlyMutation, { data, loading, error }] = useMemberUpdateDatabaseOnlyMutation({
 *   variables: {
 *      nwid: // value for 'nwid'
 *      nodeid: // value for 'nodeid'
 *      identity: // value for 'identity'
 *      data: // value for 'data'
 *   },
 * });
 */
export function useMemberUpdateDatabaseOnlyMutation(baseOptions?: Apollo.MutationHookOptions<MemberUpdateDatabaseOnlyMutation, MemberUpdateDatabaseOnlyMutationVariables>) {
        return Apollo.useMutation<MemberUpdateDatabaseOnlyMutation, MemberUpdateDatabaseOnlyMutationVariables>(MemberUpdateDatabaseOnlyDocument, baseOptions);
      }
export type MemberUpdateDatabaseOnlyMutationHookResult = ReturnType<typeof useMemberUpdateDatabaseOnlyMutation>;
export type MemberUpdateDatabaseOnlyMutationResult = Apollo.MutationResult<MemberUpdateDatabaseOnlyMutation>;
export type MemberUpdateDatabaseOnlyMutationOptions = Apollo.BaseMutationOptions<MemberUpdateDatabaseOnlyMutation, MemberUpdateDatabaseOnlyMutationVariables>;
export const RemoveMemberDocument = gql`
    mutation removeMember($nwid: ID!, $memberId: String!) {
  removeMember(nwid: $nwid, memberId: $memberId)
}
    `;
export type RemoveMemberMutationFn = Apollo.MutationFunction<RemoveMemberMutation, RemoveMemberMutationVariables>;

/**
 * __useRemoveMemberMutation__
 *
 * To run a mutation, you first call `useRemoveMemberMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRemoveMemberMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [removeMemberMutation, { data, loading, error }] = useRemoveMemberMutation({
 *   variables: {
 *      nwid: // value for 'nwid'
 *      memberId: // value for 'memberId'
 *   },
 * });
 */
export function useRemoveMemberMutation(baseOptions?: Apollo.MutationHookOptions<RemoveMemberMutation, RemoveMemberMutationVariables>) {
        return Apollo.useMutation<RemoveMemberMutation, RemoveMemberMutationVariables>(RemoveMemberDocument, baseOptions);
      }
export type RemoveMemberMutationHookResult = ReturnType<typeof useRemoveMemberMutation>;
export type RemoveMemberMutationResult = Apollo.MutationResult<RemoveMemberMutation>;
export type RemoveMemberMutationOptions = Apollo.BaseMutationOptions<RemoveMemberMutation, RemoveMemberMutationVariables>;
export const AddMemberDocument = gql`
    mutation addMember($nwid: ID!, $memberId: ID!) {
  addMember(nwid: $nwid, memberId: $memberId) {
    member {
      nodeid
      identity
      id
      address
      authorized
      creationTime
      ip
      ipAssignments
      noAutoAssignIps
      nwid
    }
  }
}
    `;
export type AddMemberMutationFn = Apollo.MutationFunction<AddMemberMutation, AddMemberMutationVariables>;

/**
 * __useAddMemberMutation__
 *
 * To run a mutation, you first call `useAddMemberMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useAddMemberMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [addMemberMutation, { data, loading, error }] = useAddMemberMutation({
 *   variables: {
 *      nwid: // value for 'nwid'
 *      memberId: // value for 'memberId'
 *   },
 * });
 */
export function useAddMemberMutation(baseOptions?: Apollo.MutationHookOptions<AddMemberMutation, AddMemberMutationVariables>) {
        return Apollo.useMutation<AddMemberMutation, AddMemberMutationVariables>(AddMemberDocument, baseOptions);
      }
export type AddMemberMutationHookResult = ReturnType<typeof useAddMemberMutation>;
export type AddMemberMutationResult = Apollo.MutationResult<AddMemberMutation>;
export type AddMemberMutationOptions = Apollo.BaseMutationOptions<AddMemberMutation, AddMemberMutationVariables>;
export const RegisterDocument = gql`
    mutation register($lastname: String!, $firstname: String!, $email: String!, $password: String!, $orderId: Int, $licenseStatus: String, $licenseKey: String, $orderStatus: String) {
  register(lastname: $lastname, firstname: $firstname, email: $email, password: $password, orderId: $orderId, licenseStatus: $licenseStatus, licenseKey: $licenseKey, orderStatus: $orderStatus) {
    error {
      message
    }
    user {
      userid
      firstname
      lastname
    }
  }
}
    `;
export type RegisterMutationFn = Apollo.MutationFunction<RegisterMutation, RegisterMutationVariables>;

/**
 * __useRegisterMutation__
 *
 * To run a mutation, you first call `useRegisterMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRegisterMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [registerMutation, { data, loading, error }] = useRegisterMutation({
 *   variables: {
 *      lastname: // value for 'lastname'
 *      firstname: // value for 'firstname'
 *      email: // value for 'email'
 *      password: // value for 'password'
 *      orderId: // value for 'orderId'
 *      licenseStatus: // value for 'licenseStatus'
 *      licenseKey: // value for 'licenseKey'
 *      orderStatus: // value for 'orderStatus'
 *   },
 * });
 */
export function useRegisterMutation(baseOptions?: Apollo.MutationHookOptions<RegisterMutation, RegisterMutationVariables>) {
        return Apollo.useMutation<RegisterMutation, RegisterMutationVariables>(RegisterDocument, baseOptions);
      }
export type RegisterMutationHookResult = ReturnType<typeof useRegisterMutation>;
export type RegisterMutationResult = Apollo.MutationResult<RegisterMutation>;
export type RegisterMutationOptions = Apollo.BaseMutationOptions<RegisterMutation, RegisterMutationVariables>;
export const UpdateSettingsDocument = gql`
    mutation updateSettings($data: updateSettingsInput) {
  updateSettings(data: $data) {
    id
    enableRegistration
  }
}
    `;
export type UpdateSettingsMutationFn = Apollo.MutationFunction<UpdateSettingsMutation, UpdateSettingsMutationVariables>;

/**
 * __useUpdateSettingsMutation__
 *
 * To run a mutation, you first call `useUpdateSettingsMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateSettingsMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateSettingsMutation, { data, loading, error }] = useUpdateSettingsMutation({
 *   variables: {
 *      data: // value for 'data'
 *   },
 * });
 */
export function useUpdateSettingsMutation(baseOptions?: Apollo.MutationHookOptions<UpdateSettingsMutation, UpdateSettingsMutationVariables>) {
        return Apollo.useMutation<UpdateSettingsMutation, UpdateSettingsMutationVariables>(UpdateSettingsDocument, baseOptions);
      }
export type UpdateSettingsMutationHookResult = ReturnType<typeof useUpdateSettingsMutation>;
export type UpdateSettingsMutationResult = Apollo.MutationResult<UpdateSettingsMutation>;
export type UpdateSettingsMutationOptions = Apollo.BaseMutationOptions<UpdateSettingsMutation, UpdateSettingsMutationVariables>;
export const UploadProfileImageDocument = gql`
    mutation uploadProfileImage($file: Upload!, $userid: ID) {
  uploadProfileImage(file: $file, userid: $userid)
}
    `;
export type UploadProfileImageMutationFn = Apollo.MutationFunction<UploadProfileImageMutation, UploadProfileImageMutationVariables>;

/**
 * __useUploadProfileImageMutation__
 *
 * To run a mutation, you first call `useUploadProfileImageMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUploadProfileImageMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [uploadProfileImageMutation, { data, loading, error }] = useUploadProfileImageMutation({
 *   variables: {
 *      file: // value for 'file'
 *      userid: // value for 'userid'
 *   },
 * });
 */
export function useUploadProfileImageMutation(baseOptions?: Apollo.MutationHookOptions<UploadProfileImageMutation, UploadProfileImageMutationVariables>) {
        return Apollo.useMutation<UploadProfileImageMutation, UploadProfileImageMutationVariables>(UploadProfileImageDocument, baseOptions);
      }
export type UploadProfileImageMutationHookResult = ReturnType<typeof useUploadProfileImageMutation>;
export type UploadProfileImageMutationResult = Apollo.MutationResult<UploadProfileImageMutation>;
export type UploadProfileImageMutationOptions = Apollo.BaseMutationOptions<UploadProfileImageMutation, UploadProfileImageMutationVariables>;
export const ValidateEmailDocument = gql`
    mutation validateEmail($token: String!) {
  validateEmail(token: $token) {
    firstname
    lastname
  }
}
    `;
export type ValidateEmailMutationFn = Apollo.MutationFunction<ValidateEmailMutation, ValidateEmailMutationVariables>;

/**
 * __useValidateEmailMutation__
 *
 * To run a mutation, you first call `useValidateEmailMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useValidateEmailMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [validateEmailMutation, { data, loading, error }] = useValidateEmailMutation({
 *   variables: {
 *      token: // value for 'token'
 *   },
 * });
 */
export function useValidateEmailMutation(baseOptions?: Apollo.MutationHookOptions<ValidateEmailMutation, ValidateEmailMutationVariables>) {
        return Apollo.useMutation<ValidateEmailMutation, ValidateEmailMutationVariables>(ValidateEmailDocument, baseOptions);
      }
export type ValidateEmailMutationHookResult = ReturnType<typeof useValidateEmailMutation>;
export type ValidateEmailMutationResult = Apollo.MutationResult<ValidateEmailMutation>;
export type ValidateEmailMutationOptions = Apollo.BaseMutationOptions<ValidateEmailMutation, ValidateEmailMutationVariables>;
export const AdminDocument = gql`
    query admin {
  admin {
    userid
    firstname
    lastname
    email
    role
  }
}
    `;

/**
 * __useAdminQuery__
 *
 * To run a query within a React component, call `useAdminQuery` and pass it any options that fit your needs.
 * When your component renders, `useAdminQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useAdminQuery({
 *   variables: {
 *   },
 * });
 */
export function useAdminQuery(baseOptions?: Apollo.QueryHookOptions<AdminQuery, AdminQueryVariables>) {
        return Apollo.useQuery<AdminQuery, AdminQueryVariables>(AdminDocument, baseOptions);
      }
export function useAdminLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<AdminQuery, AdminQueryVariables>) {
          return Apollo.useLazyQuery<AdminQuery, AdminQueryVariables>(AdminDocument, baseOptions);
        }
export type AdminQueryHookResult = ReturnType<typeof useAdminQuery>;
export type AdminLazyQueryHookResult = ReturnType<typeof useAdminLazyQuery>;
export type AdminQueryResult = Apollo.QueryResult<AdminQuery, AdminQueryVariables>;
export const GetUsersDocument = gql`
    query getUsers {
  getUsers {
    userid
    firstname
    lastname
    email
    role
    licenseKey
    email
    lastlogin
    licenseStatus
    orderStatus
    orderId
    max_instance_number
    product_id
  }
}
    `;

/**
 * __useGetUsersQuery__
 *
 * To run a query within a React component, call `useGetUsersQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetUsersQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetUsersQuery({
 *   variables: {
 *   },
 * });
 */
export function useGetUsersQuery(baseOptions?: Apollo.QueryHookOptions<GetUsersQuery, GetUsersQueryVariables>) {
        return Apollo.useQuery<GetUsersQuery, GetUsersQueryVariables>(GetUsersDocument, baseOptions);
      }
export function useGetUsersLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetUsersQuery, GetUsersQueryVariables>) {
          return Apollo.useLazyQuery<GetUsersQuery, GetUsersQueryVariables>(GetUsersDocument, baseOptions);
        }
export type GetUsersQueryHookResult = ReturnType<typeof useGetUsersQuery>;
export type GetUsersLazyQueryHookResult = ReturnType<typeof useGetUsersLazyQuery>;
export type GetUsersQueryResult = Apollo.QueryResult<GetUsersQuery, GetUsersQueryVariables>;
export const ControllerStatsDocument = gql`
    query controllerStats {
  controllerStats
}
    `;

/**
 * __useControllerStatsQuery__
 *
 * To run a query within a React component, call `useControllerStatsQuery` and pass it any options that fit your needs.
 * When your component renders, `useControllerStatsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useControllerStatsQuery({
 *   variables: {
 *   },
 * });
 */
export function useControllerStatsQuery(baseOptions?: Apollo.QueryHookOptions<ControllerStatsQuery, ControllerStatsQueryVariables>) {
        return Apollo.useQuery<ControllerStatsQuery, ControllerStatsQueryVariables>(ControllerStatsDocument, baseOptions);
      }
export function useControllerStatsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ControllerStatsQuery, ControllerStatsQueryVariables>) {
          return Apollo.useLazyQuery<ControllerStatsQuery, ControllerStatsQueryVariables>(ControllerStatsDocument, baseOptions);
        }
export type ControllerStatsQueryHookResult = ReturnType<typeof useControllerStatsQuery>;
export type ControllerStatsLazyQueryHookResult = ReturnType<typeof useControllerStatsLazyQuery>;
export type ControllerStatsQueryResult = Apollo.QueryResult<ControllerStatsQuery, ControllerStatsQueryVariables>;
export const MeDocument = gql`
    query me {
  me {
    userid
    firstname
    lastname
    email
    role
    licenseKey
    email
    lastlogin
    licenseStatus
    orderStatus
    orderId
    max_instance_number
    product_id
    expirationDate
  }
}
    `;

/**
 * __useMeQuery__
 *
 * To run a query within a React component, call `useMeQuery` and pass it any options that fit your needs.
 * When your component renders, `useMeQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useMeQuery({
 *   variables: {
 *   },
 * });
 */
export function useMeQuery(baseOptions?: Apollo.QueryHookOptions<MeQuery, MeQueryVariables>) {
        return Apollo.useQuery<MeQuery, MeQueryVariables>(MeDocument, baseOptions);
      }
export function useMeLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<MeQuery, MeQueryVariables>) {
          return Apollo.useLazyQuery<MeQuery, MeQueryVariables>(MeDocument, baseOptions);
        }
export type MeQueryHookResult = ReturnType<typeof useMeQuery>;
export type MeLazyQueryHookResult = ReturnType<typeof useMeLazyQuery>;
export type MeQueryResult = Apollo.QueryResult<MeQuery, MeQueryVariables>;
export const ZtnetworksDocument = gql`
    query ztnetworks {
  allNetworks
}
    `;

/**
 * __useZtnetworksQuery__
 *
 * To run a query within a React component, call `useZtnetworksQuery` and pass it any options that fit your needs.
 * When your component renders, `useZtnetworksQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useZtnetworksQuery({
 *   variables: {
 *   },
 * });
 */
export function useZtnetworksQuery(baseOptions?: Apollo.QueryHookOptions<ZtnetworksQuery, ZtnetworksQueryVariables>) {
        return Apollo.useQuery<ZtnetworksQuery, ZtnetworksQueryVariables>(ZtnetworksDocument, baseOptions);
      }
export function useZtnetworksLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ZtnetworksQuery, ZtnetworksQueryVariables>) {
          return Apollo.useLazyQuery<ZtnetworksQuery, ZtnetworksQueryVariables>(ZtnetworksDocument, baseOptions);
        }
export type ZtnetworksQueryHookResult = ReturnType<typeof useZtnetworksQuery>;
export type ZtnetworksLazyQueryHookResult = ReturnType<typeof useZtnetworksLazyQuery>;
export type ZtnetworksQueryResult = Apollo.QueryResult<ZtnetworksQuery, ZtnetworksQueryVariables>;
export const NetworkDetailsDocument = gql`
    query networkDetails($nwid: ID!) {
  networkDetails(nwid: $nwid) {
    network {
      name
      nwid
      private
      cidr
      ipAssignmentPools {
        ipRangeEnd
        ipRangeStart
      }
      routes {
        target
      }
    }
    members {
      lastseen
      identity
      nodeid
      id
      name
      ip
      address
      authorized
      creationTime
      ipAssignments
      noAutoAssignIps
      nwid
      peers {
        address
        latency
        role
        version
        versionMajor
        versionMinor
        versionRev
        paths {
          active
          address
          expired
          lastReceive
          lastSend
          preferred
          trustedPathId
        }
      }
    }
    zombieMembers {
      nodeid
      identity
      id
      name
      ip
      address
      authorized
      creationTime
      ipAssignments
      noAutoAssignIps
      nwid
    }
    error {
      message
    }
  }
}
    `;

/**
 * __useNetworkDetailsQuery__
 *
 * To run a query within a React component, call `useNetworkDetailsQuery` and pass it any options that fit your needs.
 * When your component renders, `useNetworkDetailsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useNetworkDetailsQuery({
 *   variables: {
 *      nwid: // value for 'nwid'
 *   },
 * });
 */
export function useNetworkDetailsQuery(baseOptions?: Apollo.QueryHookOptions<NetworkDetailsQuery, NetworkDetailsQueryVariables>) {
        return Apollo.useQuery<NetworkDetailsQuery, NetworkDetailsQueryVariables>(NetworkDetailsDocument, baseOptions);
      }
export function useNetworkDetailsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<NetworkDetailsQuery, NetworkDetailsQueryVariables>) {
          return Apollo.useLazyQuery<NetworkDetailsQuery, NetworkDetailsQueryVariables>(NetworkDetailsDocument, baseOptions);
        }
export type NetworkDetailsQueryHookResult = ReturnType<typeof useNetworkDetailsQuery>;
export type NetworkDetailsLazyQueryHookResult = ReturnType<typeof useNetworkDetailsLazyQuery>;
export type NetworkDetailsQueryResult = Apollo.QueryResult<NetworkDetailsQuery, NetworkDetailsQueryVariables>;
export const GetSettingsDocument = gql`
    query getSettings {
  getSettings {
    id
    enableRegistration
    firstUserRegistration
  }
}
    `;

/**
 * __useGetSettingsQuery__
 *
 * To run a query within a React component, call `useGetSettingsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetSettingsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetSettingsQuery({
 *   variables: {
 *   },
 * });
 */
export function useGetSettingsQuery(baseOptions?: Apollo.QueryHookOptions<GetSettingsQuery, GetSettingsQueryVariables>) {
        return Apollo.useQuery<GetSettingsQuery, GetSettingsQueryVariables>(GetSettingsDocument, baseOptions);
      }
export function useGetSettingsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetSettingsQuery, GetSettingsQueryVariables>) {
          return Apollo.useLazyQuery<GetSettingsQuery, GetSettingsQueryVariables>(GetSettingsDocument, baseOptions);
        }
export type GetSettingsQueryHookResult = ReturnType<typeof useGetSettingsQuery>;
export type GetSettingsLazyQueryHookResult = ReturnType<typeof useGetSettingsLazyQuery>;
export type GetSettingsQueryResult = Apollo.QueryResult<GetSettingsQuery, GetSettingsQueryVariables>;
export const UsersDocument = gql`
    query users {
  getUsers {
    userid
    firstname
    lastname
    email
    tokenVersion
    emailConfirmed
    createdDate
    lastlogin
    role
  }
}
    `;

/**
 * __useUsersQuery__
 *
 * To run a query within a React component, call `useUsersQuery` and pass it any options that fit your needs.
 * When your component renders, `useUsersQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useUsersQuery({
 *   variables: {
 *   },
 * });
 */
export function useUsersQuery(baseOptions?: Apollo.QueryHookOptions<UsersQuery, UsersQueryVariables>) {
        return Apollo.useQuery<UsersQuery, UsersQueryVariables>(UsersDocument, baseOptions);
      }
export function useUsersLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<UsersQuery, UsersQueryVariables>) {
          return Apollo.useLazyQuery<UsersQuery, UsersQueryVariables>(UsersDocument, baseOptions);
        }
export type UsersQueryHookResult = ReturnType<typeof useUsersQuery>;
export type UsersLazyQueryHookResult = ReturnType<typeof useUsersLazyQuery>;
export type UsersQueryResult = Apollo.QueryResult<UsersQuery, UsersQueryVariables>;
export const MemberInformationDocument = gql`
    subscription memberInformation($nwid: String, $userid: ID) {
  memberInformation(nwid: $nwid, userid: $userid) {
    members {
      nodeid
      name
      identity
      online
      address
      authorized
      ipAssignments
      nwid
      peers {
        address
        latency
        role
        version
        versionMajor
        versionMinor
        versionRev
        paths {
          active
          address
          expired
          lastReceive
          lastSend
          preferred
        }
      }
    }
  }
}
    `;

/**
 * __useMemberInformationSubscription__
 *
 * To run a query within a React component, call `useMemberInformationSubscription` and pass it any options that fit your needs.
 * When your component renders, `useMemberInformationSubscription` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the subscription, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useMemberInformationSubscription({
 *   variables: {
 *      nwid: // value for 'nwid'
 *      userid: // value for 'userid'
 *   },
 * });
 */
export function useMemberInformationSubscription(baseOptions?: Apollo.SubscriptionHookOptions<MemberInformationSubscription, MemberInformationSubscriptionVariables>) {
        return Apollo.useSubscription<MemberInformationSubscription, MemberInformationSubscriptionVariables>(MemberInformationDocument, baseOptions);
      }
export type MemberInformationSubscriptionHookResult = ReturnType<typeof useMemberInformationSubscription>;
export type MemberInformationSubscriptionResult = Apollo.SubscriptionResult<MemberInformationSubscription>;