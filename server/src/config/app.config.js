import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { graphqlUploadExpress } from 'graphql-upload';
import cors from 'cors';
require('dotenv').config();

class AppConfig {
  constructor(app, express) {
    this.app = app;
    this.express = express;
  }

  includeConfig() {
    this.app.use(helmet({ contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false }));
    this.app.use(this.express.urlencoded({ extended: false }));
    this.app.use(this.express.json());
    this.app.use(cookieParser());

    this.app.use(graphqlUploadExpress({ maxFileSize: 1000000000, maxFiles: 10 }));
    // Serve Files
    this.app.use('/asset', this.express.static('asset'));

    require('../db/postgres/index.ts');

    if (process.env.NODE_ENV !== 'production') {
      this.app.use(
        cors({
          origin: ['http://localhost:3000', 'ws://localhost:4000'],
          credentials: true,
        })
      );
    }
  }
}
export default AppConfig;
