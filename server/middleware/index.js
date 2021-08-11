import { typeDefs } from '../db/graphQL/rootDef';
import { resolvers } from '../db/graphQL/rootResolvers';
import { ApolloServer } from 'apollo-server-express';
import { AuthDirective } from '../db/graphQL/authDirective';
import pubsub from './pubsub';

class MiddleWare {
  constructor(app, http) {
    this.app = app;
    this.http = http;
  }
  load() {
    const server = new ApolloServer({
      typeDefs,
      resolvers,
      uploads: false,
      context: async ({ req, res }) => ({ req, res, pubsub }),
      schemaDirectives: {
        hasRole: AuthDirective,
      },
      subscriptions: {
        path: '/subscription',
      },
      playground: {
        settings: {
          'request.credentials': 'include',
        },
      },
    });

    const { app } = this;

    server.applyMiddleware({ app, cors: false });
    server.installSubscriptionHandlers(this.http);
  }
}

export default MiddleWare;
