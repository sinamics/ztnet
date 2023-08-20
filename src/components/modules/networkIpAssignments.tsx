import { useState } from "react";
import { useTranslations } from "next-intl";
import { Ipv4Assignment } from "./ipv4Assignment";
import { Ipv6assignment } from "./ipv6assignment";

interface IProp {
	central?: boolean;
}

export const NetworkIpAssignment = ({ central = false }: IProp) => {
	const t = useTranslations("networkById");

	// State to keep track of the active tab
	const [activeTab, setActiveTab] = useState("IPv4");

	return (
		<div
			tabIndex={0}
			className="collapse collapse-arrow w-full border border-base-300 bg-base-200"
		>
			<input type="checkbox" />
			<div className="collapse-title">
				{t("networkIpAssignments.ipv4.ipv4_assignment")}
			</div>
			<div className="w-100 collapse-content">
				<div className="tabs w-full justify-center pb-5">
					<a
						className={`tab tab-bordered ${
							activeTab === "IPv4" ? "tab-active" : ""
						}`}
						onClick={() => setActiveTab("IPv4")}
					>
						{t("networkIpAssignments.tabs.ipv4")}
					</a>
					<a
						className={`tab tab-bordered ${
							activeTab === "IPv6" ? "tab-active" : ""
						}`}
						onClick={() => setActiveTab("IPv6")}
					>
						{t("networkIpAssignments.tabs.ipv6")}
					</a>
				</div>

				{activeTab === "IPv4" ? (
					// Show ipv4 assignment content here
					<Ipv4Assignment central={central} />
				) : null}

				{activeTab === "IPv6" ? (
					// Show ipv6 assignment content here
					<Ipv6assignment central={central} />
				) : null}
			</div>
		</div>
	);
};
