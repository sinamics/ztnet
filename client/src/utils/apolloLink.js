import { ApolloClient, InMemoryCache } from '@apollo/client';
import { onError } from 'apollo-link-error';
import { ApolloLink, Observable } from 'apollo-link';
import { TokenRefreshLink } from 'apollo-link-token-refresh';
import jwtDecode from 'jwt-decode';
import config from 'config';
import { getAccessToken, setAccessToken } from './accessToken';
import { createUploadLink } from 'apollo-upload-client';

const cache = new InMemoryCache({
  // addTypename: false,
  typePolicies: {
    Users: {
      keyFields: ['userid'],
    },
    Network: {
      // uniquely identifying id.
      keyFields: ['nwid'],
    },
    Member: {
      // uniquely identifying id.
      keyFields: ['nodeid'],
    },
    Query: {
      fields: {
        me: {
          merge(existing = [], incoming) {
            return { ...existing, ...incoming };
          },
        },
      },
    },
  },
});

const uploadLink = createUploadLink({
  uri: `${config.apiUrl}/graphQl`,
  credentials: 'include', // include  /  same-origin
});

const requestLink = new ApolloLink(
  (operation, forward) =>
    new Observable((observer) => {
      let handle;
      Promise.resolve(operation)
        .then((op) => {
          const accessToken = getAccessToken();
          if (accessToken) {
            op.setContext({
              headers: {
                authorization: `bearer ${accessToken}`,
              },
            });
          }
        })
        .then(() => {
          handle = forward(operation).subscribe({
            next: observer.next.bind(observer),
            error: observer.error.bind(observer),
            complete: observer.complete.bind(observer),
          });
        })
        .catch(observer.error.bind(observer));

      return () => {
        if (handle) handle.unsubscribe();
      };
    })
);

const TokenRefresh = new TokenRefreshLink({
  accessTokenField: 'accessToken',
  isTokenValidOrUndefined: () => {
    const token = getAccessToken();
    if (!token) {
      return true;
    }

    try {
      const { exp } = jwtDecode(token);
      if (Date.now().valueOf() >= exp * 1000) {
        return false;
      } else {
        return true;
      }
    } catch {
      return false;
    }
  },
  fetchAccessToken: () => {
    return fetch(`${config.apiUrl}/refresh_token`, {
      method: 'POST',
      credentials: 'include', // include  /  same-origin
    });
    // return getNewToken();
  },
  handleFetch: (accessToken) => {
    setAccessToken(accessToken);
  },
  handleError: (err) => {
    console.warn('Your refresh token is invalid. Try to relogin');
    console.error(err);
  },
});

// The split function takes three parameters:
//
// * A function that's called for each operation to execute
// * The Link to use for an operation if the function returns a "truthy" value
// * The Link to use for an operation if the function returns a "falsy" value
// const splitLink = split(
//   ({ query }) => {
//     const definition = getMainDefinition(query);
//     return definition.kind === 'OperationDefinition' && definition.operation === 'subscription';
//   },
//   wsLink,
//   uploadLink
// );

export const client = new ApolloClient({
  link: ApolloLink.from([
    TokenRefresh,
    onError(({ graphQLErrors, networkError }) => {
      console.log(graphQLErrors);
      console.log(networkError);
    }),
    requestLink,
    // subscribeLink,
    uploadLink,
  ]),
  request: async (operation) => {
    operation.setContext({
      fetchOptions: {
        credentials: 'include',
      },
    });
  },
  cache,
});
