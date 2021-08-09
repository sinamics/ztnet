const Email = require('../index');
const path = require('path');
const { isPropertyAccessChain } = require('typescript');

class Forgot extends Email {
  ForgotPasswordLink(user) {
    return this.mail
      .send({
        template: path.join(__dirname, 'templates'),
        message: {
          to: user.email,
        },
        locals: {
          ...user,
          email_support: process.env.EMAIL_SUPPORT,
          sitename: process.env.SITE_NAME,
        },
      })
      .then((res) => {
        console.log(res);
      })
      .catch((err) => {
        console.log(err);
      });
  }
}
module.exports = Forgot;
