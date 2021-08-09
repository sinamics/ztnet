const sendRefreshToken = (res, token) => {
  res.cookie('tfun', token, {
    maxAge: 1000 * 60 * 60 * 24 * 50, // 50 days in milliseconds
    httpOnly: true,
    sameSite: true,
    secure: process.env.NODE_ENV !== 'production' ? false : true, //on HTTPS
    // domain: "localhost:3000/", //set your domain
    path: '/refresh_token',
  });
};

module.exports = { sendRefreshToken };
