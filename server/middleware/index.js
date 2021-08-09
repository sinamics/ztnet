import { typeDefs } from '../db/graphQL/rootDef';
import { resolvers } from '../db/graphQL/rootResolvers';
import { ApolloServer } from 'apollo-server-express';
import { AuthDirective } from '../db/graphQL/authDirective';
import fs from 'fs';
// const pubsub from './pubsub'

//.unless({ path: ['/token'] });
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
      context: async ({ req, res }) => ({ req, res }),
      schemaDirectives: {
        hasRole: AuthDirective,
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
