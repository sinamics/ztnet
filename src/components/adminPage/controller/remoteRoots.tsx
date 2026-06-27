import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import toast from "react-hot-toast";
import { api } from "~/utils/api";
import {
	formatRemoteRootTaskLogLine,
	remoteRootNodeId,
} from "~/utils/remoteRootTaskLogFormatter";

type RemoteRootForm = {
	name: string;
	host: string;
	sshPort: number;
	sshUser: string;
	endpointSource: "MANUAL_IP" | "DOMAIN";
	domainName: string;
	selectedIps: string[];
	primaryPort: number;
};

type RemoteRootFormErrors = Partial<
	Record<"name" | "host" | "sshUser" | "sshPort" | "domainName" | "primaryPort", string>
>;

type EndpointDraft = {
	selectedIps: string[];
	manualIp: string;
};

type RemoteConfigDraft = {
	primaryPort: number;
	secondaryPort: string;
	allowSecondaryPort: boolean;
	portMappingEnabled: boolean | null;
	interfacePrefixBlacklist: string;
	bindAddresses: string;
	allowManagementFrom: string;
	defaultBondingPolicy: string;
	multithreaded: boolean;
	linuxKernelMode: boolean;
};

const defaultForm: RemoteRootForm = {
	name: "",
	host: "",
	sshPort: 22,
	sshUser: "root",
	endpointSource: "MANUAL_IP",
	domainName: "",
	selectedIps: [],
	primaryPort: 9993,
};

const statusClassName = {
	UNKNOWN: "badge-neutral",
	HEALTHY: "badge-success",
	DEGRADED: "badge-warning",
	OFFLINE: "badge-error",
	ERROR: "badge-error",
};

const splitStatusClassName = {
	UNKNOWN: "badge-neutral",
	CHECKING: "badge-info",
	OK: "badge-success",
	HEALTHY: "badge-success",
	RUNNING: "badge-success",
	ENABLED: "badge-success",
	DEGRADED: "badge-warning",
	DISABLED: "badge-warning",
	STOPPED: "badge-warning",
	FAILED: "badge-error",
	ERROR: "badge-error",
};

const taskClassName = {
	PENDING: "badge-neutral",
	RUNNING: "badge-info",
	SUCCESS: "badge-success",
	FAILED: "badge-error",
};

const toArray = (value: unknown): string[] =>
	Array.isArray(value)
		? value.filter((item): item is string => typeof item === "string")
		: [];

type EndpointCandidate = {
	ip: string;
	source: string;
	port: number;
};

const advancedConfigFields: Array<{
	field: keyof Pick<
		RemoteConfigDraft,
		| "interfacePrefixBlacklist"
		| "bindAddresses"
		| "allowManagementFrom"
		| "defaultBondingPolicy"
	>;
	label: string;
}> = [
	{ field: "interfacePrefixBlacklist", label: "interfacePrefixBlacklistLabel" },
	{ field: "bindAddresses", label: "bindAddressesLabel" },
	{ field: "allowManagementFrom", label: "allowManagementFromLabel" },
	{ field: "defaultBondingPolicy", label: "defaultBondingPolicyLabel" },
];

const toEndpointCandidates = (value: unknown): EndpointCandidate[] =>
	Array.isArray(value)
		? value.filter(
				(item): item is EndpointCandidate =>
					Boolean(item) &&
					typeof item === "object" &&
					typeof (item as EndpointCandidate).ip === "string",
			)
		: [];

const hasRunningHealthTask = (root: {
	tasks?: Array<{ type?: string; status?: string }>;
}) =>
	root.tasks?.some((task) => task.type === "CHECK" && task.status === "RUNNING") ?? false;

const hasRunningHealthChecks = (
	roots: Array<{ tasks?: Array<{ type?: string; status?: string }> }> | undefined,
) => roots?.some(hasRunningHealthTask) ?? false;

const isValidPort = (value: number) =>
	Number.isInteger(value) && value >= 1 && value <= 65535;

const splitList = (value: string): string[] =>
	Array.from(
		new Set(
			value
				.split(/[,\s]+/)
				.map((item) => item.trim())
				.filter(Boolean),
		),
	);

const formatList = (value: unknown): string[] => toArray(value);

const joinList = (value: unknown) => formatList(value).join(", ");

const selectedIpsFromRoot = (root): string[] => {
	const selectedIps = toArray(root?.selectedIps);
	if (selectedIps.length) return selectedIps;
	return root?.selectedIp ? [root.selectedIp] : [];
};

const normalizeStatus = (value: unknown, fallback = "UNKNOWN") =>
	typeof value === "string" && value ? value : fallback;

