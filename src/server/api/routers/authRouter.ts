import { z } from "zod";
import bcrypt from "bcryptjs";
import {
  createTRPCRouter,
  publicProcedure,
  //   protectedProcedure,
} from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";

const mediumPassword = new RegExp(
  "^(((?=.*[a-z])(?=.*[A-Z]))|((?=.*[a-z])(?=.*[0-9]))|((?=.*[A-Z])(?=.*[0-9])))(?=.{6,})"
);

export const authRouter = createTRPCRouter({
  // login: publicProcedure
  //   .input(z.object({ email: z.string(), password: z.string() }))
  //   .mutation(async ({ ctx, input }) => {
  //     if (!input.email || !input.password)
  //       throw new TRPCError({
  //         code: "NOT_FOUND",
  //         message: "Email or Password cannot be empty!",
  //       });

  //     const { email, password } = input;

  //     if (!z.string().nonempty().parse(email)) {
  //       throw new TRPCError({
  //         code: "NOT_FOUND",
  //         message: "Email cannot be empty!",
  //         // optional: pass the original error to retain stack trace
  //         // cause: theError,
  //       });
  //     }

  //     if (!z.string().nonempty().parse(password)) {
  //       throw new TRPCError({
  //         code: "NOT_FOUND",
  //         message: "Password cannot be empty!",
  //         // optional: pass the original error to retain stack trace
  //         // cause: theError,
  //       });
  //     }
  //     const user = await ctx.prisma.user.findFirst({
  //       where: {
  //         email,
  //       },
  //       include: {
  //         sessions: true,
  //       },
  //     });

  //     if (!user || !user?.hash)
  //       //  return a next auth error message to the client
  //       return new Error(`User does not exist!`);
  //     // throw new TRPCError({
  //     //   code: "NOT_FOUND",
  //     //   message: "User does not exist!",
  //     //   // optional: pass the original error to retain stack trace
  //     //   // cause: theError,
  //     // });

  //     const valid = bcrypt.compareSync(password, user?.hash);
  //     if (!valid)
  //       throw new TRPCError({
  //         code: "UNAUTHORIZED",
  //         message: "Username or Password is wrong!",
  //         // optional: pass the original error to retain stack trace
  //         // cause: theError,
  //       });

  //     return {
  //       user: input,
  //     };
  //   }),
  register: publicProcedure
    .input(
      z.object({
        email: z
          .string()
          .nonempty()
          .email()
          .transform((val) => val.trim()),
        password: z.string().nonempty().max(40),
        name: z.string().nonempty().max(40),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { email, password, name } = input;

      // Email validation
      if (!email) return new Error(`Email required!`);
      if (!z.string().nonempty().parse(email))
        return new Error(`Email not supported!`);

      // Fecth from database
      // const user = await client.query(`SELECT * FROM users WHERE email = $1 FETCH FIRST ROW ONLY`, [email]);
      const registerUser = await ctx.prisma.user.findFirst({
        where: {
          email: email,
        },
      });
      // validate
      if (registerUser) {
        // eslint-disable-next-line no-throw-literal
        // throw new AuthenticationError(`email "${email}" already taken`);
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `email "${email}" already taken`,
          // optional: pass the original error to retain stack trace
          // cause: theError,
        });
      }

      // hash password
      if (password) {
        if (!mediumPassword.test(password))
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Password does not meet the requirements!`,
            // optional: pass the original error to retain stack trace
            // cause: theError,
          });
      }

      const hash = bcrypt.hashSync(password, 10);

      // Send validation link to user by mail
      // sendMailValidationLink(i);

      // store the created User in db
      // delete input.password;

      const newUser = await ctx.prisma.user.create({
        data: {
          name,
          email,
          lastLogin: new Date(),
          role: "USER",
          hash,
        },
      });
      return {
        user: newUser,
      };
      // Update settings for first user (ADMIN)
      // if (settings.firstUserRegistration) {
      //   await AuthService.settings.update({
      //     where: {
      //       id: 1,
      //     },
      //     data: {
      //       firstUserRegistration: false,
      //     },
      //   });
      // }

      // Generate ipv4 address, cidr, start & end
      // const ipAssignmentPools = Ip4.randomIPv4();
      // const networkName = process.env.ZT_DEFAULT_NETWORKNAME;
      // // Create ZT network
      // await ztn
      //   .network_create(networkName, ipAssignmentPools)
      //   .then(async (newNw) => {
      //     // store the created User in db
      //     return await AuthService.users.update({
      //       where: {
      //         userid: newuser.userid,
      //       },
      //       data: {
      //         network: {
      //           create: {
      //             nwname: newNw.name,
      //             nwid: newNw.nwid,
      //           },
      //         },
      //       },
      //       select: {
      //         network: true,
      //       },
      //     });
      //   });
    }),
});
