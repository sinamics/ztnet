import { type ReactElement } from "react";
import { LayoutAuthenticated } from "~/components/layouts/layout";
import type { NextPageWithLayout } from "../_app";
import { api } from "~/utils/api";
import { NetworkTable } from "../../components/networkPage/networkTable";
import { globalSiteTitle } from "~/utils/global";
import { useTranslations } from "next-intl";
import toast from "react-hot-toast";
import { ErrorData } from "~/types/errorHandling";
import { getServerSideProps } from "~/server/getServerSideProps";
import useOrganizationWebsocket from "~/hooks/useOrganizationWebsocket";
import NetworkLoadingSkeleton from "~/components/shared/networkLoadingSkeleton";
import MetaTags from "~/components/shared/metaTags";

type OrganizationId = {
	id: string;
};
interface IProps {
	orgIds: OrganizationId[];
}

const title = `${globalSiteTitle} - Local Controller`;

const Networks: NextPageWithLayout = ({ orgIds }: IProps) => {
	const b = useTranslations("commonButtons");
	const t = useTranslations("networks");

	useOrganizationWebsocket(orgIds);

	const {
		data: userNetworks,
		isLoading,
		refetch,
	} = api.network.getUserNetworks.useQuery({
		central: false,
	});
	const { mutate: createNetwork } = api.network.createNetwork.useMutation({
		onError: (error) => {
			if ((error.data as ErrorData)?.zodError) {
				const fieldErrors = (error.data as ErrorData)?.zodError.fieldErrors;
				for (const field in fieldErrors) {
					// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/restrict-template-expressions, @typescript-eslint/no-unsafe-call
					toast.error(`${fieldErrors[field].join(", ")}`);
				}
			} else if (error.message) {
				toast.error(error.message);
			} else {
				toast.error("An unknown error occurred");
			}
		},
		onSuccess: () => {
			toast.success("Network created successfully");
			refetch();
		},
	});

	const addNewNetwork = () => {
		createNetwork({ central: false }, { onSuccess: () => void refetch() });
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
					<div className="flex justify-center">
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
							<NetworkTable tableData={userNetworks} />
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

Networks.getLayout = function getLayout(page: ReactElement) {
	return <LayoutAuthenticated>{page}</LayoutAuthenticated>;
};
export { getServerSideProps };
export default Networks;
