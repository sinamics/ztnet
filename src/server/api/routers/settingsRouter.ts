import { createTRPCRouter, protectedProcedure, publicProcedure } from "~/server/api/trpc";
import { SMTP_SECRET, decrypt, generateInstanceSecret } from "~/utils/encryption";

export const settingsRouter = createTRPCRouter({
	registrationAllowed: publicProcedure.query(async ({ ctx }) => {
		return await ctx.prisma.globalOptions.findFirst({
			where: {
				id: 1,
			},
			select: {
				enableRegistration: true,
			},
		});
	}),

	// Set global options
	getAllOptions: protectedProcedure.query(async ({ ctx }) => {
		const options = await ctx.prisma.globalOptions.findFirst({
			where: {
				id: 1,
			},
		});
		if (options?.smtpPassword) {
			options.smtpPassword = decrypt(
				options.smtpPassword,
				generateInstanceSecret(SMTP_SECRET),
			);
		}
		return options;
	}),
});
