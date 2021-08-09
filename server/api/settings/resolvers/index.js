const { PrismaClient } = require('@prisma/client');
const SettingsService = new PrismaClient();

const settingsResolvers = {
  Query: {
    getSettings: async (parent, input) => {
      return await SettingsService.settings.findFirst({
        where: {
          id: 1,
        },
      });
    },
  },
  Mutation: {
    updateSettings: async (parent, config, { pubsub }) => {
      return await SettingsService.settings.update({
        where: {
          id: 1,
        },
        data: {
          ...config.data,
        },
      });
    },
  },
};

module.exports = {
  settingsResolvers,
};
