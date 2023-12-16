import { getSession } from "next-auth/react";
import { withAuth } from "~/components/auth/withAuth";
import { prisma } from "./db";
import { GetServerSidePropsContext } from "next";

export const getServerSideProps = withAuth(async (context: GetServerSidePropsContext) => {
	const session = await getSession(context);
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
