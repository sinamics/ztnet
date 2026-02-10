import { useTranslations } from "next-intl";
import React from "react";

const NetworkHelpText: React.FC = () => {
	const t = useTranslations("networkById.networkHelp");

	return (
		<div className="collapse collapse-arrow w-full border border-base-300 bg-base-200">
			<input type="checkbox" />
			<div className="collapse-title">{t("title")}</div>
			<div className="collapse-content" style={{ width: "100%" }}>
				<div className="grid grid-cols-3 gap-5 ">
					<div className="space-y-5 leading-normal">
						<div>
							<section>
								<b>{t("networkID")}</b>
								<p className="text-gray-400">{t("networkIDText")}</p>
							</section>
						</div>
						<div>
							<section>
								<b>{t("networkName")}</b>
								<p className="text-gray-400">{t("networkNameText")}</p>
							</section>
						</div>
						<div>
							<section>
								<b>{t("accessControl")}</b>
								<p className="text-gray-400">{t("accessControlText")}</p>
							</section>
						</div>
						<div>
							<section>
								<b>{t("multicastRecipientLimit")}</b>
								<p className="text-gray-400">{t("multicastRecipientLimitText")}</p>
								<p className="text-gray-400">{t("multicastRecipientLimitText2")}</p>
							</section>
						</div>
					</div>
					<div className="space-y-5">
						<div className="leading-normal">
							<section>
								<b>{t("managedRoutes")}</b>
								<p className="text-gray-400">{t("managedRoutesText")}</p>
								{/* Icon representation here */}
							</section>
							{/* Add other sections */}
						</div>
						<div className="leading-normal">
							<section>
								<b>{t("ipv4AutoAssign")}</b>
								<p className="text-gray-400">{t("ipv4AutoAssignText")}</p>
							</section>
							{/* Add other sections */}
						</div>
					</div>
					<div className="space-y-5 leading-normal">
						<section id="#dns-help">
							<b>{t("dnsPush")}</b>
							<section>
								<p className="text-gray-400">{t("dnsPushText1")}</p>
								<p className="text-gray-400">{t("dnsPushText2")}</p>
								<p className="text-gray-400">{t("dnsPushText3")}</p>
								<p className="text-gray-400">{t("dnsPushText4")}</p>
								<p className="text-gray-400">{t("dnsPushText5")}</p>
							</section>
						</section>
					</div>
				</div>
			</div>
		</div>
	);
};

export default NetworkHelpText;
