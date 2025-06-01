import { useTranslations } from "next-intl";
import { LayoutAdminAuthenticated } from "~/components/layouts/layout";
import { api } from "~/utils/api";
import { type ReactElement, useState, useRef } from "react";
import MenuSectionDividerWrapper from "~/components/shared/menuSectionDividerWrapper";
import {
	useTrpcApiErrorHandler,
	useTrpcApiSuccessHandler,
} from "~/hooks/useTrpcApiHandler";
import { useModalStore } from "~/utils/store";

const BackupRestore = () => {
	const t = useTranslations("admin.backupRestore");
	const fileInputRef = useRef<HTMLInputElement>(null);
	const callModal = useModalStore((state) => state.callModal);

	const [createBackupOptions, setCreateBackupOptions] = useState({
		includeDatabase: true,
		includeZerotier: true,
		backupName: "",
	});

	const [restoreOptions, setRestoreOptions] = useState({
		restoreDatabase: true,
		restoreZerotier: true,
	});

	const [uploadedFile, setUploadedFile] = useState<File | null>(null);

	const handleApiError = useTrpcApiErrorHandler();
	const handleApiSuccess = useTrpcApiSuccessHandler();

	// Queries
	const {
		data: backups,
		refetch: refetchBackups,
		isLoading: backupsLoading,
	} = api.admin.listBackups.useQuery();

	// Mutations
	const { mutate: createBackup, isLoading: creatingBackup } =
		api.admin.createBackup.useMutation({
			onSuccess: (data) => {
				handleApiSuccess({
					actions: [refetchBackups],
					toastMessage: t("createBackup.successToast", { fileName: data.fileName }),
				})();

				// Trigger download
				downloadBackupFile(data.fileName);
			},
			onError: handleApiError,
		});

	const { mutate: deleteBackup, isLoading: deletingBackup } =
		api.admin.deleteBackup.useMutation({
			onSuccess: handleApiSuccess({
				actions: [refetchBackups],
				toastMessage: t("existingBackups.deleteSuccessToast"),
			}),
			onError: handleApiError,
		});

	const { mutate: restoreBackup, isLoading: restoringBackup } =
		api.admin.restoreBackup.useMutation({
			onSuccess: handleApiSuccess({
				toastMessage: t("restoreFromFile.restoreSuccessToast"),
			}),
			onError: handleApiError,
		});

	const { mutate: downloadBackup } = api.admin.downloadBackup.useMutation({
		onSuccess: (data) => {
			// Convert base64 to blob and download
			const byteCharacters = atob(data.data);
			const byteNumbers = new Array(byteCharacters.length);
			for (let i = 0; i < byteCharacters.length; i++) {
				byteNumbers[i] = byteCharacters.charCodeAt(i);
			}
			const byteArray = new Uint8Array(byteNumbers);
			// Updated MIME type for tar.gz files
			const blob = new Blob([byteArray], { type: "application/gzip" });

			const url = window.URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = data.fileName;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			window.URL.revokeObjectURL(url);
		},
		onError: handleApiError,
	});

	const { mutate: uploadBackup, isLoading: uploadingBackup } =
		api.admin.uploadBackup.useMutation({
			onSuccess: handleApiSuccess({
				actions: [refetchBackups],
				toastMessage: t("restoreFromFile.uploadSuccessToast"),
			}),
			onError: handleApiError,
		});

	const handleCreateBackup = () => {
		createBackup(createBackupOptions);
	};

	const downloadBackupFile = (fileName: string) => {
		downloadBackup({ fileName });
	};

	const handleDeleteBackup = (fileName: string) => {
		callModal({
			title: (
				<p>
					<span>{t("existingBackups.deleteModal.title")} </span>
					<span className="text-primary">{fileName}</span>
				</p>
			),
			description: t("existingBackups.deleteModal.description"),
			yesAction: () => deleteBackup({ fileName }),
		});
	};

	// Helper function to check if file is a valid tar file
	const isValidTarFile = (fileName: string) => {
		const validExtensions = [".tar", ".tar.gz", ".tgz", ".tar.bz2", ".tar.xz"];
		return validExtensions.some((ext) => fileName.toLowerCase().endsWith(ext));
	};

	const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (file && isValidTarFile(file.name)) {
			setUploadedFile(file);
		} else {
			callModal({
				title: t("restoreFromFile.invalidFileModal.title"),
				description: t("restoreFromFile.invalidFileModal.description"),
			});
		}
	};

	const handleRestoreFromUpload = async () => {
		if (!uploadedFile) return;

		callModal({
			title: (
				<p>
					<span>{t("restoreFromFile.restoreModal.title")} </span>
					<span className="text-primary">{uploadedFile.name}</span>
				</p>
			),
			description: t("restoreFromFile.restoreModal.description"),
			yesAction: () => {
				try {
					// Convert file to base64
					const reader = new FileReader();
					reader.onload = () => {
						const base64Data = reader.result as string;
						// Remove data:application/octet-stream;base64, or similar prefix
						const base64String = base64Data.split(",")[1];

						// Upload the file first
						uploadBackup({
							fileName: uploadedFile.name,
							fileData: base64String,
						});

						// Then restore from the uploaded file
						setTimeout(() => {
							restoreBackup({
								fileName: uploadedFile.name,
								...restoreOptions,
							});
						}, 1000); // Small delay to ensure upload completes
					};
					reader.readAsDataURL(uploadedFile);
				} catch (_error) {
					callModal({
						title: t("restoreFromFile.uploadErrorModal.title"),
						description: t("restoreFromFile.uploadErrorModal.description"),
					});
				}
			},
		});
	};

	const handleRestoreFromExisting = (fileName: string) => {
		callModal({
			title: (
				<p>
					<span>{t("existingBackups.restoreModal.title")} </span>
					<span className="text-primary">{fileName}</span>
				</p>
			),
			description: t("existingBackups.restoreModal.description"),
			yesAction: () => {
				restoreBackup({
					fileName,
					...restoreOptions,
				});
			},
		});
	};

	const formatFileSize = (bytes: number) => {
		if (bytes === 0) return "0 Bytes";
		const k = 1024;
		const sizes = ["Bytes", "KB", "MB", "GB"];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
	};

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleString();
	};

	return (
		<main className="flex w-full flex-col justify-center space-y-10 bg-base-100 p-5 sm:p-3 xl:w-6/12">
			{/* Create Backup Section */}
			<MenuSectionDividerWrapper title={t("createBackup.sectionTitle")}>
				<div className="pb-5">
					<p className="text-sm text-gray-500">{t("description")}</p>
				</div>
				<div className="space-y-4">
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<div className="form-control">
							<label className="label cursor-pointer">
								<span className="label-text">{t("createBackup.includeDatabase")}</span>
								<input
									type="checkbox"
									className="checkbox checkbox-primary"
									checked={createBackupOptions.includeDatabase}
									onChange={(e) =>
										setCreateBackupOptions((prev) => ({
											...prev,
											includeDatabase: e.target.checked,
										}))
									}
								/>
							</label>
						</div>
						<div className="form-control">
							<label className="label cursor-pointer">
								<span className="label-text">{t("createBackup.includeZerotier")}</span>
								<input
									type="checkbox"
									className="checkbox checkbox-primary"
									checked={createBackupOptions.includeZerotier}
									onChange={(e) =>
										setCreateBackupOptions((prev) => ({
											...prev,
											includeZerotier: e.target.checked,
										}))
									}
								/>
							</label>
						</div>
					</div>

					<div className="form-control">
						<label className="label">
							<span className="label-text">{t("createBackup.backupName")}</span>
						</label>
						<input
							type="text"
							placeholder={t("createBackup.backupNamePlaceholder")}
							className="input input-bordered"
							value={createBackupOptions.backupName}
							onChange={(e) =>
								setCreateBackupOptions((prev) => ({
									...prev,
									backupName: e.target.value,
								}))
							}
						/>
					</div>

					<button
						className={`btn ${creatingBackup ? "loading" : ""}`}
						onClick={handleCreateBackup}
						disabled={
							creatingBackup ||
							(!createBackupOptions.includeDatabase &&
								!createBackupOptions.includeZerotier)
						}
					>
						{creatingBackup
							? t("createBackup.creatingButton")
							: t("createBackup.createButton")}
					</button>
				</div>
			</MenuSectionDividerWrapper>

			{/* Existing Backups Section */}
			<MenuSectionDividerWrapper title={t("existingBackups.sectionTitle")}>
				<div className="space-y-4">
					{backupsLoading ? (
						<div className="flex justify-center">
							<span className="loading loading-spinner loading-md"></span>
						</div>
					) : backups && backups.length > 0 ? (
						<div className="">
							<table className="table table-zebra w-full">
								<thead>
									<tr>
										<th>{t("existingBackups.table.filename")}</th>
										<th>{t("existingBackups.table.size")}</th>
										<th>{t("existingBackups.table.created")}</th>
										<th>{t("existingBackups.table.actions")}</th>
									</tr>
								</thead>
								<tbody>
									{backups.map((backup) => (
										<tr key={backup.fileName}>
											<td className="font-mono text-sm">{backup.fileName}</td>
											<td>{formatFileSize(backup.size)}</td>
											<td>{formatDate(backup.created)}</td>
											<td>
												<div className="flex space-x-2">
													<button
														className="btn btn-sm btn-outline btn-primary"
														onClick={() => downloadBackupFile(backup.fileName)}
													>
														{t("existingBackups.table.download")}
													</button>
													<button
														className="btn btn-sm btn-outline btn-success"
														onClick={() => handleRestoreFromExisting(backup.fileName)}
														disabled={restoringBackup}
													>
														{t("existingBackups.table.restore")}
													</button>
													<button
														className={`btn btn-sm btn-outline btn-error ${deletingBackup ? "loading" : ""}`}
														onClick={() => handleDeleteBackup(backup.fileName)}
														disabled={deletingBackup}
													>
														{t("existingBackups.table.delete")}
													</button>
												</div>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					) : (
						<div className="text-center text-gray-500 py-8">
							{t("existingBackups.noBackups")}
						</div>
					)}
				</div>
			</MenuSectionDividerWrapper>

			{/* Restore from File Section */}
			<MenuSectionDividerWrapper title={t("restoreFromFile.sectionTitle")} className="">
				<div className="space-y-4">
					<div className="alert alert-error">
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
								d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
							/>
						</svg>
						<span>
							<strong>Warning:</strong> {t("restoreFromFile.warning")}
						</span>
					</div>

					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<div className="form-control">
							<label className="label cursor-pointer">
								<span className="label-text">{t("restoreFromFile.restoreDatabase")}</span>
								<input
									type="checkbox"
									className="checkbox checkbox-primary"
									checked={restoreOptions.restoreDatabase}
									onChange={(e) =>
										setRestoreOptions((prev) => ({
											...prev,
											restoreDatabase: e.target.checked,
										}))
									}
								/>
							</label>
						</div>
						<div className="form-control">
							<label className="label cursor-pointer">
								<span className="label-text">{t("restoreFromFile.restoreZerotier")}</span>
								<input
									type="checkbox"
									className="checkbox checkbox-primary"
									checked={restoreOptions.restoreZerotier}
									onChange={(e) =>
										setRestoreOptions((prev) => ({
											...prev,
											restoreZerotier: e.target.checked,
										}))
									}
								/>
							</label>
						</div>
					</div>

					<div className="form-control">
						<label className="label">
							<span className="label-text">{t("restoreFromFile.selectFile")}</span>
						</label>
						<input
							ref={fileInputRef}
							type="file"
							accept=".tar,.tar.gz,.tgz,.tar.bz2,.tar.xz"
							className="file-input file-input-bordered w-full"
							onChange={handleFileUpload}
						/>
					</div>

					{uploadedFile && (
						<div className="alert">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 24 24"
								className="stroke-current shrink-0 w-6 h-6"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth="2"
									d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
								></path>
							</svg>
							<span>
								{t("restoreFromFile.selectedFile", {
									fileName: uploadedFile.name,
									size: formatFileSize(uploadedFile.size),
								})}
							</span>
						</div>
					)}

					<button
						className={`btn btn-warning ${restoringBackup || uploadingBackup ? "loading" : ""}`}
						onClick={handleRestoreFromUpload}
						disabled={
							!uploadedFile ||
							restoringBackup ||
							uploadingBackup ||
							(!restoreOptions.restoreDatabase && !restoreOptions.restoreZerotier)
						}
					>
						{restoringBackup || uploadingBackup
							? t("restoreFromFile.processingButton")
							: t("restoreFromFile.restoreButton")}
					</button>
				</div>
			</MenuSectionDividerWrapper>
		</main>
	);
};

BackupRestore.getLayout = function getLayout(page: ReactElement) {
	return <LayoutAdminAuthenticated>{page}</LayoutAdminAuthenticated>;
};

export default BackupRestore;
