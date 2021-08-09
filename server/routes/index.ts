/* eslint-disable global-require */
import { validateTokensMiddleware } from '../jwt/validate.token';
import { sendLogoutToken } from '../jwt/send.logout.token';

class Routes {
  app: any;
  io: any;
  constructor(app: any, io: any) {
    this.app = app;
    this.io = io;
  }

  /* creating app Routes starts */
  appRoutes() {
    // api routes
    this.app.post('/refresh_token', validateTokensMiddleware);

    // post API (for generate new users remote)
    this.app.use('/controller', require('../api/network/postApi'));

    //Logout
    this.app.post('/logout', (_: any, res: { send: (arg0: { loggedIn: boolean; accessToken: any }) => any }) => {
      sendLogoutToken(res);
      return res.send({ loggedIn: false, accessToken: null });
    });
  }

  routesConfig() {
    this.appRoutes();
  }
}
export default Routes;
