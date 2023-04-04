import { z } from "zod";
import bcrypt from "bcryptjs";
import {
  createTRPCRouter,
  publicProcedure,
  //   protectedProcedure,
} from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";

// This regular expression (regex) is used to validate a password based on the following criteria:
// - The password must be at least 6 characters long.
// - The password must contain at least two of the following three character types:
//  - Lowercase letters (a-z)
//  - Uppercase letters (A-Z)
//  - Digits (0-9)
const mediumPassword = new RegExp(
  "^(((?=.*[a-z])(?=.*[A-Z]))|((?=.*[a-z])(?=.*[0-9]))|((?=.*[A-Z])(?=.*[0-9])))(?=.{6,})"
);

// create a zod password schema
const passwordSchema = z
  .string()
  .nonempty()
  .max(40)
  .refine((val) => {
    if (!mediumPassword.test(val)) {
      throw new Error(`Password does not meet the requirements!`);
    }
    return true;
  });

export const authRouter = createTRPCRouter({
  register: publicProcedure
    .input(
      z.object({
        email: z
          .string()
          .nonempty()
          .email()
          .transform((val) => val.trim()),
        password: passwordSchema,
        name: z.string().nonempty().max(40),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { email, password, name } = input;
      const settings = await ctx.prisma.globalOptions.findFirst({
        where: {
          id: 1,
        },
      });

      // check if enableRegistration is true
      if (!settings.enableRegistration) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Registration is disabled!`,
        });
      }

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

      // Check the total number of users in the database
      const userCount = await ctx.prisma.user.count();

      // create new user
      const newUser = await ctx.prisma.user.create({
        data: {
          name,
          email,
          lastLogin: new Date(),
          role: userCount === 0 ? "ADMIN" : "USER",
          hash,
        },
      });

      return {
        user: newUser,
      };

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
