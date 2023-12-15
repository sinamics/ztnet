import { type GetServerSideProps, type GetServerSidePropsContext } from "next";
import { type Session } from "next-auth";
import { getSession } from "next-auth/react";
interface Props {
	auth?: Session["user"];
}

export const getServerSideProps: GetServerSideProps<Props> = async (
	context: GetServerSidePropsContext,
) => {
	const session = await getSession(context);
	if (session && "user" in session && session?.user) {
		return {
			redirect: {
				destination: "/dashboard",
				permanent: false,
			},
		};
	}

	return {
		redirect: {
			destination: "/auth/login",
			permanent: false,
		},
	};
};
// No component is needed as we redirect
export default function LandingPage() {
	return null;
}
