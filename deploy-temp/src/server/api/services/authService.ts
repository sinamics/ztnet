import jwt from "jsonwebtoken";
import { type User } from "@prisma/client";
import { prisma } from "~/server/db";
import { throwError } from "~/server/helpers/errorHandler";
import { PASSWORD_RESET_SECRET, generateInstanceSecret } from "~/utils/encryption";

/**
 * @param  {Object} data user object
 */
export const sendMailValidationLink = (user: User) => {
	// eslint-disable-next-line no-throw-literal

	if (!user) throw "User not found!";
	const secret = generateInstanceSecret(PASSWORD_RESET_SECRET);
	const validationToken = jwt.sign(
		{
			id: user.id,
		},
		secret,
		{
			expiresIn: "15m",
		},
	);
	const weblink = `${process.env.NEXTAUTH_URL}/${validationToken}`;
	return weblink;
	// return UserRegistrationMail.NewUserRegistrationLink({
	//   ...registerUser,
	//   weblink,
	// });
};

interface Ivalidate {
	token: string;
}
interface IJwt {
	id: string;
	token: string;
}
/**
 * @param  {String} token
 * This function is validating the token sent to use uppon registration. Token has 15min expire time.
 */
export const ValidateMailLink = async (validate: Ivalidate) => {
	if (!validate.token) throw "Key not found!";

	try {
		const { id, token } = jwt.decode(validate.token) as IJwt;
		if (!id) throw new Error("Invalid Token!");

		const loginUser = await prisma.user.findFirst({
			where: {
				id,
			},
		});

		if (!loginUser) throwError("User not found!");

		if (loginUser.emailVerified) throw "Du har allerede validert denne eposten.";

		const secret = generateInstanceSecret(PASSWORD_RESET_SECRET);

		jwt.verify(token, secret);
		Object.assign(loginUser, { emailConfirmed: true });

		return await prisma.user.update({
			where: {
				id,
			},
			data: {
				emailVerified: new Date(),
			},
		});
	} catch (error) {
		console.error(error);
		throw new Error("An error occured!, please send new verification email!");
	}
};
