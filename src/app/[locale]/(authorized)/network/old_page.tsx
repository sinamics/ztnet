"use client";
// import { type ReactElement } from "react";
// import { LayoutAuthenticated } from "~/components/layouts/layout";
import { api } from "~/utils/api";
import { useTranslations } from "next-intl";
import useOrganizationWebsocket from "~/hooks/useOrganizationWebsocket";
import NetworkLoadingSkeleton from "~/components/shared/networkLoadingSkeleton";
import MetaTags from "~/components/shared/metaTags";
import {
	useTrpcApiErrorHandler,
	useTrpcApiSuccessHandler,
} from "~/hooks/useTrpcApiHandler";
import Link from "next/link";
import { User } from "@prisma/client";
import { UserNetworksTable } from "~/features/networks/components/UserNetworksTable";
import { useRouter } from "next/navigation";
import { getAllOptions } from "~/features/settings/server/actions/settings";

type OrganizationId = {
	id: string;
};
interface IProps {
	orgIds: OrganizationId[];
	user: User;
}

const NetworksList = ({ orgIds, user }: IProps) => {
	const b = useTranslations("commonButtons");
	const t = useTranslations("networks");
	const router = useRouter();

	const globalOptions = await getAllOptions();
	// const { data: globalOptions } = api.settings.getAllOptions.useQuery();
	const title = `${globalOptions?.siteName} - Local Controller`;

	const handleApiError = useTrpcApiErrorHandler();
	const handleApiSuccess = useTrpcApiSuccessHandler();

	useOrganizationWebsocket(orgIds);

	const {
		data: userNetworks,
		isLoading,
		refetch,
	} = api.network.getUserNetworks.useQuery({
		central: false,
	});

	const { data: unlinkedNetworks } = api.admin.unlinkedNetwork.useQuery(
		{ getDetails: false },
		{
			enabled: user?.role === "ADMIN",
		},
	);

	const { mutate: createNetwork } = api.network.createNetwork.useMutation({
		onError: handleApiError,
		onSuccess: handleApiSuccess({ actions: [refetch] }),
	});

	const addNewNetwork = () => {
		createNetwork(
			{ central: false },
			{
				onSuccess: (createdNetwork) => {
					if (createdNetwork?.id) {
						return void router.push(`/network/${createdNetwork.id}`);
					}
					void refetch();
				},
			},
		);
	};

	if (isLoading) {
		return (
			<>
				<MetaTags title={title} />
				<NetworkLoadingSkeleton />
			</>
		);
	}

	return (
		<div className="animate-fadeIn">
			<MetaTags title={title} />
			<main className="w-full bg-base-100">
				<div className="mb-3 mt-3 flex w-full justify-center ">
					<h5 className="w-full text-center text-2xl">{t("title")}</h5>
				</div>

				<div className="grid grid-cols-1 space-y-3 px-3 pt-5 md:grid-cols-[1fr,1fr,1fr] md:space-y-0 md:px-11">
					{(unlinkedNetworks?.length ?? 0) > 0 && (
						<div className="col-span-3 flex justify-center pb-5">
							<div role="alert" className="alert w-full md:w-3/6">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									fill="none"
									viewBox="0 0 24 24"
									className="stroke-info shrink-0 w-6 h-6"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth="2"
										d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
									></path>
								</svg>
								<span>
									{t.rich("unlinkedNetworks.title", {
										amount: unlinkedNetworks?.length,
									})}
								</span>
								<div>
									<Link href="/admin/?tab=controller" className="btn btn-sm">
										{t("unlinkedNetworks.navigate")}
									</Link>
								</div>
							</div>
						</div>
					)}
					<div className="flex justify-center col-span-3 md:col-span-1">
						<button className={"btn btn-primary btn-outline"} onClick={addNewNetwork}>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 24 24"
								strokeWidth="1.5"
								stroke="currentColor"
								className="mr-2 h-6 w-6"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									d="M12 4.5v15m7.5-7.5h-15"
								/>
							</svg>
							{b("addNetwork")}
						</button>
					</div>
					<div className="col-span-2">
						{userNetworks && userNetworks.length > 0 && (
							<UserNetworksTable tableData={userNetworks} />
						)}
						{!userNetworks ||
							(userNetworks.length === 0 && (
								<div className="alert alert-warning">
									<svg
										xmlns="http://www.w3.org/2000/svg"
										className="h-6 w-6 shrink-0 stroke-current"
										fill="none"
										viewBox="0 0 24 24"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth="2"
											d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
										/>
									</svg>
									<span>{t("noNetworksMessage")}</span>
								</div>
							))}
					</div>
				</div>
			</main>
		</div>
	);
};

export default NetworksList;
