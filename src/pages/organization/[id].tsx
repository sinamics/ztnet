import { useRouter } from "next/router";
import { type ReactElement } from "react";
import { LayoutAuthenticated } from "~/components/layouts/layout";
import { api } from "~/utils/api";
import { GetServerSidePropsContext } from "next/types";
import { withAuth } from "~/components/auth/withAuth";
import { getSession } from "next-auth/react";

const OrganizationById = () => {
	const query = useRouter().query;
	const orgId = query.id as string;
	const { data: orgData } = api.org.getOrgById.useQuery({
		orgId,
	});

	return <div>Organization by id Name: {orgData?.orgName}</div>;
};

OrganizationById.getLayout = function getLayout(page: ReactElement) {
	return <LayoutAuthenticated>{page}</LayoutAuthenticated>;
};

export const getServerSideProps = withAuth(async (context: GetServerSidePropsContext) => {
	const session = await getSession(context);
	return {
		props: {
			session,
			// You can get the messages from anywhere you like. The recommended
			// pattern is to put them in JSON files separated by locale and read
			// the desired one based on the `locale` received from Next.js.
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
			messages: (await import(`../../locales/${context.locale}/common.json`)).default,
		},
	};
});
export default OrganizationById;
