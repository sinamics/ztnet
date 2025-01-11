import { useState } from "react";
import { useTranslations } from "next-intl";
import { NetworkIpv4Assignment } from "./NetworkIpv4Assignment";
import { NetworkIpv6assignment } from "./NetworkIpv6assignment";
import { NetworkMTU } from "./NetworkMtu";

interface IProp {
	central?: boolean;
	organizationId?: string;
}

export const NetworkIpAssignment = ({ central = false, organizationId }: IProp) => {
	const t = useTranslations("networkById");

	// State to keep track of the active tab
	const [activeTab, setActiveTab] = useState("IPv4");

	return (
		<div className="collapse collapse-arrow w-full border border-base-300 bg-base-200">
			<input type="checkbox" />
			<div className="collapse-title">{t("networkIpAssignments.header")}</div>
			<div className="w-100 collapse-content">
				<div role="tablist" className="tabs tabs-lifted w-full justify-center pb-5">
					<a
						role="tab"
						onClick={() => setActiveTab("IPv4")}
						className={`tab tab-bordered ${activeTab === "IPv4" ? "tab-active" : ""}`}
					>
						{t("networkIpAssignments.tabs.ipv4")}
					</a>
					<a
						role="tab"
						onClick={() => setActiveTab("IPv6")}
						className={`tab tab-bordered ${activeTab === "IPv6" ? "tab-active" : ""}`}
					>
						{t("networkIpAssignments.tabs.ipv6")}
					</a>
					<a
						role="tab"
						onClick={() => setActiveTab("mtu")}
						className={`tab tab-bordered ${activeTab === "mtu" ? "tab-active" : ""}`}
					>
						{t("networkIpAssignments.tabs.mtu")}
					</a>
				</div>
				{activeTab === "IPv4" ? (
					// Show ipv4 assignment content here
					<NetworkIpv4Assignment central={central} organizationId={organizationId} />
				) : null}

				{activeTab === "IPv6" ? (
					// Show ipv6 assignment content here
					<NetworkIpv6assignment central={central} organizationId={organizationId} />
				) : null}

				{activeTab === "mtu" ? (
					// Show ipv6 assignment content here
					<NetworkMTU central={central} organizationId={organizationId} />
				) : null}
			</div>
		</div>
	);
};
