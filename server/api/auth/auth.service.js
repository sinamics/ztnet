/* eslint-disable no-underscore-dangle */
/* eslint-disable no-throw-literal */
const { AuthenticationError } = require('apollo-server-express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { badNames, nameLength } = require('../../_helpers/name-validation');
const ForgotPassword = require('../../mail/forgotPassword/forgot.service');
const { createAccessToken, createRefreshToken, sendRefreshToken } = require('../../jwt/validate.token');
const AuthService = require('../../db/postgres/prisma');
const ztn = require('../_utils/zt_api');
const Ip4 = require('../_utils/ipGenerator');

const mediumPassword = new RegExp('^(((?=.*[a-z])(?=.*[A-Z]))|((?=.*[a-z])(?=.*[0-9]))|((?=.*[A-Z])(?=.*[0-9])))(?=.{6,})');

const validEmail = new RegExp(
  /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
);

const SendForgotPasswordEmail = new ForgotPassword();

module.exports = {
  register,
  login,
  forgot,
  FirstLoginChangePassword,
  changePassword,
  // sendMailValidationLink,
  // ValidateMailLink,
};

async function register(userParam) {
  if (!userParam) return;

  const settings = await AuthService.settings.findFirst({
    where: {
      id: 1,
    },
  });

  if (!settings.enableRegistration) throw new AuthenticationError(`Registration has been disabled!`);
  // Trim all values for trailing white space
  Object.keys(userParam).map((k) => (userParam[k] = typeof userParam[k] == 'string' ? userParam[k].trim() : userParam[k]));

  // Fist Name validation
  if (!userParam.firstname) return new Error(`Name Required!`);
  if (userParam.firstname) {
    if (badNames(userParam.firstname)) return new Error(`Name not supported!`);

    if (nameLength(userParam.firstname, 30)) return new Error(`Max 30 char in firstname`);
  }

  // Last Name validation
  if (!userParam.lastname) return new Error(`Lastname required!`);
  if (userParam.lastname) {
    if (badNames(userParam.lastname)) return new Error(`Lastname not supported!`);

    if (nameLength(userParam.lastname, 30)) return new Error(`Max 30 char in lastname`);
  }
  // Email validation
  if (!userParam.email) return new Error(`Email required!`);
  if (!validEmail.test(userParam.email)) return new Error(`Email not supported!`);

  // Fecth from database
  // const user = await client.query(`SELECT * FROM users WHERE email = $1 FETCH FIRST ROW ONLY`, [userParam.email]);

  const registerUser = await AuthService.users.findFirst({
    where: {
      email: userParam.email,
    },
  });
  // validate
  if (registerUser) {
    // eslint-disable-next-line no-throw-literal
    throw new AuthenticationError(`email "${userParam.email}" already taken`);
  }

  // hash password
  if (userParam.password) {
    if (!mediumPassword.test(userParam.password)) throw new AuthenticationError(`Password does not meet the requirements!`);
  }

  const hash = bcrypt.hashSync(userParam.password, 10);

  // Send validation link to user by mail
  // sendMailValidationLink(userParam);

  // store the created User in db
  delete userParam.password;

  const newuser = await AuthService.users.create({
    data: {
      ...userParam,
      lastlogin: new Date(),
      hash,
      role: settings.firstUserRegistration ? 'ADMIN' : 'USER',
    },
  });

  // Update settings for first user (ADMIN)
  if (settings.firstUserRegistration) {
    await AuthService.settings.update({
      where: {
        id: 1,
      },
      data: {
        firstUserRegistration: false,
      },
    });
  }

  // Generate ipv4 address, cidr, start & end
  const ipAssignmentPools = Ip4.randomIPv4();
  const networkName = process.env.ZT_DEFAULT_NETWORKNAME;
  // Create ZT network
  await ztn.network_create(networkName, ipAssignmentPools).then(async (newNw) => {
    // store the created User in db
    return await AuthService.users.update({
      where: {
        userid: newuser.userid,
      },
      data: {
        network: {
          create: {
            nwname: newNw.name,
            nwid: newNw.nwid,
          },
        },
      },
      select: {
        network: true,
      },
    });
  });
}

// eslint-disable-next-line consistent-return
async function login({ email, password }, { res }) {
  const loginUser = await AuthService.users.findFirst({
    where: {
      email: email,
    },
  });

  if (!loginUser) throw new AuthenticationError('email or password is wrong!');
  // This check is also used in token validation /middleware/auth/user.is.auth...
  if (!loginUser.role.includes('ADMIN') && !loginUser.role.includes('MODERATOR')) {
    if (
      !loginUser.orderStatus === 'completed' ||
      loginUser.licenseStatus === 'Expired' ||
      loginUser.licenseStatus === 'Redeemed' ||
      new Date().getTime() > new Date(loginUser.expirationDate).getTime()
    )
      throw new AuthenticationError('Your license has Expired or not Valid');
  }

  const valid = bcrypt.compareSync(password, loginUser.hash);
  if (!valid) throw new AuthenticationError('email or password is wrong!');

  // TODO add mail validation
  // if (!user.emailConfirmed) return { error: { mailNotValidated: true, email: email, userId: user._id } };

  // Send refresh token as cookie header
  sendRefreshToken(res, createRefreshToken(loginUser));

  // Send accessToken back to user. This will be stored in-memory
  return {
    accessToken: createAccessToken(loginUser),
    user: {
      ...loginUser,
    },
  };
}

/**
 * @param  {Object} data user object
 * This function is called by the registration function and re-send activation link API.
 */
// async function sendMailValidationLink(data) {
//   // eslint-disable-next-line no-throw-literal

//   const user = await User.findById(data._id);
//   if (!user || !user.hash) throw `User not found!`;

//   const validationToken = jwt.sign(
//     {
//       id: user._id,
//     },
//     user.hash,
//     {
//       expiresIn: '15m',
//     }
//   );
// const weblink = `${process.env.EMAIL_ACTIVATIONLINK}/${validationToken}`;

//   return SendMail.NewUserRegistrationLink({ ...user._doc, weblink });
// }

/**
 * @param  {String} token
 * This function is validating the token sent to use uppon registration. Token has 15min expire time.
 */

async function forgot({ email }) {
  const user = await AuthService.users.findFirst({
    where: {
      email,
    },
  });
  if (!user) throw new AuthenticationError('Mail sent if email exist!');

  const { licenseStatus } = user;
  if (licenseStatus.toLowerCase() === 'expired') throw new AuthenticationError('License expired!');

  const validationToken = jwt.sign(
    {
      userid: user.userid,
      email: user.email,
    },
    user.hash,
    {
      expiresIn: '15m',
    }
  );
  const weblink = `${process.env.EMAIL_RESETPASSWORDLINK}/${validationToken}`;
  return SendForgotPasswordEmail.ForgotPasswordLink({ ...user, weblink });
}

async function changePassword({ password, newPassword, token }) {
  if (!token) throw new AuthenticationError(`Token invalid!`);

  if (password !== newPassword) throw new AuthenticationError(`Passwords does not match!`);
  try {
    const { userid } = jwt.decode(token);

    if (!userid) throw new AuthenticationError(`This link is not valid!`);

    const user = await AuthService.users.findFirst({
      where: {
        userid,
      },
    });

    if (!user || !user.hash) throw new AuthenticationError(`Something went wrong!`);

    jwt.verify(token, user.hash);

    // hash password
    if (newPassword) {
      if (!mediumPassword.test(newPassword)) return new Error(`Password does not meet the requirements!`);

      return await AuthService.users.update({
        where: {
          userid,
        },
        data: {
          hash: bcrypt.hashSync(password, 10),
        },
      });
    }
  } catch (error) {
    throw new AuthenticationError(`token is not valid, please try again!`);
  }
}

async function FirstLoginChangePassword({ password, newPassword }, user) {
  const { userid, firstTime } = user;
  if (!firstTime) throw new AuthenticationError(`You have already changed your password!`);
  if (password !== newPassword) throw new AuthenticationError(`Passwords does not match!`);
  try {
    if (!userid) throw new AuthenticationError(`This link is not valid!`);
    const user = await AuthService.users.findFirst({
      where: {
        userid,
      },
    });
    if (!user || !user.hash) throw new AuthenticationError(`Something went wrong!`);

    // hash password
    if (password) {
      if (!mediumPassword.test(password)) return new Error(`Password does not meet the requirements!`);
    }
    // Valid Password, lets hash it
    return await AuthService.users.update({
      where: {
        userid,
      },
      data: {
        hash: bcrypt.hashSync(password, 10),
        firstTime: false,
      },
    });
  } catch (error) {
    throw new AuthenticationError(error);
  }
}
