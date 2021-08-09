const { verify } = require('jsonwebtoken');
const { createRefreshToken, createAccessToken } = require('./create.tokens');
const { sendRefreshToken } = require('./send.refresh.token');
const prisma = require('../db/postgres/prisma');

/* 
 This functions is called from the /routes directive when /refresh_token is sent to server. 
 
*/

async function validateTokensMiddleware(req, res) {
  const token = req.cookies && req.cookies.tfun;

  if (!token) {
    return res.status(400).send({ loggedIn: false, accessToken: null, message: 'not logged in' });
  }

  let payload = null;
  try {
    payload = verify(token, process.env.REFRESH_TOKEN_SECRET);
  } catch (err) {
    return res.status(400).send({ loggedIn: false, accessToken: '', message: 'token does not match!' });
  }

  // token is valid and
  // we can send back an access token
  const user = await prisma.users.findFirst({
    where: {
      userid: payload.userid,
    },
  });

  if (!user) {
    return res.status(400).send({ loggedIn: false, accessToken: '' });
  }

  // Update database with the last seen time
  await prisma.users.update({
    where: {
      userid: payload.userid,
    },
    data: {
      lastlogin: new Date(),
    },
  });

  sendRefreshToken(res, createRefreshToken(payload));

  return res.send({
    loggedIn: true,
    accessToken: createAccessToken(user),
  });
}

module.exports = { sendRefreshToken, createRefreshToken, createAccessToken, validateTokensMiddleware };
