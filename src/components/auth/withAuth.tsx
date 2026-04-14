import { GetServerSideProps } from "next";
import { getServerAuthSession } from "~/lib/authSession";

export function withAuth(gssp: GetServerSideProps): GetServerSideProps {
	return async (context) => {
		const session = await getServerAuthSession({
			req: context.req,
			res: context.res,
		});
		const user = session?.user;

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
