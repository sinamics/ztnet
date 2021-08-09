import { verify } from 'jsonwebtoken';
import { AuthenticationError } from 'apollo-server-express';
import prisma from '../../db/postgres/prisma';

export const isAuthenticated = async ({ req }) => {
  const { authorization } = req.headers;

  if (!authorization) {
    throw new AuthenticationError('No authorization token found in header!, error 1010');
  }

  try {
    const token = authorization.split(' ')[1];
    const payload = verify(token, process.env.ACCESS_TOKEN_SECRET, { clockTolerance: process.env.JWT_CLOCKDIFFRENCE_ALLOWED });
    // eslint-disable-next-line no-param-reassign
    if (!payload) throw new AuthenticationError('Token not found!, error 1020');

    const user = await prisma.users.findFirst({
      where: {
        userid: payload.userid,
      },
    });
    // This check is also used in login function auth.services
    if (!user.role.includes('ADMIN') && !user.role.includes('MODERATOR')) {
      if (
        !user.orderStatus === 'completed' ||
        user.licenseStatus === 'Expired' ||
        user.licenseStatus === 'Redeemed' ||
        new Date().getTime() > new Date(user.expirationDate).getTime()
      )
        throw new AuthenticationError('Your license has Expired or not Valid');
    }
    // if (role && !u.role.includes(role)) {
    //   throw new AuthenticationError('you do not have correct role to access this page!');
    // }

    return user;
  } catch (err) {
    console.log(err);
    throw new AuthenticationError(err);
  }
};
