import { Suspense } from "react";
import NetworkLoadingSkeleton from "~/components/shared/networkLoadingSkeleton";
import { getNetworkById } from "~/features/network/server/actions/getNetworkById";
import NetworkActions from "~/features/network/components/NetworkActions";
import NetworkHeader from "~/features/network/components/NetworkHeader";
import NetworkMembers from "~/features/network/components/NetworkMembers";
import NetworkSettings from "~/features/network/components/NetworkSettings";
import { NetworkStoreInitializer } from "~/features/network/providers/NetworkInitilizer";
import { NetworkUpdatesListener } from "~/features/network/components/NetworkUpdatesListners";

export default async function NetworkPage({ params }: { params: { id: string } }) {
	const { id } = await params;

	const networkData = await getNetworkById({
		nwid: id,
		central: false,
	});

	return (
		<>
			<NetworkUpdatesListener networkId={id} />
			<NetworkStoreInitializer networkData={networkData} />
			<div className="animate-fadeIn">
				<Suspense fallback={<NetworkLoadingSkeleton className="w-5/6" />}>
					<NetworkHeader />
					{/* <NetworkSettings /> */}
					{/* <NetworkMembers /> */}
					{/* <NetworkActions /> */}
				</Suspense>
			</div>
		</>
	);
}
