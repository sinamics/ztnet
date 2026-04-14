import { getServerAuthSession } from "~/lib/authSession";
import { withAuth } from "~/components/auth/withAuth";
import { prisma } from "./db";
import { GetServerSidePropsContext } from "next";

export const getServerSideProps = withAuth(async (context: GetServerSidePropsContext) => {
	const session = await getServerAuthSession({
		req: context.req,
		res: context.res,
	});
	const orgIds = await prisma.organization.findMany({
		where: {
			users: {
				some: {
					id: session.user.id,
				},
			},
		},
		select: {
			id: true,
		},
	});
	return {
		props: {
			orgIds,
			session,
			messages: (await import(`~/locales/${context.locale}/common.json`)).default,
		},
	};
});
