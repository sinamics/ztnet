import { GetServerSideProps } from "next";
import { getSession } from "next-auth/react";

export function withAuth(gssp: GetServerSideProps): GetServerSideProps {
	return async (context) => {
		const { user } = (await getSession(context)) || {};

		if (!user) {
			return {
				redirect: { statusCode: 302, destination: "/auth/login" },
			};
		}
		// ssp (server side props)
		const gsspData = await gssp(context);

		if (!("props" in gsspData)) {
			throw new Error("invalid getSSP result");
		}

		return {
			props: {
				...gsspData.props,
				user,
			},
		};
	};
}
