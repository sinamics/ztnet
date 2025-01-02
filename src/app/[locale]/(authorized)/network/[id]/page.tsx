import { Suspense } from "react";
import NetworkLoadingSkeleton from "~/components/shared/networkLoadingSkeleton";
import { NetworkProvider } from "~/features/network/providers/NetworkProvider";
import { getNetworkById } from "~/features/network/server/getNetworkById";
import NetworkActions from "~/features/network/components/NetworkActions";
import NetworkHeader from "~/features/network/components/NetworkHeader";
import NetworkMembers from "~/features/network/components/NetworkMembers";
import NetworkSettings from "~/features/network/components/NetworkSettings";

export default async function NetworkPage({ params }: { params: { id: string } }) {
	const { id } = params;

	const networkData = await getNetworkById({
		nwid: id,
		central: false,
	});

	return (
		<NetworkProvider initialData={networkData}>
			<div className="animate-fadeIn">
				<Suspense fallback={<NetworkLoadingSkeleton className="w-5/6" />}>
					<NetworkHeader />
					<NetworkSettings />
					<NetworkMembers />
					<NetworkActions />
				</Suspense>
			</div>
		</NetworkProvider>
	);
}
