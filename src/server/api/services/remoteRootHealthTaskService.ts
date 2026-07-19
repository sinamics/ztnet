import { decryptRemoteRootPrivateKey } from "./remoteRootCredentialService";
import { checkRemoteRootHealth } from "./remoteRootHealthService";

type EnqueueInput = {
	prisma;
	nodeId: string;
	runTask?: (input: {
		prisma;
		nodeId: string;
		taskId: string;
	}) => Promise<unknown>;
};

type RunTaskInput = {
	prisma;
	nodeId: string;
	taskId: string;
	checkHealth?: typeof checkRemoteRootHealth;
	decryptPrivateKey?: typeof decryptRemoteRootPrivateKey;
	classifyPlanetStatus?: (input: {
		remotePlanetHash: string | null;
		remoteOfficialPlanetHash: string | null;
	}) => string;
};

const defaultClassifyPlanetStatus = () => "UNKNOWN";

const taskFailureMessage = (error: unknown, fallback: string) =>
	error instanceof Error ? error.message : fallback;

export async function enqueueRemoteRootHealthCheck({
	prisma,
	nodeId,
	runTask = runRemoteRootHealthCheckTask,
}: EnqueueInput) {
	const existingTask = await prisma.remoteRootTask.findFirst({
		where: {
			nodeId,
			type: "CHECK",
			status: "RUNNING",
		},
		orderBy: { createdAt: "desc" },
	});
	if (existingTask) return { task: existingTask, reused: true };

	const task = await prisma.remoteRootTask.create({
		data: {
			nodeId,
			type: "CHECK",
			status: "RUNNING",
			startedAt: new Date(),
			logs: ["Health check queued."],
		},
	});

	void Promise.resolve()
		.then(() => runTask({ prisma, nodeId, taskId: task.id }))
		.catch((error) => {
			console.error("Remote root health task failed:", error);
		});

	return { task, reused: false };
}

export async function runRemoteRootHealthCheckTask({
	prisma,
	nodeId,
	taskId,
	checkHealth = checkRemoteRootHealth,
	decryptPrivateKey = decryptRemoteRootPrivateKey,
	classifyPlanetStatus = defaultClassifyPlanetStatus,
}: RunTaskInput) {
	try {
		const node = await prisma.remoteRootNode.findUnique({
			where: { id: nodeId },
			include: { credential: true },
		});
		if (!node) throw new Error("Remote root not found");
		if (!node.credential?.encryptedPrivateKey) {
			throw new Error("Remote root has no managed SSH key");
		}

		const result = await checkHealth({
			connection: {
				host: node.host,
				port: node.sshPort,
				user: node.sshUser,
				privateKey: decryptPrivateKey(node.credential.encryptedPrivateKey),
			},
			endpointSource: node.endpointSource,
			domainName: node.domainName,
			selectedIp: node.selectedIp,
			selectedIps: node.selectedIps,
		});

		await prisma.remoteRootNode.update({
			where: { id: node.id },
			data: {
				status: result.status,
				identity: result.identity,
				primaryPort: result.primaryPort,
				zerotierVersion: result.zerotierVersion,
				resolvedIps: result.resolvedIps,
				selectedIp: result.selectedIp,
				selectedIps: result.selectedIps,
				endpointCandidates: result.endpointCandidates,
				zerotierInstalled: result.zerotierInstalled,
				serviceStatus: result.serviceStatus,
				startupStatus: result.startupStatus,
				secondaryPort: result.secondaryPort,
				allowSecondaryPort: result.allowSecondaryPort,
				portMappingEnabled: result.portMappingEnabled,
				interfacePrefixBlacklist: result.interfacePrefixBlacklist,
				bindAddresses: result.bindAddresses,
				allowManagementFrom: result.allowManagementFrom,
				defaultBondingPolicy: result.defaultBondingPolicy,
				multithreaded: result.multithreaded,
				linuxKernelMode: result.linuxKernelMode,
				sshStatus: result.sshStatus,
				panelStatus: result.panelStatus,
				sshLastError: result.sshError,
				panelLastError: result.panelError,
				remotePlanetHash: result.remotePlanetHash,
				remoteOfficialPlanetHash: result.remoteOfficialPlanetHash,
				planetStatus: classifyPlanetStatus(result),
				lastCheckAt: new Date(),
				lastPanelCheckAt: new Date(),
				lastReadAt: new Date(),
				lastError: result.lastError,
			},
		});

		await prisma.remoteRootTask.update({
			where: { id: taskId },
			data: {
				status: result.status === "OFFLINE" ? "FAILED" : "SUCCESS",
				logs: [JSON.stringify(result)],
				finishedAt: new Date(),
			},
		});
	} catch (error) {
		const message = taskFailureMessage(error, "Remote root health check failed.");
		await prisma.remoteRootNode
			.update({
				where: { id: nodeId },
				data: {
					status: "OFFLINE",
					sshStatus: "FAILED",
					panelStatus: "UNKNOWN",
					sshLastError: message,
					panelLastError: null,
					lastCheckAt: new Date(),
					lastError: message,
				},
			})
			.catch(() => undefined);
		await prisma.remoteRootTask.update({
			where: { id: taskId },
			data: {
				status: "FAILED",
				logs: [message],
				finishedAt: new Date(),
			},
		});
	}
}
