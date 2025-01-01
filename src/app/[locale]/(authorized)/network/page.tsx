import { Suspense } from "react";
import MetaTags from "~/components/shared/metaTags";
import NetworkLoadingSkeleton from "~/components/shared/networkLoadingSkeleton";
import { getAllOptions } from "~/features/settings/server/actions/settings";
import { getUserNetworks } from "~/features/networks/server/actions/getUserNetworks";
import AddNetwork from "~/features/networks/components/AddNetwork";
import NetworksList from "~/features/networks/components/NetworksList";
import UnlinkedNetworksAlert from "~/features/networks/components/UnlinkedNetworksAlert";
import { getUnlinkedNetworks } from "~/features/networks/server/actions/getUnlinkedNetworks";
import PageTitle from "~/features/networks/components/PageTitle";

const UserNetworksList = async () => {
	const globalOptions = await getAllOptions();
	const unlinkedNetworks = await getUnlinkedNetworks({ getDetails: false });
	const userNetworks = await getUserNetworks({ central: false });

	const title = `${globalOptions?.siteName} - Local Controller`;

	return (
		<div className="animate-fadeIn">
			<MetaTags title={title} />
			<PageTitle />
			<div className="grid grid-cols-1 space-y-3 px-3 pt-5 md:grid-cols-[1fr,1fr,1fr] md:space-y-0 md:px-11">
				{/* Show unlinked networks alert for admins */}
				{unlinkedNetworks && unlinkedNetworks.length > 0 && (
					<UnlinkedNetworksAlert count={unlinkedNetworks.length} />
				)}

				{/* Network actions (create new network button) */}
				<Suspense fallback={<NetworkLoadingSkeleton />}>
					<AddNetwork />
				</Suspense>

				{/* Networks list */}
				<div className="col-span-2">
					<NetworksList
						networks={userNetworks}
						showEmptyState={userNetworks.length === 0}
					/>
				</div>
			</div>
		</div>
	);
};
export default UserNetworksList;
