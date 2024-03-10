import { Role } from "@prisma/client";
import { useTranslations } from "next-intl";
import React, { useState } from "react";
import toast from "react-hot-toast";
import { api } from "~/utils/api";
import { CopyToClipboard } from "react-copy-to-clipboard";
// import { useModalStore } from "~/utils/store";

interface Iprops {
	organizationId: string;
	// orgData: Organization & { APIToken: APIToken[] };
	// invite?: OrganizationInvitation & { tokenUrl: string };
}

const OrgApiTokenModal = ({ organizationId }: Iprops) => {
	const [token, setToken] = useState("");
	const b = useTranslations("commonButtons");
	const t = useTranslations();
	const [state, setState] = useState({
		userId: null,
		name: "",
		role: Role.USER,
	});

	const { refetch: refetchAllOrgs } = api.org.getAllOrg.useQuery();
	// const { data: orgData, refetch: refetchOrg } = api.org.getOrgById.useQuery({
	// 	organizationId,
	// });

	// const { mutate: deleteToken } = api.org.deleteApiToken.useMutation({
	// 	onSuccess: () => {
	// 		refetchOrg();
	// 		refetchAllOrgs();
	// 		toast.success("Token deleted successfully");
	// 	},
	// });

	const { mutate: generateApiToken } = api.org.generateApiToken.useMutation({
		onSuccess: (data) => {
			setToken(data);
			// refetchOrg();
			refetchAllOrgs();
			// closeModal();
			toast.success("Token generated successfully");
		},
	});
	// const { closeModal } = useModalStore((state) => state);
	return (
		<div className="grid grid-cols-4 items-start gap-4">
			<div className="col-span-4 space-y-10">
				{!token ? (
					<form className="space-y-5">
						<div className="form-control max-w-xs">
							<p className="text-sm text-gray-400">
								Creating Token will allow Admins to perform CRUD operation for
								Organization using API endpoint
							</p>
							<label className="label">
								<span className="label-text">Give token a name</span>
							</label>
							<input
								type="text"
								placeholder="Token Name"
								className="input input-bordered input-sm"
								onChange={(e) => setState({ ...state, name: e.target.value })}
							/>
						</div>
						<div>
							{/* add submit button here */}
							<button
								type="submit"
								className="btn btn-primary btn-sm"
								onClick={(e) => {
									e.preventDefault();
									generateApiToken({
										organizationId: organizationId,
										name: state.name,
									});
								}}
							>
								{b("create")}
							</button>
						</div>
					</form>
				) : (
					<div>
						<div className="form-control">
							<CopyToClipboard
								text={token}
								onCopy={() => toast.success("Token copied")}
								title="Copied to clipboard"
							>
								<div className="flex flex-col items-center space-y-2 max-w-3/6">
									<p className="text-sm text-gray-300">
										{t("userSettings.account.restapi.response.info")}
									</p>
									<p className="text-xs text-gray-300">
										({t("userSettings.account.restapi.response.title")})
									</p>
									<p className="text-sm text-gray-500 break-all">
										<span className="text-primary cursor-pointer">{token}</span>
									</p>
								</div>
							</CopyToClipboard>
						</div>
					</div>
				)}
			</div>
		</div>
	);
};

export default OrgApiTokenModal;
