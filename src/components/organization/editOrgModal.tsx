import React, { useEffect, useState } from "react";
import { api } from "~/utils/api";
import toast from "react-hot-toast";
import { useModalStore } from "~/utils/store";
// import { useTranslations } from "next-intl";
import Input from "../elements/input";

interface Iprops {
	organizationId: string;
}

const EditOrganizationModal = ({ organizationId }: Iprops) => {
	// const t = useTranslations("admin");
	const [input, setInput] = useState({ orgDescription: "", orgName: "" });
	const { closeModal } = useModalStore((state) => state);
	const { refetch: refecthAllOrg } = api.org.getAllOrg.useQuery();
	const { data: orgData } = api.org.getOrgById.useQuery({
		organizationId,
	});
	const { mutate: updateOrg } = api.org.updateMeta.useMutation();
	useEffect(() => {
		if (orgData) {
			setInput({
				orgDescription: orgData.description,
				orgName: orgData.orgName,
			});
		}
	}, [orgData]);

	const inputHandler = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
		setInput({
			...input,
			[e.target.name]: e.target.value,
		});
	};
	return (
		<form className="space-y-5 w-full">
			<label className="form-control">
				<div className="label">
					<span className="label-text">Organization Name</span>
				</div>
				<Input
					type="text"
					placeholder="type here"
					value={input?.orgName}
					onChange={inputHandler}
					name="orgName"
					className="input-bordered input-sm w-full"
				/>
			</label>
			<label className="form-control">
				<div className="label">
					<span className="label-text">Description</span>
				</div>
				<textarea
					placeholder="type here"
					value={input?.orgDescription}
					onChange={inputHandler}
					name="orgDescription"
					className="textarea-bordered textarea-sm w-full"
				/>
			</label>

			<button
				onClick={(e) => {
					e.preventDefault();
					updateOrg(
						{
							organizationId,
							...input,
						},
						{
							onSuccess: () => {
								toast.success("Organization updated successfully");
								refecthAllOrg();
								closeModal();
							},
						},
					);
				}}
				type="submit"
				className="btn btn-sm"
			>
				Submit
			</button>
		</form>
	);
};

export default EditOrganizationModal;
