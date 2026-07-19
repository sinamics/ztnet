import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import toast from "react-hot-toast";
import { api } from "~/utils/api";

type LocalConfigDraft = {
	primaryPort: number;
	secondaryPort: string;
	allowSecondaryPort: boolean | null;
	interfacePrefixBlacklist: string;
	bindAddresses: string;
	allowManagementFrom: string;
	defaultBondingPolicy: string;
	multithreaded: boolean | null;
	linuxKernelMode: boolean | null;
};

const defaultDraft: LocalConfigDraft = {
	primaryPort: 9993,
	secondaryPort: "",
	allowSecondaryPort: null,
	interfacePrefixBlacklist: "",
	bindAddresses: "",
	allowManagementFrom: "",
	defaultBondingPolicy: "",
	multithreaded: null,
	linuxKernelMode: null,
};

const listFields: Array<{
	field: "interfacePrefixBlacklist" | "bindAddresses" | "allowManagementFrom";
	label: string;
}> = [
	{ field: "interfacePrefixBlacklist", label: "interfacePrefixBlacklistLabel" },
	{ field: "bindAddresses", label: "bindAddressesLabel" },
	{ field: "allowManagementFrom", label: "allowManagementFromLabel" },
];

function joinList(value?: string[] | null): string {
	return (value || []).join(", ");
}

function splitList(value: string): string[] {
	return Array.from(
		new Set(
			value
				.split(/[,\n]/)
				.map((item) => item.trim())
				.filter(Boolean),
		),
	);
}

function optionalBoolean(value: boolean | null): boolean | null {
	return typeof value === "boolean" ? value : null;
}

