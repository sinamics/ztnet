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
	const t = useTranslations("admin");
	const b = useTranslations("commonButtons");
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
					toastMessage: `Backup created: ${data.fileName}`,
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
				toastMessage: "Backup deleted successfully",
			}),
			onError: handleApiError,
		});

	const { mutate: restoreBackup, isLoading: restoringBackup } =
		api.admin.restoreBackup.useMutation({
			onSuccess: handleApiSuccess({
				toastMessage: "Restore completed successfully. Please restart the application.",
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
			const blob = new Blob([byteArray], { type: "application/zip" });

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
				toastMessage: "Backup uploaded successfully",
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
					<span>Delete Backup </span>
					<span className="text-primary">{fileName}</span>
				</p>
			),
			description:
				"Are you sure you want to delete this backup? This action cannot be undone.",
			yesAction: () => deleteBackup({ fileName }),
		});
	};

	const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (file?.name.endsWith(".zip")) {
			setUploadedFile(file);
		} else {
			callModal({
				title: "Invalid File",
				description: "Please select a valid .zip backup file.",
			});
		}
	};

	const handleRestoreFromUpload = async () => {
		if (!uploadedFile) return;

		callModal({
			title: (
				<p>
					<span>Restore from File </span>
					<span className="text-primary">{uploadedFile.name}</span>
				</p>
			),
			description:
				"This will overwrite your current data. Make sure to create a backup first!",
			yesAction: () => {
				try {
					// Convert file to base64
					const reader = new FileReader();
					reader.onload = () => {
						const base64Data = reader.result as string;
						const base64String = base64Data.split(",")[1]; // Remove data:application/zip;base64, prefix

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
						title: "Upload Error",
						description: "Failed to process file upload. Please try again.",
					});
				}
			},
		});
	};

	const handleRestoreFromExisting = (fileName: string) => {
		callModal({
			title: (
				<p>
					<span>Restore from Backup </span>
					<span className="text-primary">{fileName}</span>
				</p>
			),
			description:
				"This will overwrite your current data. Make sure to create a backup first!",
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
			<MenuSectionDividerWrapper title="Create Backup">
				<div className="space-y-4">
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<div className="form-control">
							<label className="label cursor-pointer">
								<span className="label-text">Include Database</span>
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
								<span className="label-text">Include ZeroTier Folder</span>
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
							<span className="label-text">Backup Name (optional)</span>
						</label>
						<input
							type="text"
							placeholder="Leave empty for auto-generated name"
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
						className={`btn btn-primary ${creatingBackup ? "loading" : ""}`}
						onClick={handleCreateBackup}
						disabled={
							creatingBackup ||
							(!createBackupOptions.includeDatabase &&
								!createBackupOptions.includeZerotier)
						}
					>
						{creatingBackup ? "Creating Backup..." : "Create & Download Backup"}
					</button>
				</div>
			</MenuSectionDividerWrapper>

			{/* Existing Backups Section */}
			<MenuSectionDividerWrapper title="Existing Backups">
				<div className="space-y-4">
					{backupsLoading ? (
						<div className="flex justify-center">
							<span className="loading loading-spinner loading-md"></span>
						</div>
					) : backups && backups.length > 0 ? (
						<div className="overflow-x-auto">
							<table className="table table-zebra w-full">
								<thead>
									<tr>
										<th>Filename</th>
										<th>Size</th>
										<th>Created</th>
										<th>Actions</th>
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
														Download
													</button>
													<button
														className="btn btn-sm btn-outline btn-success"
														onClick={() => handleRestoreFromExisting(backup.fileName)}
														disabled={restoringBackup}
													>
														Restore
													</button>
													<button
														className={`btn btn-sm btn-outline btn-error ${deletingBackup ? "loading" : ""}`}
														onClick={() => handleDeleteBackup(backup.fileName)}
														disabled={deletingBackup}
													>
														Delete
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
							No backups found. Create your first backup above.
						</div>
					)}
				</div>
			</MenuSectionDividerWrapper>

			{/* Restore from File Section */}
			<MenuSectionDividerWrapper title="Restore from File" className="">
				<div className="space-y-4">
					<div className="alert alert-warning">
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
							<strong>Warning:</strong> Restoring will overwrite your current data. Make
							sure to create a backup first!
						</span>
					</div>

					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<div className="form-control">
							<label className="label cursor-pointer">
								<span className="label-text">Restore Database</span>
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
								<span className="label-text">Restore ZeroTier Folder</span>
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
							<span className="label-text">Select Backup File</span>
						</label>
						<input
							ref={fileInputRef}
							type="file"
							accept=".zip"
							className="file-input file-input-bordered w-full"
							onChange={handleFileUpload}
						/>
					</div>

					{uploadedFile && (
						<div className="alert alert-info">
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
								Selected file: {uploadedFile.name} ({formatFileSize(uploadedFile.size)})
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
						{restoringBackup || uploadingBackup ? "Processing..." : "Restore from File"}
					</button>
				</div>
			</MenuSectionDividerWrapper>

			{/* Information Section */}
			<MenuSectionDividerWrapper title="Information">
				<div className="prose prose-sm max-w-none">
					<h4>About Backups</h4>
					<ul>
						<li>
							<strong>Database:</strong> Includes all network configurations, user data,
							and settings
						</li>
						<li>
							<strong>ZeroTier Folder:</strong> Contains identity files and network
							configurations
						</li>
						<li>
							<strong>Backup Files:</strong> Created as encrypted ZIP archives for
							security
						</li>
					</ul>

					<h4>Restore Process</h4>
					<ul>
						<li>
							The application will temporarily stop ZeroTier services during restore
						</li>
						<li>Current data will be backed up before restoration</li>
						<li>You may need to restart the application after restoration</li>
					</ul>
				</div>
			</MenuSectionDividerWrapper>
		</main>
	);
};

BackupRestore.getLayout = function getLayout(page: ReactElement) {
	return <LayoutAdminAuthenticated>{page}</LayoutAdminAuthenticated>;
};
export default BackupRestore;
