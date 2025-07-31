import React, { useState } from "react";
import { api } from "~/utils/api";
import toast from "react-hot-toast";
import { useModalStore } from "~/utils/store";
import { useTranslations } from "next-intl";
import { useTrpcApiErrorHandler } from "~/hooks/useTrpcApiHandler";

const CreateUserModal = () => {
	const t = useTranslations("admin");
	const b = useTranslations("commonButtons");
	const handleApiError = useTrpcApiErrorHandler();
	const closeModal = useModalStore((state) => state.closeModal);

	const [formData, setFormData] = useState({
		name: "",
		email: "",
		password: "",
		role: "USER" as "USER" | "ADMIN",
		userGroupId: undefined as number | undefined,
		requestChangePassword: false,
		organizationId: undefined as string | undefined,
		organizationRole: "USER" as "READ_ONLY" | "USER" | "ADMIN",
	});

	const [createdUser, setCreatedUser] = useState<{
		name: string;
		email: string;
		password: string;
		role: string;
		organizationName?: string;
		organizationRole?: string;
	} | null>(null);

	// Fetch user groups for the dropdown
	const { data: userGroups } = api.admin.getUserGroups.useQuery();

	// Fetch organizations for the dropdown
	const { data: organizations } = api.org.getAllOrg.useQuery();

	// Refetch users after creation
	const { refetch: refetchUsers } = api.admin.getUsers.useQuery({
		isAdmin: false,
	});

	const { mutate: createUser, isLoading: isCreating } = api.admin.createUser.useMutation({
		onError: handleApiError,
		onSuccess: () => {
			// Refetch users and show success message
			refetchUsers();
			toast.success(t("users.users.createUser.toast.createUserSuccess"));

			// Store created user info for display
			const selectedOrg = organizations?.find(
				(org) => org.id === formData.organizationId,
			);
			setCreatedUser({
				name: formData.name.trim(),
				email: formData.email.trim(),
				password: formData.password,
				role: formData.role,
				organizationName: selectedOrg?.orgName,
				organizationRole: formData.organizationId ? formData.organizationRole : undefined,
			});
		},
	});

	const generatePassword = () => {
		const charset =
			"abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
		let password = "";
		for (let i = 0; i < 12; i++) {
			password += charset.charAt(Math.floor(Math.random() * charset.length));
		}
		setFormData({ ...formData, password });
	};

	const copyUserInfo = () => {
		if (createdUser) {
			let userInfo = `${t("users.users.createUser.userAccountCreated")}
Name: ${createdUser.name}
Email: ${createdUser.email}
Password: ${createdUser.password}
Role: ${createdUser.role}`;

			if (createdUser.organizationName) {
				userInfo += `
Organization: ${createdUser.organizationName}`;
			}

			if (createdUser.organizationRole) {
				userInfo += `
Organization Role: ${createdUser.organizationRole}`;
			}

			// Try modern clipboard API first
			if (navigator.clipboard?.writeText) {
				navigator.clipboard
					.writeText(userInfo)
					.then(() => {
						toast.success(t("users.users.createUser.toast.copySuccess"));
					})
					.catch(() => {
						fallbackCopyTextToClipboard(userInfo);
					});
			} else {
				// Fallback for older browsers or non-HTTPS
				fallbackCopyTextToClipboard(userInfo);
			}
		}
	};

	const fallbackCopyTextToClipboard = (text: string) => {
		const textArea = document.createElement("textarea");
		textArea.value = text;

		// Avoid scrolling to bottom
		textArea.style.top = "0";
		textArea.style.left = "0";
		textArea.style.position = "fixed";

		document.body.appendChild(textArea);
		textArea.focus();
		textArea.select();

		try {
			const successful = document.execCommand("copy");
			if (successful) {
				toast.success(t("users.users.createUser.toast.copySuccess"));
			} else {
				toast.error(t("users.users.createUser.toast.copyError"));
			}
		} catch {
			toast.error(t("users.users.createUser.toast.copyError"));
		}

		document.body.removeChild(textArea);
	};

	const closeModalAndReset = () => {
		setCreatedUser(null);
		setFormData({
			name: "",
			email: "",
			password: "",
			role: "USER" as "USER" | "ADMIN",
			userGroupId: undefined as number | undefined,
			requestChangePassword: false,
			organizationId: undefined as string | undefined,
			organizationRole: "USER" as "READ_ONLY" | "USER" | "ADMIN",
		});
		closeModal();
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();

		if (!formData.name.trim()) {
			toast.error("Name is required");
			return;
		}
		if (!formData.email.trim()) {
			toast.error("Email is required");
			return;
		}
		if (!formData.password.trim()) {
			toast.error("Password is required");
			return;
		}

		createUser({
			name: formData.name.trim(),
			email: formData.email.trim(),
			password: formData.password,
			role: formData.role,
			userGroupId: formData.userGroupId,
			requestChangePassword: formData.requestChangePassword,
			organizationId: formData.organizationId,
			organizationRole: formData.organizationRole,
		});
	};

	return (
		<div className="space-y-6 max-w-4xl mx-auto">
			{isCreating && (
				<div className="fixed inset-0 z-50 flex items-center justify-center">
					<span className="loading loading-bars loading-lg"></span>
				</div>
			)}

			{createdUser ? (
				// Success screen with user info
				<div className="space-y-6">
					<div className="alert alert-success">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							className="stroke-current shrink-0 h-6 w-6"
							fill="none"
							viewBox="0 0 24 24"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth="2"
								d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
							/>
						</svg>
						<span>{t("users.users.createUser.successMessage")}</span>
					</div>

					<div className="card bg-base-200 shadow-sm">
						<div className="card-body">
							<h3 className="card-title text-lg mb-4">
								{t("users.users.createUser.userAccountDetails")}
							</h3>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div className="space-y-3 font-mono text-sm">
									<div className="flex flex-col">
										<span className="font-semibold text-base-content/70 text-xs uppercase tracking-wide">
											Name
										</span>
										<span className="text-base">{createdUser.name}</span>
									</div>
									<div className="flex flex-col">
										<span className="font-semibold text-base-content/70 text-xs uppercase tracking-wide">
											Email
										</span>
										<span className="text-base">{createdUser.email}</span>
									</div>
									<div className="flex flex-col">
										<span className="font-semibold text-base-content/70 text-xs uppercase tracking-wide">
											Password
										</span>
										<span className="text-base font-mono bg-base-300 px-2 py-1 rounded">
											{createdUser.password}
										</span>
									</div>
								</div>
								<div className="space-y-3 font-mono text-sm">
									<div className="flex flex-col">
										<span className="font-semibold text-base-content/70 text-xs uppercase tracking-wide">
											Role
										</span>
										<span className="text-base">{createdUser.role}</span>
									</div>
									{createdUser.organizationName && (
										<div className="flex flex-col">
											<span className="font-semibold text-base-content/70 text-xs uppercase tracking-wide">
												Organization
											</span>
											<span className="text-base">{createdUser.organizationName}</span>
										</div>
									)}
									{createdUser.organizationRole && (
										<div className="flex flex-col">
											<span className="font-semibold text-base-content/70 text-xs uppercase tracking-wide">
												Organization Role
											</span>
											<span className="text-base">{createdUser.organizationRole}</span>
										</div>
									)}
								</div>
							</div>
						</div>
					</div>

					<div className="flex justify-end gap-3">
						<button onClick={copyUserInfo} className="btn btn-outline btn-sm">
							📋 {t("users.users.createUser.copyInfoButton")}
						</button>
						<button onClick={closeModalAndReset} className="btn btn-primary btn-sm">
							{t("users.users.createUser.doneButton")}
						</button>
					</div>
				</div>
			) : (
				// Form screen
				<form onSubmit={handleSubmit} className="space-y-6">
					{/* Header */}
					<div className="text-center pb-4 border-b border-base-300">
						<h2 className="text-xl font-semibold">{t("users.users.createUser.title")}</h2>
						<p className="text-sm text-base-content/70 mt-1">
							Fill in the details below to create a new user account
						</p>
					</div>

					{/* Main Content Grid */}
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
						{/* Left Column - Basic Information */}
						<div className="space-y-6">
							<div className="pb-2 border-b border-base-200">
								<h3 className="text-lg font-medium text-base-content">
									Basic Information
								</h3>
								<p className="text-sm text-base-content/70">
									Personal details and credentials
								</p>
							</div>

							{/* Name Field */}
							<div className="form-control">
								<label className="label">
									<span className="label-text font-medium">
										{t("users.users.createUser.nameLabel")}
									</span>
								</label>
								<input
									type="text"
									value={formData.name}
									onChange={(e) => setFormData({ ...formData, name: e.target.value })}
									placeholder={t("users.users.createUser.namePlaceholder")}
									className="input input-bordered input-sm w-full"
									required
								/>
							</div>

							{/* Email Field */}
							<div className="form-control">
								<label className="label">
									<span className="label-text font-medium">
										{t("users.users.createUser.emailLabel")}
									</span>
								</label>
								<input
									type="email"
									value={formData.email}
									onChange={(e) => setFormData({ ...formData, email: e.target.value })}
									placeholder={t("users.users.createUser.emailPlaceholder")}
									className="input input-bordered input-sm w-full"
									required
								/>
								<label className="label">
									<span className="label-text-alt text-gray-500">
										{t("users.users.createUser.emailDescription")}
									</span>
								</label>
							</div>

							{/* Password Field */}
							<div className="form-control">
								<label className="label">
									<span className="label-text font-medium">
										{t("users.users.createUser.passwordLabel")}
									</span>
								</label>
								<div className="flex gap-2">
									<input
										type="text"
										value={formData.password}
										onChange={(e) =>
											setFormData({ ...formData, password: e.target.value })
										}
										placeholder={t("users.users.createUser.passwordPlaceholder")}
										className="input input-bordered input-sm flex-1"
										required
									/>
									<div
										className="tooltip"
										data-tip={t("users.users.createUser.generatePasswordButton")}
									>
										<button
											type="button"
											onClick={generatePassword}
											className="btn btn-outline btn-sm"
										>
											🎲
										</button>
									</div>
								</div>
							</div>

							{/* Force Password Change */}
							<div className="form-control">
								<label className="label cursor-pointer justify-start gap-3">
									<input
										type="checkbox"
										checked={formData.requestChangePassword}
										onChange={(e) =>
											setFormData({
												...formData,
												requestChangePassword: e.target.checked,
											})
										}
										className="checkbox checkbox-primary checkbox-sm"
									/>
									<span className="label-text font-medium">
										{t("users.users.createUser.forcePasswordChangeLabel")}
									</span>
								</label>
								<label className="label">
									<span className="label-text-alt text-gray-500">
										{t("users.users.createUser.forcePasswordChangeDescription")}
									</span>
								</label>
							</div>
						</div>

						{/* Right Column - Permissions & Organization */}
						<div className="space-y-6">
							<div className="pb-2 border-b border-base-200">
								<h3 className="text-lg font-medium text-base-content">
									Permissions & Organization
								</h3>
								<p className="text-sm text-base-content/70">
									Access levels and group assignments
								</p>
							</div>

							{/* Role Field */}
							<div className="form-control">
								<label className="label">
									<span className="label-text font-medium">
										{t("users.users.createUser.roleLabel")}
									</span>
								</label>
								<select
									value={formData.role}
									onChange={(e) =>
										setFormData({
											...formData,
											role: e.target.value as "USER" | "ADMIN",
										})
									}
									className="select select-bordered select-sm w-full"
								>
									<option value="USER">USER</option>
									<option value="ADMIN">ADMIN</option>
								</select>
							</div>

							{/* User Group Field */}
							<div className="form-control">
								<label className="label">
									<span className="label-text font-medium">
										{t("users.users.createUser.userGroupLabel")}
									</span>
								</label>
								<select
									value={formData.userGroupId || ""}
									onChange={(e) =>
										setFormData({
											...formData,
											userGroupId: e.target.value ? Number(e.target.value) : undefined,
										})
									}
									className="select select-bordered select-sm w-full"
								>
									<option value="">
										{t("users.users.createUser.defaultGroupOption")}
									</option>
									{userGroups?.map((group) => (
										<option key={group.id} value={group.id}>
											{group.name}
										</option>
									))}
								</select>
							</div>

							{/* Organization Field */}
							<div className="form-control">
								<label className="label">
									<span className="label-text font-medium">
										{t("users.users.createUser.organizationLabel")}
									</span>
								</label>
								<select
									value={formData.organizationId || ""}
									onChange={(e) =>
										setFormData({
											...formData,
											organizationId: e.target.value || undefined,
										})
									}
									className="select select-bordered select-sm w-full"
								>
									<option value="">
										{t("users.users.createUser.defaultOrganizationOption")}
									</option>
									{organizations?.map((org) => (
										<option key={org.id} value={org.id}>
											{org.orgName}
										</option>
									))}
								</select>
								<label className="label">
									<span className="label-text-alt text-gray-500">
										{t("users.users.createUser.organizationDescription")}
									</span>
								</label>
							</div>

							{/* Organization Role Field - only show if organization is selected */}
							{formData.organizationId && (
								<div className="form-control">
									<label className="label">
										<span className="label-text font-medium">
											{t("users.users.createUser.organizationRoleLabel")}
										</span>
									</label>
									<select
										value={formData.organizationRole}
										onChange={(e) =>
											setFormData({
												...formData,
												organizationRole: e.target.value as
													| "READ_ONLY"
													| "USER"
													| "ADMIN",
											})
										}
										className="select select-bordered select-sm w-full"
									>
										<option value="READ_ONLY">READ_ONLY</option>
										<option value="USER">USER</option>
										<option value="ADMIN">ADMIN</option>
									</select>
									<label className="label">
										<span className="label-text-alt text-gray-500">
											{t("users.users.createUser.organizationRoleDescription")}
										</span>
									</label>
								</div>
							)}
						</div>
					</div>

					{/* Submit Buttons */}
					<div className="flex justify-end gap-3 pt-6 border-t border-base-300">
						<button
							type="button"
							onClick={closeModal}
							className="btn btn-outline btn-sm"
							disabled={isCreating}
						>
							{b("cancel")}
						</button>
						<button
							type="submit"
							className="btn btn-primary btn-sm"
							disabled={isCreating}
						>
							{isCreating ? (
								<span className="loading loading-spinner loading-sm"></span>
							) : (
								t("users.users.createUser.createButton")
							)}
						</button>
					</div>
				</form>
			)}
		</div>
	);
};

export default CreateUserModal;