const RemoteRoots = () => {
	const t = useTranslations("admin");
	const utils = api.useContext();
	const [form, setForm] = useState<RemoteRootForm>(defaultForm);
	const [formErrors, setFormErrors] = useState<RemoteRootFormErrors>({});
	const [resolvedIps, setResolvedIps] = useState<Record<string, string[]>>({});
	const [selectedRootId, setSelectedRootId] = useState<string | null>(null);
	const [endpointDraft, setEndpointDraft] = useState<EndpointDraft>({
		selectedIps: [],
		manualIp: "",
	});
	const [configDraft, setConfigDraft] = useState<RemoteConfigDraft>({
		primaryPort: 9993,
		secondaryPort: "",
		allowSecondaryPort: false,
		portMappingEnabled: null,
		interfacePrefixBlacklist: "",
		bindAddresses: "",
		allowManagementFrom: "",
		defaultBondingPolicy: "",
		multithreaded: false,
		linuxKernelMode: false,
	});

	const { data: rootsData } = api.admin.remoteRoots.list.useQuery(undefined, {
		refetchInterval: (data) => (hasRunningHealthChecks(data) ? 2000 : false),
	});
	const roots = rootsData ?? [];
	const { data: getPlanet } = api.admin.getPlanet.useQuery();
	const selectedRoot = useMemo(
		() => roots.find((root) => root.id === selectedRootId) || null,
		[roots, selectedRootId],
	);
	const selectedRootEndpointId = selectedRoot?.id;
	const selectedRootSelectedIps = useMemo(
		() => selectedIpsFromRoot(selectedRoot),
		[selectedRoot],
	);
	const selectedRootPrimaryPort = selectedRoot?.primaryPort || 9993;

	const invalidate = async () => {
		await utils.admin.remoteRoots.list.invalidate();
		await utils.admin.getPlanet.invalidate();
	};

	const createRoot = api.admin.remoteRoots.create.useMutation({
		onSuccess: async () => {
			setForm(defaultForm);
			toast.success(t("controller.remoteRoots.toast.remoteRootSaved"));
			await invalidate();
		},
		onError: (error) => toast.error(error.message),
	});

	const updateRoot = api.admin.remoteRoots.update.useMutation({
		onSuccess: invalidate,
		onError: (error) => toast.error(error.message),
	});

	const deleteRoot = api.admin.remoteRoots.delete.useMutation({
		onSuccess: async () => {
			setSelectedRootId(null);
			await invalidate();
		},
		onError: (error) => toast.error(error.message),
	});

	const testSsh = api.admin.remoteRoots.testSsh.useMutation({
		onSuccess: async () => {
			toast.success(t("controller.remoteRoots.toast.sshSucceeded"));
			await invalidate();
		},
		onError: (error) => toast.error(error.message),
	});

	const installZerotier = api.admin.remoteRoots.installZerotier.useMutation({
		onSuccess: async () => {
			toast.success(t("controller.remoteRoots.toast.installCompleted"));
			await invalidate();
		},
		onError: (error) => toast.error(error.message),
	});

	const upgradeZerotier = api.admin.remoteRoots.upgradeZerotier.useMutation({
		onSuccess: async () => {
			toast.success(t("controller.remoteRoots.toast.upgradeCompleted"));
			await invalidate();
		},
		onError: (error) => toast.error(error.message),
	});

	const restartZerotier = api.admin.remoteRoots.restartZerotier.useMutation({
		onSuccess: async () => {
			toast.success(t("controller.remoteRoots.toast.restartCompleted"));
			await invalidate();
		},
		onError: (error) => toast.error(error.message),
	});

	const saveRemoteConfig = api.admin.remoteRoots.saveRemoteConfig.useMutation({
		onSuccess: async () => {
			toast.success(t("controller.remoteRoots.toast.configSaved"));
			await invalidate();
		},
		onError: (error) => toast.error(error.message),
	});

	const changeZerotierPort = api.admin.remoteRoots.changeZerotierPort.useMutation({
		onSuccess: async () => {
			toast.success(t("controller.remoteRoots.toast.portChanged"));
			await invalidate();
		},
		onError: (error) => toast.error(error.message),
	});

	const distributePlanet = api.admin.remoteRoots.distributePlanet.useMutation({
		onSuccess: async () => {
			toast.success(t("controller.remoteRoots.toast.planetDistributed"));
			await invalidate();
		},
		onError: (error) => toast.error(error.message),
	});

	const restoreOfficialPlanet = api.admin.remoteRoots.restoreOfficialPlanet.useMutation({
		onSuccess: async () => {
			toast.success(t("controller.remoteRoots.toast.officialPlanetRestored"));
			await invalidate();
		},
		onError: (error) => toast.error(error.message),
	});

	const readConfig = api.admin.remoteRoots.readRemoteConfig.useMutation({
		onSuccess: async () => {
			toast.success(t("controller.remoteRoots.toast.remoteConfigRead"));
			await invalidate();
		},
		onError: (error) => toast.error(error.message),
	});

	const checkHealth = api.admin.remoteRoots.checkHealth.useMutation({
		onSuccess: async () => {
			toast.success(t("controller.remoteRoots.toast.healthCheckStarted"));
			await invalidate();
		},
		onError: (error) => toast.error(error.message),
	});

	const resolveDomain = api.admin.remoteRoots.resolveDomain.useMutation({
		onSuccess: (result) => {
			if (selectedRootId) {
				setResolvedIps((prev) => ({ ...prev, [selectedRootId]: result.resolvedIps }));
			}
			if (result.resolvedIps.length === 0) {
				toast.error(t("controller.remoteRoots.toast.noDnsRecords"));
			}
		},
		onError: (error) => toast.error(error.message),
	});

	const buildEntries = api.admin.remoteRoots.buildPlanetRootEntries.useMutation();
	const makeWorld = api.admin.makeWorld.useMutation({
		onSuccess: async () => {
			toast.success(t("controller.remoteRoots.toast.customPlanetUpdated"));
			await invalidate();
		},
		onError: (error) => toast.error(error.message),
	});

	const appendRemoteRootsToPlanet = async () => {
		const entries = await buildEntries.mutateAsync({});
		if (!entries.length) {
			toast.error(t("controller.remoteRoots.toast.noHealthyRoots"));
			return;
		}

		await makeWorld.mutateAsync({
			plRecommend: getPlanet?.plRecommend ?? true,
			plBirth: Number(getPlanet?.plBirth) || Date.now(),
			plID: Number(getPlanet?.plID) || Math.floor(Math.random() * 2 ** 32),
			rootNodes: [...(getPlanet?.rootNodes || []), ...entries],
		});
	};

	const openDetails = (root) => {
		setSelectedRootId(root.id);
		setEndpointDraft({
			selectedIps: selectedIpsFromRoot(root),
			manualIp: "",
		});
		setConfigDraft({
			primaryPort: root.primaryPort || 9993,
			secondaryPort: root.secondaryPort ? String(root.secondaryPort) : "",
			allowSecondaryPort: Boolean(root.allowSecondaryPort),
			portMappingEnabled:
				typeof root.portMappingEnabled === "boolean" ? root.portMappingEnabled : null,
			interfacePrefixBlacklist: joinList(root.interfacePrefixBlacklist),
			bindAddresses: joinList(root.bindAddresses),
			allowManagementFrom: joinList(root.allowManagementFrom),
			defaultBondingPolicy: root.defaultBondingPolicy || "",
			multithreaded: Boolean(root.multithreaded),
			linuxKernelMode: Boolean(root.linuxKernelMode),
		});
	};

	useEffect(() => {
		if (!selectedRootEndpointId) return;
		setEndpointDraft({
			selectedIps: selectedRootSelectedIps,
			manualIp: "",
		});
		setConfigDraft({
			primaryPort: selectedRootPrimaryPort,
			secondaryPort: selectedRoot?.secondaryPort
				? String(selectedRoot.secondaryPort)
				: "",
			allowSecondaryPort: Boolean(selectedRoot?.allowSecondaryPort),
			portMappingEnabled:
				typeof selectedRoot?.portMappingEnabled === "boolean"
					? selectedRoot.portMappingEnabled
					: null,
			interfacePrefixBlacklist: joinList(selectedRoot?.interfacePrefixBlacklist),
			bindAddresses: joinList(selectedRoot?.bindAddresses),
			allowManagementFrom: joinList(selectedRoot?.allowManagementFrom),
			defaultBondingPolicy: selectedRoot?.defaultBondingPolicy || "",
			multithreaded: Boolean(selectedRoot?.multithreaded),
			linuxKernelMode: Boolean(selectedRoot?.linuxKernelMode),
		});
	}, [
		selectedRootEndpointId,
		selectedRootSelectedIps,
		selectedRootPrimaryPort,
		selectedRoot,
	]);

	const setFormField = <Field extends keyof RemoteRootForm>(
		field: Field,
		value: RemoteRootForm[Field],
	) => {
		setForm((prev) => ({ ...prev, [field]: value }));
		setFormErrors((prev) => {
			const { [field]: _removed, ...rest } = prev;
			return rest;
		});
	};

	const validateForm = () => {
		const nextErrors: RemoteRootFormErrors = {};
		const payload = {
			...form,
			name: form.name.trim(),
			host: form.host.trim(),
			sshUser: form.sshUser.trim(),
			domainName: form.domainName.trim() || null,
			selectedIp: null,
			selectedIps: form.selectedIps,
		};

		if (!payload.name) nextErrors.name = t("controller.remoteRoots.form.errors.required");
		if (!payload.host) nextErrors.host = t("controller.remoteRoots.form.errors.required");
		if (!payload.sshUser) {
			nextErrors.sshUser = t("controller.remoteRoots.form.errors.required");
		}
		if (!isValidPort(payload.sshPort)) {
			nextErrors.sshPort = t("controller.remoteRoots.form.errors.portRange");
		}
		if (!isValidPort(payload.primaryPort)) {
			nextErrors.primaryPort = t("controller.remoteRoots.form.errors.portRange");
		}
		if (payload.endpointSource === "DOMAIN" && !payload.domainName) {
			nextErrors.domainName = t("controller.remoteRoots.form.errors.domainRequired");
		}

		setFormErrors(nextErrors);
		return Object.keys(nextErrors).length ? null : payload;
	};

	const saveEndpoint = () => {
		if (!selectedRoot || !canEditRemoteConfig) return;
		const selectedIps = Array.from(new Set(endpointDraft.selectedIps));
		updateRoot.mutate({
			id: selectedRoot.id,
			selectedIp: selectedIps[0] || null,
			selectedIps,
		});
	};

	const addManualEndpoint = () => {
		if (!canEditRemoteConfig) return;
		const value = endpointDraft.manualIp.trim();
		if (!value) return;
		setEndpointDraft((prev) => ({
			selectedIps: Array.from(new Set([...prev.selectedIps, value])),
			manualIp: "",
		}));
	};

	const toggleEndpoint = (ip: string) => {
		if (!canEditRemoteConfig) return;
		setEndpointDraft((prev) => ({
			...prev,
			selectedIps: prev.selectedIps.includes(ip)
				? prev.selectedIps.filter((item) => item !== ip)
				: [...prev.selectedIps, ip],
		}));
	};

	const saveRemoteZeroTierConfig = () => {
		if (!selectedRoot || !canEditRemoteConfig) return;
		const secondaryPort = configDraft.secondaryPort.trim()
			? Number.parseInt(configDraft.secondaryPort, 10)
			: null;
		saveRemoteConfig.mutate({
			nodeId: selectedRoot.id,
			primaryPort: configDraft.primaryPort,
			secondaryPort,
			allowSecondaryPort: configDraft.allowSecondaryPort,
			interfacePrefixBlacklist: splitList(configDraft.interfacePrefixBlacklist),
			bindAddresses: splitList(configDraft.bindAddresses),
			allowManagementFrom: splitList(configDraft.allowManagementFrom),
			defaultBondingPolicy: configDraft.defaultBondingPolicy.trim() || null,
			multithreaded: configDraft.multithreaded,
			linuxKernelMode: configDraft.linuxKernelMode,
		});
	};

	const statusLabel = (
		group: "ssh" | "panel" | "planet" | "startup" | "service",
		value: unknown,
	) => t(`controller.remoteRoots.status.${group}.${normalizeStatus(value)}`);

	const copyPublicKey = async () => {
		if (!credentialText) return;
		await navigator.clipboard?.writeText(credentialText);
		toast.success(t("controller.remoteRoots.tasks.publicKeyCopied"));
	};

	if (!getPlanet?.id) {
		return null;
	}

	const endpointCandidates = selectedRoot
		? [
				...toEndpointCandidates(selectedRoot.endpointCandidates),
				...toArray(selectedRoot.resolvedIps).map((ip) => ({
					ip,
					source: "DNS",
					port: selectedRoot.primaryPort,
				})),
				...(resolvedIps[selectedRoot.id] || []).map((ip) => ({
					ip,
					source: "DNS",
					port: selectedRoot.primaryPort,
				})),
				...selectedIpsFromRoot(selectedRoot).map((ip) => ({
					ip,
					source: "SELECTED",
					port: selectedRoot.primaryPort,
				})),
			].filter(
				(candidate, index, all) =>
					all.findIndex(
						(item) => item.ip === candidate.ip && item.source === candidate.source,
					) === index,
			)
		: [];
	const credentialText = selectedRoot ? selectedRoot.credential?.publicKey : null;
	const nodeId = remoteRootNodeId(selectedRoot?.identity);
	const errorMessages = selectedRoot
		? Array.from(
				new Set(
					[selectedRoot.sshLastError, selectedRoot.panelLastError, selectedRoot.lastError]
						.filter((item): item is string => Boolean(item))
						.map((item) => item.trim()),
				),
			)
		: [];
	const remoteConfigDisabledReason = selectedRoot
		? !selectedRoot.lastReadAt
			? t("controller.remoteRoots.form.readRequired")
			: normalizeStatus(selectedRoot.sshStatus) === "FAILED"
				? t("controller.remoteRoots.form.sshFailedReadRequired")
				: !selectedRoot.zerotierInstalled
					? t("controller.remoteRoots.form.zerotierInstallRequired")
					: null
		: null;
	const canEditRemoteConfig = Boolean(selectedRoot && !remoteConfigDisabledReason);
	const busy =
		testSsh.isLoading ||
		installZerotier.isLoading ||
		upgradeZerotier.isLoading ||
		restartZerotier.isLoading ||
		changeZerotierPort.isLoading ||
		saveRemoteConfig.isLoading ||
		distributePlanet.isLoading ||
		restoreOfficialPlanet.isLoading ||
		readConfig.isLoading ||
		checkHealth.isLoading ||
		updateRoot.isLoading ||
		resolveDomain.isLoading;

	return (
		<div className="overflow-x-auto w-full space-y-5">
			<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<p className="text-sm text-gray-500">
						{t("controller.remoteRoots.description")}
					</p>
				</div>
				<button
					type="button"
					className="btn btn-sm btn-primary btn-outline"
					onClick={appendRemoteRootsToPlanet}
					disabled={makeWorld.isLoading || buildEntries.isLoading || roots.length === 0}
				>
					{makeWorld.isLoading || buildEntries.isLoading ? (
						<span className="loading loading-spinner loading-xs" />
					) : null}
					{t("controller.remoteRoots.actions.appendHealthyRoots")}
				</button>
			</div>

			<form
				className="grid grid-cols-1 gap-3 lg:grid-cols-6"
				onSubmit={(event) => {
					event.preventDefault();
					const payload = validateForm();
					if (!payload) return;
					createRoot.mutate(payload);
				}}
			>
				<label className="form-control">
					<input
						className={`input input-sm input-bordered ${formErrors.name ? "input-error" : ""}`}
						placeholder={t("controller.remoteRoots.form.namePlaceholder")}
						value={form.name}
						onChange={(event) => setFormField("name", event.target.value)}
					/>
					{formErrors.name ? (
						<span className="label-text-alt text-error">{formErrors.name}</span>
					) : null}
				</label>
				<label className="form-control">
					<input
						className={`input input-sm input-bordered ${formErrors.host ? "input-error" : ""}`}
						placeholder={t("controller.remoteRoots.form.hostPlaceholder")}
						value={form.host}
						onChange={(event) => setFormField("host", event.target.value)}
					/>
					{formErrors.host ? (
						<span className="label-text-alt text-error">{formErrors.host}</span>
					) : null}
				</label>
				<label className="form-control">
					<input
						className={`input input-sm input-bordered ${formErrors.sshUser ? "input-error" : ""}`}
						placeholder={t("controller.remoteRoots.form.sshUserPlaceholder")}
						value={form.sshUser}
						onChange={(event) => setFormField("sshUser", event.target.value)}
					/>
					{formErrors.sshUser ? (
						<span className="label-text-alt text-error">{formErrors.sshUser}</span>
					) : null}
				</label>
				<label className="form-control">
					<input
						className={`input input-sm input-bordered ${formErrors.sshPort ? "input-error" : ""}`}
						type="number"
						placeholder={t("controller.remoteRoots.form.sshPortPlaceholder")}
						value={Number.isNaN(form.sshPort) ? "" : form.sshPort}
						onChange={(event) =>
							setFormField("sshPort", Number.parseInt(event.target.value, 10))
						}
					/>
					{formErrors.sshPort ? (
						<span className="label-text-alt text-error">{formErrors.sshPort}</span>
					) : null}
				</label>
				<label className="form-control">
					<select
						className={`select select-sm select-bordered ${formErrors.domainName ? "select-error" : ""}`}
						value={form.endpointSource}
						onChange={(event) =>
							setFormField(
								"endpointSource",
								event.target.value as RemoteRootForm["endpointSource"],
							)
						}
					>
						<option value="MANUAL_IP">
							{t("controller.remoteRoots.form.endpointSource.manualIp")}
						</option>
						<option value="DOMAIN">
							{t("controller.remoteRoots.form.endpointSource.domain")}
						</option>
					</select>
				</label>
				{form.endpointSource === "DOMAIN" ? (
					<label className="form-control">
						<input
							className={`input input-sm input-bordered ${formErrors.domainName ? "input-error" : ""}`}
							placeholder={t("controller.remoteRoots.form.domainNamePlaceholder")}
							value={form.domainName}
							onChange={(event) => setFormField("domainName", event.target.value)}
						/>
						{formErrors.domainName ? (
							<span className="label-text-alt text-error">{formErrors.domainName}</span>
						) : null}
					</label>
				) : null}
				<button
					type="submit"
					className="btn btn-sm btn-primary"
					disabled={createRoot.isLoading}
				>
					{createRoot.isLoading ? (
						<span className="loading loading-spinner loading-xs" />
					) : null}
					{t("controller.remoteRoots.form.addRoot")}
				</button>
			</form>

			{roots.length === 0 ? (
				<div className="rounded-md border border-dashed border-base-300 p-6 text-center">
					<h4 className="font-medium">{t("controller.remoteRoots.table.emptyTitle")}</h4>
					<p className="mt-1 text-sm text-gray-500">
						{t("controller.remoteRoots.table.emptyDescription")}
					</p>
				</div>
			) : (
				<div className="overflow-x-auto w-full">
					<div className="inline-block">
						<div className="overflow-hidden rounded-lg border w-full">
							<table className="table table-sm w-full min-w-[920px]">
								<thead>
									<tr>
										<th>{t("controller.remoteRoots.table.name")}</th>
										<th>{t("controller.remoteRoots.table.host")}</th>
										<th>{t("controller.remoteRoots.table.endpoint")}</th>
										<th>{t("controller.remoteRoots.table.status")}</th>
										<th>{t("controller.remoteRoots.table.lastCheck")}</th>
										<th>{t("controller.remoteRoots.table.actions")}</th>
									</tr>
								</thead>
								<tbody>
									{roots.map((root) => (
										<tr key={root.id}>
											<td className="font-medium">{root.name}</td>
											<td>
												{root.sshUser}@{root.host}:{root.sshPort}
												{root.domainName ? (
													<div className="text-xs text-gray-500">{root.domainName}</div>
												) : null}
											</td>
											<td>
												<div className="flex max-w-md flex-wrap gap-1">
													{selectedIpsFromRoot(root).length ? (
														selectedIpsFromRoot(root).map((ip) => (
															<span key={ip} className="badge badge-outline">
																{ip}/{root.primaryPort}
															</span>
														))
													) : (
														<span className="text-xs text-gray-500">
															{t("controller.remoteRoots.table.endpointNotSelected")}
														</span>
													)}
												</div>
											</td>
											<td>
												<div className="flex flex-wrap items-center gap-2">
													<span className={`badge ${statusClassName[root.status]}`}>
														{root.status}
													</span>
													<span
														className={`badge ${splitStatusClassName[normalizeStatus(root.sshStatus)]}`}
													>
														{statusLabel("ssh", root.sshStatus)}
													</span>
													<span
														className={`badge ${splitStatusClassName[normalizeStatus(root.panelStatus)]}`}
													>
														{statusLabel("panel", root.panelStatus)}
													</span>
													{hasRunningHealthTask(root) ? (
														<span className="badge badge-info gap-1">
															<span className="loading loading-spinner loading-xs" />
															{t("controller.remoteRoots.table.checking")}
														</span>
													) : null}
												</div>
											</td>
											<td className="text-xs text-gray-500">
												{root.lastCheckAt
													? new Date(root.lastCheckAt).toLocaleString()
													: t("controller.remoteRoots.table.neverChecked")}
											</td>
											<td>
												<button
													type="button"
													className="btn btn-xs btn-outline"
													onClick={() => openDetails(root)}
												>
													{t("controller.remoteRoots.row.actions.details")}
												</button>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</div>
				</div>
			)}

			{selectedRoot ? (
				<div
					className="modal modal-open"
					role="dialog"
					aria-modal="true"
					aria-label={selectedRoot.name}
				>
					<div className="modal-box max-w-4xl">
						<div className="flex items-start justify-between gap-4">
							<div>
								<h3 className="text-lg font-semibold">{selectedRoot.name}</h3>
								<p className="text-sm text-gray-500">
									{selectedRoot.sshUser}@{selectedRoot.host}:{selectedRoot.sshPort}
								</p>
							</div>
							<button
								type="button"
								className="btn btn-sm btn-circle btn-ghost"
								onClick={() => setSelectedRootId(null)}
								aria-label={t("controller.remoteRoots.actions.close")}
							>
								x
							</button>
						</div>

						<div className="mt-5 grid gap-4 lg:grid-cols-2">
							<div className="space-y-4">
								<section className="space-y-3 rounded-md border border-base-300 p-3">
									<h4 className="text-sm font-medium">
										{t("controller.remoteRoots.sections.connection")}
									</h4>
									<p className="text-xs text-gray-500">
										{selectedRoot.sshUser}@{selectedRoot.host}:{selectedRoot.sshPort}
									</p>
								</section>

								<section className="space-y-3 rounded-md border border-base-300 p-3">
									<div className="flex items-center justify-between gap-3">
										<h4 className="text-sm font-medium">
											{t("controller.remoteRoots.sections.zerotier")}
										</h4>
										<span className="badge badge-outline">
											{statusLabel("service", selectedRoot.serviceStatus)}
										</span>
									</div>
									<div className="grid gap-2 text-xs text-gray-500 sm:grid-cols-2">
										<span>
											{t("controller.remoteRoots.table.installed")}:{" "}
											{selectedRoot.zerotierInstalled
												? t("controller.remoteRoots.values.yes")
												: t("controller.remoteRoots.values.no")}
										</span>
										<span>
											{t("controller.remoteRoots.table.version", {
												version: selectedRoot.zerotierVersion || "unknown",
											})}
										</span>
										<span>{statusLabel("startup", selectedRoot.startupStatus)}</span>
										<span>
											{t("controller.remoteRoots.table.portMapping")}:{" "}
											{configDraft.portMappingEnabled === null
												? t("controller.remoteRoots.status.config.UNKNOWN")
												: configDraft.portMappingEnabled
													? t("controller.remoteRoots.values.yes")
													: t("controller.remoteRoots.values.no")}
										</span>
									</div>
									{selectedRoot.lastReadAt ? (
										<p className="text-xs text-gray-500">
											{t("controller.remoteRoots.form.configReadAt", {
												time: new Date(selectedRoot.lastReadAt).toLocaleString(),
											})}
										</p>
									) : null}
									{remoteConfigDisabledReason ? (
										<div className="alert alert-warning py-2 text-sm">
											<span>{remoteConfigDisabledReason}</span>
										</div>
									) : (
										<p className="text-xs text-gray-500">
											{t("controller.remoteRoots.form.configSnapshotHint")}
										</p>
									)}
									<div className="grid gap-3 sm:grid-cols-2">
										<label className="form-control">
											<span className="label-text">
												{t("controller.remoteRoots.form.primaryPortLabel")}
											</span>
											<input
												className="input input-sm input-bordered"
												aria-label={t("controller.remoteRoots.form.primaryPortLabel")}
												type="number"
												value={configDraft.primaryPort}
												disabled={!canEditRemoteConfig}
												onChange={(event) =>
													setConfigDraft({
														...configDraft,
														primaryPort: Number.parseInt(event.target.value, 10),
													})
												}
											/>
										</label>
										<label className="form-control">
											<span className="label-text">
												{t("controller.remoteRoots.form.secondaryPortLabel")}
											</span>
											<input
												className="input input-sm input-bordered"
												aria-label={t("controller.remoteRoots.form.secondaryPortLabel")}
												type="number"
												value={configDraft.secondaryPort}
												disabled={!canEditRemoteConfig}
												onChange={(event) =>
													setConfigDraft({
														...configDraft,
														secondaryPort: event.target.value,
													})
												}
											/>
										</label>
										<label className="label cursor-pointer justify-start gap-2">
											<input
												type="checkbox"
												className="checkbox checkbox-sm"
												checked={configDraft.allowSecondaryPort}
												disabled={!canEditRemoteConfig}
												onChange={(event) =>
													setConfigDraft({
														...configDraft,
														allowSecondaryPort: event.target.checked,
													})
												}
											/>
											<span className="label-text">
												{t("controller.remoteRoots.form.allowSecondaryPortLabel")}
											</span>
										</label>
										<label className="label cursor-pointer justify-start gap-2">
											<input
												type="checkbox"
												className="checkbox checkbox-sm"
												checked={configDraft.multithreaded}
												disabled={!canEditRemoteConfig}
												onChange={(event) =>
													setConfigDraft({
														...configDraft,
														multithreaded: event.target.checked,
													})
												}
											/>
											<span className="label-text">
												{t("controller.remoteRoots.form.multithreadedLabel")}
											</span>
										</label>
										<label className="label cursor-pointer justify-start gap-2">
											<input
												type="checkbox"
												className="checkbox checkbox-sm"
												checked={configDraft.linuxKernelMode}
												disabled={!canEditRemoteConfig}
												onChange={(event) =>
													setConfigDraft({
														...configDraft,
														linuxKernelMode: event.target.checked,
													})
												}
											/>
											<span className="label-text">
												{t("controller.remoteRoots.form.linuxKernelModeLabel")}
											</span>
										</label>
									</div>
									<div className="grid gap-3">
										{advancedConfigFields.map(({ field, label }) => (
											<label key={field} className="form-control">
												<span className="label-text">
													{t(`controller.remoteRoots.form.${label}`)}
												</span>
												<input
													className="input input-sm input-bordered"
													value={configDraft[field]}
													disabled={!canEditRemoteConfig}
													onChange={(event) =>
														setConfigDraft({
															...configDraft,
															[field]: event.target.value,
														})
													}
												/>
											</label>
										))}
									</div>
									<div className="flex flex-wrap gap-2">
										<button
											type="button"
											className="btn btn-sm"
											onClick={() => installZerotier.mutate({ nodeId: selectedRoot.id })}
											disabled={installZerotier.isLoading}
										>
											{installZerotier.isLoading ? (
												<span className="loading loading-spinner loading-xs" />
											) : null}
											{t("controller.remoteRoots.row.actions.install")}
										</button>
										<button
											type="button"
											className="btn btn-sm"
											onClick={() => upgradeZerotier.mutate({ nodeId: selectedRoot.id })}
											disabled={upgradeZerotier.isLoading}
										>
											{upgradeZerotier.isLoading ? (
												<span className="loading loading-spinner loading-xs" />
											) : null}
											{t("controller.remoteRoots.row.actions.upgrade")}
										</button>
										<button
											type="button"
											className="btn btn-sm"
											onClick={() => restartZerotier.mutate({ nodeId: selectedRoot.id })}
											disabled={
												restartZerotier.isLoading || !selectedRoot.zerotierInstalled
											}
										>
											{restartZerotier.isLoading ? (
												<span className="loading loading-spinner loading-xs" />
											) : null}
											{t("controller.remoteRoots.row.actions.restart")}
										</button>
										<button
											type="button"
											className="btn btn-sm btn-primary"
											onClick={saveRemoteZeroTierConfig}
											disabled={saveRemoteConfig.isLoading || !canEditRemoteConfig}
										>
											{saveRemoteConfig.isLoading ? (
												<span className="loading loading-spinner loading-xs" />
											) : null}
											{t("controller.remoteRoots.row.actions.saveConfig")}
										</button>
									</div>
								</section>

								<section className="space-y-3 rounded-md border border-base-300 p-3">
									<h4 className="text-sm font-medium">
										{t("controller.remoteRoots.sections.endpoint")}
									</h4>
									<div className="flex flex-wrap gap-2">
										{endpointDraft.selectedIps.length ? (
											endpointDraft.selectedIps.map((ip) => (
												<button
													type="button"
													key={ip}
													className="badge badge-primary gap-1"
													onClick={() => toggleEndpoint(ip)}
													disabled={!canEditRemoteConfig}
												>
													{ip}/{configDraft.primaryPort}
													<span aria-hidden="true">x</span>
												</button>
											))
										) : (
											<p className="text-xs text-warning">
												{t("controller.remoteRoots.table.endpointNotSelected")}
											</p>
										)}
									</div>
									<div className="grid gap-3 sm:grid-cols-[1fr_auto]">
										<label className="form-control">
											<span className="label-text">
												{t("controller.remoteRoots.form.selectedIpLabel")}
											</span>
											<input
												className="input input-sm input-bordered"
												aria-label={t("controller.remoteRoots.form.selectedIpLabel")}
												placeholder={t(
													"controller.remoteRoots.form.selectedIpPlaceholder",
												)}
												value={endpointDraft.manualIp}
												disabled={!canEditRemoteConfig}
												onChange={(event) =>
													setEndpointDraft({
														...endpointDraft,
														manualIp: event.target.value,
													})
												}
											/>
										</label>
										<button
											type="button"
											className="btn btn-sm btn-outline self-end"
											onClick={addManualEndpoint}
											disabled={!canEditRemoteConfig}
										>
											{t("controller.remoteRoots.row.actions.addEndpoint")}
										</button>
									</div>
									<div className="flex flex-wrap gap-2">
										{endpointCandidates.map((candidate) => (
											<button
												type="button"
												key={`${candidate.source}:${candidate.ip}`}
												className={`badge ${
													endpointDraft.selectedIps.includes(candidate.ip)
														? "badge-primary"
														: "badge-outline"
												}`}
												onClick={() => toggleEndpoint(candidate.ip)}
												disabled={!canEditRemoteConfig}
											>
												{candidate.ip}
												<span className="ml-1 opacity-70">{candidate.source}</span>
											</button>
										))}
									</div>
									<div className="flex flex-wrap gap-2">
										<button
											type="button"
											className="btn btn-sm btn-primary"
											onClick={saveEndpoint}
											disabled={updateRoot.isLoading || !canEditRemoteConfig}
										>
											{updateRoot.isLoading ? (
												<span className="loading loading-spinner loading-xs" />
											) : null}
											{t("controller.remoteRoots.actions.saveEndpoint")}
										</button>
										{selectedRoot.domainName ? (
											<button
												type="button"
												className="btn btn-sm btn-outline"
												onClick={() =>
													resolveDomain.mutate({ domainName: selectedRoot.domainName })
												}
												disabled={resolveDomain.isLoading}
											>
												{resolveDomain.isLoading ? (
													<span className="loading loading-spinner loading-xs" />
												) : null}
												{t("controller.remoteRoots.row.actions.dns")}
											</button>
										) : null}
									</div>
								</section>
							</div>

							<div className="space-y-3 rounded-md border border-base-300 p-3">
								<h4 className="text-sm font-medium">
									{t("controller.remoteRoots.sections.planet")}
								</h4>
								<div className="flex flex-wrap items-center gap-2">
									<span className={`badge ${statusClassName[selectedRoot.status]}`}>
										{selectedRoot.status}
									</span>
									<span
										className={`badge ${splitStatusClassName[normalizeStatus(selectedRoot.sshStatus)]}`}
									>
										{statusLabel("ssh", selectedRoot.sshStatus)}
									</span>
									<span
										className={`badge ${splitStatusClassName[normalizeStatus(selectedRoot.panelStatus)]}`}
									>
										{statusLabel("panel", selectedRoot.panelStatus)}
									</span>
									<span className="badge badge-outline">
										{statusLabel("planet", selectedRoot.planetStatus)}
									</span>
									{hasRunningHealthTask(selectedRoot) ? (
										<span className="badge badge-info gap-1">
											<span className="loading loading-spinner loading-xs" />
											{t("controller.remoteRoots.table.checking")}
										</span>
									) : null}
									{busy ? <span className="loading loading-spinner loading-sm" /> : null}
								</div>
								{errorMessages.map((message) => (
									<p key={message} className="text-sm text-error">
										{message}
									</p>
								))}
								<p className="text-xs text-gray-500">
									{nodeId
										? `Node ID ${nodeId}`
										: t("controller.remoteRoots.table.identityNotRead")}
								</p>
								{selectedRoot.zerotierVersion ? (
									<p className="text-xs text-gray-500">
										{t("controller.remoteRoots.table.version", {
											version: selectedRoot.zerotierVersion,
										})}
									</p>
								) : null}
								<div className="flex flex-wrap gap-2">
									<button
										type="button"
										className="btn btn-sm btn-primary"
										onClick={() => distributePlanet.mutate({ nodeId: selectedRoot.id })}
										disabled={distributePlanet.isLoading || !canEditRemoteConfig}
									>
										{distributePlanet.isLoading ? (
											<span className="loading loading-spinner loading-xs" />
										) : null}
										{t("controller.remoteRoots.row.actions.distributePlanet")}
									</button>
									<button
										type="button"
										className="btn btn-sm btn-outline"
										onClick={() =>
											restoreOfficialPlanet.mutate({ nodeId: selectedRoot.id })
										}
										disabled={restoreOfficialPlanet.isLoading}
									>
										{restoreOfficialPlanet.isLoading ? (
											<span className="loading loading-spinner loading-xs" />
										) : null}
										{t("controller.remoteRoots.row.actions.restoreOfficial")}
									</button>
								</div>
							</div>
						</div>

						<div className="mt-5 flex flex-wrap gap-2">
							<button
								type="button"
								className="btn btn-sm"
								onClick={() => testSsh.mutate({ nodeId: selectedRoot.id })}
								disabled={testSsh.isLoading}
							>
								{t("controller.remoteRoots.row.actions.test")}
							</button>
							<button
								type="button"
								className="btn btn-sm"
								onClick={() => readConfig.mutate({ nodeId: selectedRoot.id })}
								disabled={readConfig.isLoading}
							>
								{t("controller.remoteRoots.row.actions.read")}
							</button>
							<button
								type="button"
								className="btn btn-sm btn-primary"
								onClick={() => checkHealth.mutate({ nodeId: selectedRoot.id })}
								disabled={checkHealth.isLoading}
							>
								{checkHealth.isLoading ? (
									<span className="loading loading-spinner loading-xs" />
								) : null}
								{t("controller.remoteRoots.row.actions.check")}
							</button>
							<button
								type="button"
								className="btn btn-sm btn-error btn-outline"
								onClick={() => deleteRoot.mutate({ id: selectedRoot.id })}
								disabled={deleteRoot.isLoading}
							>
								{t("controller.remoteRoots.row.actions.delete")}
							</button>
						</div>

						{credentialText ? (
							<section className="mt-4 space-y-2 rounded-md border border-base-300 p-3">
								<div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
									<div>
										<h4 className="text-sm font-medium">
											{t("controller.remoteRoots.tasks.publicKeyTitle")}
										</h4>
										<p className="text-xs text-gray-500">
											{t("controller.remoteRoots.tasks.publicKeyDescription")}
										</p>
									</div>
									<button
										type="button"
										className="btn btn-xs btn-outline"
										onClick={copyPublicKey}
									>
										{t("controller.remoteRoots.tasks.copyPublicKey")}
									</button>
								</div>
								<textarea
									className="textarea textarea-bordered textarea-sm w-full font-mono text-xs"
									readOnly
									value={credentialText}
								/>
							</section>
						) : null}

						{selectedRoot.tasks?.length ? (
							<div className="mt-4 space-y-2">
								<h4 className="text-sm font-medium">
									{t("controller.remoteRoots.tasks.title")}
								</h4>
								{selectedRoot.tasks.map((task) => (
									<div key={task.id} className="rounded-md border border-base-300 p-3">
										<div className="flex items-center justify-between gap-3">
											<span className="text-sm font-medium">{task.type}</span>
											<span className={`badge ${taskClassName[task.status]}`}>
												{task.status}
											</span>
										</div>
										<ul className="mt-2 space-y-1 text-xs text-gray-500">
											{toArray(task.logs).length ? (
												toArray(task.logs).map((line, index) => (
													<li key={`${task.id}:${index}`}>
														{formatRemoteRootTaskLogLine(line)}
													</li>
												))
											) : (
												<li>{t("controller.remoteRoots.tasks.noLogs")}</li>
											)}
										</ul>
									</div>
								))}
							</div>
						) : null}
					</div>
					<button
						type="button"
						className="modal-backdrop"
						onClick={() => setSelectedRootId(null)}
						aria-label={t("controller.remoteRoots.actions.close")}
					/>
				</div>
			) : null}
		</div>
	);
};

export default RemoteRoots;