export default function LocalZerotierConfig() {
	const t = useTranslations("admin");
	const utils = api.useContext();
	const [expanded, setExpanded] = useState(false);
	const { data, error, isLoading } = api.admin.getLocalZerotierConfig.useQuery();
	const [draft, setDraft] = useState<LocalConfigDraft>(defaultDraft);
	const saveConfig = api.admin.saveLocalZerotierConfig.useMutation({
		onSuccess: async () => {
			toast.success(t("controller.localConfig.toast.saved"));
			await utils.admin.getLocalZerotierConfig.invalidate();
			await utils.admin.getControllerStats.invalidate();
		},
		onError: (mutationError) => toast.error(mutationError.message),
	});

	useEffect(() => {
		if (!data) return;
		setDraft({
			primaryPort: data.primaryPort,
			secondaryPort: data.secondaryPort ? String(data.secondaryPort) : "",
			allowSecondaryPort: data.allowSecondaryPort,
			interfacePrefixBlacklist: joinList(data.interfacePrefixBlacklist),
			bindAddresses: joinList(data.bindAddresses),
			allowManagementFrom: joinList(data.allowManagementFrom),
			defaultBondingPolicy: data.defaultBondingPolicy || "",
			multithreaded: data.multithreaded,
			linuxKernelMode: data.linuxKernelMode,
		});
	}, [data]);

	const saveDisabled = Boolean(error || isLoading || !data?.canWrite);
	const submit = () => {
		if (saveDisabled) return;
		saveConfig.mutate({
			primaryPort: draft.primaryPort,
			secondaryPort: draft.secondaryPort
				? Number.parseInt(draft.secondaryPort, 10)
				: null,
			allowSecondaryPort: optionalBoolean(draft.allowSecondaryPort),
			interfacePrefixBlacklist: splitList(draft.interfacePrefixBlacklist),
			bindAddresses: splitList(draft.bindAddresses),
			allowManagementFrom: splitList(draft.allowManagementFrom),
			defaultBondingPolicy: draft.defaultBondingPolicy.trim() || null,
			multithreaded: optionalBoolean(draft.multithreaded),
			linuxKernelMode: optionalBoolean(draft.linuxKernelMode),
		});
	};

	return (
		<section className="w-full space-y-4 rounded-md border border-base-300 bg-base-100 p-4">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
				<div>
					<h3 className="font-semibold">{t("controller.localConfig.title")}</h3>
					<p className="mt-1 text-sm text-base-content/70">
						{t("controller.localConfig.description")}
					</p>
				</div>
				<button
					type="button"
					className="btn btn-sm btn-primary btn-outline"
					onClick={() => setExpanded((value) => !value)}
					aria-expanded={expanded}
				>
					{t("controller.localConfig.actions.configure")}
				</button>
			</div>

			<div className="alert alert-warning text-sm">
				<span>{t("controller.localConfig.restartHint")}</span>
			</div>

			{error ? (
				<div className="alert alert-error text-sm">
					<span>{error.message}</span>
				</div>
			) : null}
			{data && !data.canWrite ? (
				<div className="alert alert-error text-sm">
					<span>{t("controller.localConfig.readonlyHint")}</span>
				</div>
			) : null}

			<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
				<div className="rounded-md border border-base-300 p-3">
					<p className="text-xs text-base-content/60">
						{t("controller.localConfig.form.primaryPortLabel")}
					</p>
					<p className="font-medium">
						{isLoading ? "..." : (data?.primaryPort ?? draft.primaryPort)}
					</p>
				</div>
				<div className="rounded-md border border-base-300 p-3">
					<p className="text-xs text-base-content/60">
						{t("controller.localConfig.form.allowSecondaryPortLabel")}
					</p>
					<p className="font-medium">
						{data?.allowSecondaryPort
							? t("controller.remoteRoots.values.yes")
							: t("controller.remoteRoots.values.no")}
					</p>
				</div>
				<div className="rounded-md border border-base-300 p-3">
					<p className="text-xs text-base-content/60">
						{t("controller.localConfig.form.bindAddressesLabel")}
					</p>
					<p className="font-medium">{data?.bindAddresses?.length || 0}</p>
				</div>
				<div className="rounded-md border border-base-300 p-3">
					<p className="text-xs text-base-content/60">
						{t("controller.localConfig.form.allowManagementFromLabel")}
					</p>
					<p className="font-medium">{data?.allowManagementFrom?.length || 0}</p>
				</div>
			</div>

			{expanded ? (
				<div className="space-y-4 border-t border-base-300 pt-4">
					<div className="grid gap-4 md:grid-cols-2">
						<label className="form-control">
							<span className="label-text">
								{t("controller.localConfig.form.primaryPortLabel")}
							</span>
							<input
								className="input input-bordered input-sm"
								aria-label={t("controller.localConfig.form.primaryPortLabel")}
								type="number"
								value={draft.primaryPort}
								disabled={isLoading || Boolean(error)}
								onChange={(event) =>
									setDraft({
										...draft,
										primaryPort: Number.parseInt(event.target.value, 10),
									})
								}
							/>
						</label>
						<label className="form-control">
							<span className="label-text">
								{t("controller.localConfig.form.secondaryPortLabel")}
							</span>
							<input
								className="input input-bordered input-sm"
								aria-label={t("controller.localConfig.form.secondaryPortLabel")}
								type="number"
								value={draft.secondaryPort}
								disabled={isLoading || Boolean(error)}
								onChange={(event) =>
									setDraft({ ...draft, secondaryPort: event.target.value })
								}
							/>
						</label>
					</div>

					<div className="grid gap-3 md:grid-cols-3">
						<label className="label cursor-pointer justify-start gap-2">
							<input
								type="checkbox"
								className="checkbox checkbox-sm"
								checked={Boolean(draft.allowSecondaryPort)}
								disabled={isLoading || Boolean(error)}
								onChange={(event) =>
									setDraft({
										...draft,
										allowSecondaryPort: event.target.checked,
									})
								}
							/>
							<span className="label-text">
								{t("controller.localConfig.form.allowSecondaryPortLabel")}
							</span>
						</label>
						<label className="label cursor-pointer justify-start gap-2">
							<input
								type="checkbox"
								className="checkbox checkbox-sm"
								checked={Boolean(draft.multithreaded)}
								disabled={isLoading || Boolean(error)}
								onChange={(event) =>
									setDraft({ ...draft, multithreaded: event.target.checked })
								}
							/>
							<span className="label-text">
								{t("controller.localConfig.form.multithreadedLabel")}
							</span>
						</label>
						<label className="label cursor-pointer justify-start gap-2">
							<input
								type="checkbox"
								className="checkbox checkbox-sm"
								checked={Boolean(draft.linuxKernelMode)}
								disabled={isLoading || Boolean(error)}
								onChange={(event) =>
									setDraft({ ...draft, linuxKernelMode: event.target.checked })
								}
							/>
							<span className="label-text">
								{t("controller.localConfig.form.linuxKernelModeLabel")}
							</span>
						</label>
					</div>

					<div className="grid gap-3">
						{listFields.map(({ field, label }) => (
							<label key={field} className="form-control">
								<span className="label-text">
									{t(`controller.localConfig.form.${label}`)}
								</span>
								<input
									className="input input-bordered input-sm"
									aria-label={t(`controller.localConfig.form.${label}`)}
									value={draft[field]}
									disabled={isLoading || Boolean(error)}
									onChange={(event) =>
										setDraft({ ...draft, [field]: event.target.value })
									}
								/>
							</label>
						))}
						<label className="form-control">
							<span className="label-text">
								{t("controller.localConfig.form.defaultBondingPolicyLabel")}
							</span>
							<input
								className="input input-bordered input-sm"
								aria-label={t("controller.localConfig.form.defaultBondingPolicyLabel")}
								value={draft.defaultBondingPolicy}
								disabled={isLoading || Boolean(error)}
								onChange={(event) =>
									setDraft({ ...draft, defaultBondingPolicy: event.target.value })
								}
							/>
						</label>
					</div>

					{data?.configPath ? (
						<p className="break-all text-xs text-base-content/60">
							{t("controller.localConfig.configPath", {
								path: data.configPath,
							})}
						</p>
					) : null}

					<div className="flex justify-end">
						<button
							type="button"
							className="btn btn-primary"
							onClick={submit}
							disabled={saveConfig.isLoading || saveDisabled}
						>
							{saveConfig.isLoading ? (
								<span className="loading loading-spinner loading-xs" />
							) : null}
							{t("controller.localConfig.actions.save")}
						</button>
					</div>
				</div>
			) : null}
		</section>
	);
}
