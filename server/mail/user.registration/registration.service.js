const Email = require('../index');
const path = require('path');

class MailRegistration extends Email {
  NewUserRegistrationLink(user) {
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
        // console.log(res);
      })
      .catch((err) => {
        console.log(err);
      });
  }
}
module.exports = MailRegistration;
