import { useTranslations } from "next-intl";
import React, { useState } from "react";
import {
	useTrpcApiErrorHandler,
	useTrpcApiSuccessHandler,
} from "~/hooks/useTrpcApiHandler";
import { api } from "~/utils/api";
import { useModalStore } from "~/utils/store";

const DeleteOrganizationModal = ({ org }) => {
	const b = useTranslations("commonButtons");
	const m = useTranslations("commonToast");

	const handleApiError = useTrpcApiErrorHandler();
	const handleApiSuccess = useTrpcApiSuccessHandler();

	const [input, setInput] = useState({ orgNameDelete: "" });

	const { closeModal } = useModalStore((state) => state);

	const { refetch: refetchOrg } = api.org.getAllOrg.useQuery();

	const { mutate: deleteOrg } = api.org.deleteOrg.useMutation({
		onError: handleApiError,
		onSuccess: handleApiSuccess({
			actions: [refetchOrg, closeModal],
			toastMessage: m("organizationDeleted"),
		}),
	});

	const inputHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
		setInput({
			...input,
			[e.target.name]: e.target.value,
		});
	};

	return (
		<div>
			<p className="mb-4">Are you sure you want to delete this organization?</p>
			<p className="mb-4 text-sm text-red-600">
				This action will permanently delete the organization along with all its networks,
				members, and related data. This action cannot be undone.
			</p>
			<p className="text-sm">
				Please confirm that you want to proceed with deleting the organization.
			</p>
			<input
				type="text"
				name="orgNameDelete"
				onChange={inputHandler}
				placeholder="Type the name of the organization to confirm"
				className="input input-bordered border-warning input-sm w-full max-w-xs my-2"
			/>
			<div>
				<button
					onClick={() =>
						deleteOrg({
							organizationId: org.id,
						})
					}
					disabled={input.orgNameDelete !== org.orgName}
					className="btn btn-sm btn-error"
				>
					{b("deleteOrganization")}
				</button>
			</div>
		</div>
	);
};

export default DeleteOrganizationModal;
