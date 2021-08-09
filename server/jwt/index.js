const expressJwt = require('express-jwt');
const userService = require('../api/users/user.service');

function jwt() {
  const secret = process.env.ACCESS_TOKEN_SECRET;

  return expressJwt({ secret, isRevoked }).unless({
    path: [
      // public routes that don't require authentication
      '/api/auth/authenticate',
      '/api/auth/register',
    ],
  });
}

async function isRevoked(req, payload, done) {
  const user = await userService.getById(payload.sub);

  // revoke token if user no longer exists
  if (!user) {
    return done(null, true);
  }

  return done();
}

module.exports = jwt;
