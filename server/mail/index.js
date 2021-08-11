const MailEngine = require('email-templates');
// const isDev = process.env.NODE_ENV !== 'production';

class Email {
  constructor() {
    this.mail = new MailEngine({
      message: {
        from: process.env.EMAIL_USER,
      },
      // uncomment below to send emails in development/test env:
      // send: !!isDev,
      transport: {
        // jsonTransport: true,
        secure: true,
        host: 'send.one.com',
        port: '465',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD,
        },
        tls: {
          maxVersion: 'TLSv1.3',
          minVersion: 'TLSv1.2',
          // secureProtocol: 'TLSv1_method',
        },
      },
    });
  }
}
module.exports = Email;
