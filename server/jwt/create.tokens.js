const { sign } = require('jsonwebtoken');

const createAccessToken = (user) =>
  sign({ userid: user.userid, firstname: user.firstname, lastname: user.lastname }, process.env.ACCESS_TOKEN_SECRET, {
    algorithm: 'HS256',
    expiresIn: process.env.ACCESS_TOKEN_LIFE,
  });

const createRefreshToken = (user) => {
  return sign({ userid: user.userid, tokenVersion: user.tokenVersion }, process.env.REFRESH_TOKEN_SECRET, {
    algorithm: 'HS256',
    expiresIn: process.env.REFRESH_TOKEN_LIFE,
  });
};

module.exports = {
  createAccessToken,
  createRefreshToken,
};
