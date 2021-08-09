const authService = require('../auth.service');
const { isAuthenticated } = require('../../../middleware/authorization/user.is.authenticated');

const authResolvers = {
  Query: {
    me: async (parent, args, context) => {
      return await isAuthenticated(context);
    },
    // This function is called by AdminRoute to check if user has correct privelges for accessing admin pages
    admin: async (parent, args, context) => {
      return isAuthenticated(context);
    },
    token: async (parent, args, { req }) => {
      const { authorization } = req.headers;

      return authorization;
    },
  },
  Mutation: {
    login: async (parent, args, context) => {
      return authService.login(args, context);
    },
    register: async (parent, args, context) => {
      const newUser = await authService.register(args, context);
      return {
        user: {
          ...newUser,
        },
      };
    },
    // validateEmail: async (parent, args, context) => {
    //   return authService.ValidateMailLink(args);
    // },
    changePassword: async (parent, args) => {
      return authService.changePassword({ ...args });
    },
    forgot: async (_, args) => {
      return authService.forgot(args);
    },
    firstTimeLoginChangePassword: async (parent, args, context) => {
      const authUser = await isAuthenticated(context);
      return authService.FirstLoginChangePassword(args, authUser);
    },
  },
};

module.exports = {
  authResolvers,
};
