import { APIToken, Organization, Role } from "@prisma/client";
import { useTranslations } from "next-intl";
import React, { useState } from "react";
import toast from "react-hot-toast";
import { api } from "~/utils/api";
import { useModalStore } from "~/utils/store";

interface Iprops {
	organizationId: string;
	orgData: Organization & { APIToken: APIToken[] };
	// invite?: OrganizationInvitation & { tokenUrl: string };
}

const ApiTokenModal = ({ organizationId, orgData }: Iprops) => {
	const b = useTranslations("commonButtons");
	// const t = useTranslations("admin");
	const [state, setState] = useState({
		userId: null,
		name: "",
		role: Role.USER,
	});

	const { mutate: generateApiToken } = api.org.generateApiToken.useMutation({
		onSuccess: () => {
			toast.success("Token generated successfully");
			closeModal();
		},
	});
	const { closeModal } = useModalStore((state) => state);

	return (
		<div className="grid grid-cols-4 items-start gap-4">
			<div className="col-span-4 space-y-10">
				<form>
					<div className="form-control max-w-xs">
						{/* list all tokens in  badges from orgData */}
						<label className="label">
							<span className="label-text">API Tokens</span>
						</label>
						<div className="flex flex-wrap gap-2">
							{orgData.APIToken?.map((token) => (
								<div key={token.id} className="badge badge-secondary">
									{token.name}
								</div>
							))}
						</div>
					</div>
				</form>
				<form>
					<div className="form-control max-w-xs">
						<p className="text-sm text-gray-400">
							Creating Token will allow Admins to perform CRUD operation for Organization
							using API endpoint
						</p>
						<label className="label">
							<span className="label-text">Give token a name</span>
						</label>
						<input
							type="text"
							placeholder="Token Name"
							className="input input-bordered input-md"
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
			</div>
		</div>
	);
};

export default ApiTokenModal;
