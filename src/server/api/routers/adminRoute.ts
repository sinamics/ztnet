/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { createTRPCRouter, adminRoleProtectedRoute } from "~/server/api/trpc";
import { z } from "zod";
import * as ztController from "~/utils/ztApi";
import nodemailer from "nodemailer";
import ejs from "ejs";
import { inviteUserTemplate } from "~/utils/mailTemplates";
import { throwError } from "~/server/helpers/errorHandler";

export const adminRouter = createTRPCRouter({
  getUsers: adminRoleProtectedRoute.query(async ({ ctx }) => {
    const users = await ctx.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        emailVerified: true,
        lastLogin: true,
        lastseen: true,
        online: true,
        role: true,
        _count: {
          select: {
            network: true,
          },
        },
        // network: {
        //   select: {
        //     nwid: true,
        //     nwname: true,
        //   },
        // },
      },
    });
    return users;
  }),

  getControllerStats: adminRoleProtectedRoute.query(async () => {
    const networks = await ztController.get_controller_networks();

    const networkCount = networks.length;
    let totalMembers = 0;
    for (const network of networks) {
      const members = await ztController.network_members(network);
      totalMembers += Object.keys(members).length;
    }

    const controllerStatus = await ztController.get_controller_status();
    return {
      networkCount,
      totalMembers,
      controllerStatus,
    };
  }),

  // Set global options
  getAllOptions: adminRoleProtectedRoute.query(async ({ ctx }) => {
    return await ctx.prisma.globalOptions.findFirst({
      where: {
        id: 1,
      },
    });
  }),
  registration: adminRoleProtectedRoute
    .input(
      z.object({
        enableRegistration: z.boolean().optional(),
        firstUserRegistration: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.prisma.globalOptions.update({
        where: {
          id: 1,
        },
        data: {
          ...input,
        },
      });
    }),
  getMailTemplates: adminRoleProtectedRoute.query(async ({ ctx }) => {
    return await ctx.prisma.globalOptions.findFirst({
      where: {
        id: 1,
      },
    });
  }),

  setMail: adminRoleProtectedRoute
    .input(
      z.object({
        smtpHost: z.string().optional(),
        smtpPort: z.string().optional(),
        smtpSecure: z.boolean().optional(),
        smtpEmail: z.string().optional(),
        smtpPassword: z.string().optional(),
        smtpUsername: z.string().optional(),
        smtpUseSSL: z.boolean().optional(),
        smtpIgnoreTLS: z.boolean().optional(),
        smtpRequireTLS: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.prisma.globalOptions.update({
        where: {
          id: 1,
        },
        data: {
          ...input,
        },
      });
    }),
  setMailTemplates: adminRoleProtectedRoute
    .input(
      z.object({
        template: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const templateObj = JSON.parse(input.template);

      return await ctx.prisma.globalOptions.update({
        where: {
          id: 1,
        },
        data: {
          inviteUserTemplate: templateObj,
        },
      });
    }),
  getDefaultMailTemplate: adminRoleProtectedRoute
    .input(
      z.object({
        template: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      switch (input.template) {
        case "inviteUserTemplate":
          return inviteUserTemplate();
          break;

        default:
          break;
      }
    }),
  sendTestMail: adminRoleProtectedRoute
    .input(
      z.object({
        template: z.string(),
      })
    )
    .mutation(async ({ ctx }) => {
      const globalOptions = await ctx.prisma.globalOptions.findFirst({
        where: {
          id: 1,
        },
      });

      const renderedTemplate = await ejs.render(
        JSON.stringify(globalOptions.inviteUserTemplate),
        {
          toEmail: "toEmail@example.com",
          fromName: ctx.session.user.name, // assuming locals contains a 'username'
          nwid: "123456789", // assuming locals contains a 'username'
        },
        { async: true }
      );

      const parsedTemplate = JSON.parse(renderedTemplate as string);
      try {
        // configure transport settings
        const transporter = nodemailer.createTransport({
          host: globalOptions.smtpHost,
          port: globalOptions.smtpPort,
          secure: globalOptions.smtpSecure,
          auth: {
            user: globalOptions.smtpEmail,
            pass: globalOptions.smtpPassword,
          },
          tls: {
            rejectUnauthorized: false,
          },
        });

        // send test mail to user
        const info = await transporter.sendMail({
          from: globalOptions.smtpEmail,
          to: ctx.session.user.email,
          subject: parsedTemplate.inviteUserSubject,
          html: parsedTemplate.inviteUserBody,
        });
        // Check if email was accepted
        if (!info.accepted.includes(ctx.session.user.email)) {
          throwError("Test email could not be sent!, check your credentials");
        }
      } catch (error) {
        throwError(error);
      }
    }),
});
