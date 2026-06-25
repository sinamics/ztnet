import {
	enqueueRemoteRootHealthCheck,
	runRemoteRootHealthCheckTask,
} from "~/server/api/services/remoteRootHealthTaskService";

const runningTask = {
	id: "task_1",
	nodeId: "root_1",
	type: "CHECK",
	status: "RUNNING",
	logs: [],
	startedAt: new Date(),
	finishedAt: null,
	createdAt: new Date(),
	updatedAt: new Date(),
};

describe("remoteRootHealthTaskService", () => {
	it("starts a health check task without awaiting the SSH health check", async () => {
		const neverFinishes = new Promise<void>(() => undefined);
		const runTask = jest.fn(() => neverFinishes);
		const prisma = {
			remoteRootTask: {
				findFirst: jest.fn().mockResolvedValue(null),
				create: jest.fn().mockResolvedValue(runningTask),
			},
		};

		const result = await enqueueRemoteRootHealthCheck({
			prisma,
			nodeId: "root_1",
			runTask,
		});
		await Promise.resolve();

		expect(result).toEqual({ task: runningTask, reused: false });
		expect(runTask).toHaveBeenCalledWith({
			prisma,
			nodeId: "root_1",
			taskId: "task_1",
		});
	});

	it("reuses an existing running check task for the same root", async () => {
		const runTask = jest.fn();
		const prisma = {
			remoteRootTask: {
				findFirst: jest.fn().mockResolvedValue(runningTask),
				create: jest.fn(),
			},
		};

		const result = await enqueueRemoteRootHealthCheck({
			prisma,
			nodeId: "root_1",
			runTask,
		});

		expect(result).toEqual({ task: runningTask, reused: true });
		expect(prisma.remoteRootTask.create).not.toHaveBeenCalled();
		expect(runTask).not.toHaveBeenCalled();
	});

	it("updates the node and task after a successful background health check", async () => {
		const prisma = {
			remoteRootNode: {
				findUnique: jest.fn().mockResolvedValue({
					id: "root_1",
					host: "203.0.113.10",
					sshPort: 22,
					sshUser: "root",
					endpointSource: "MANUAL_IP",
					domainName: null,
					selectedIp: null,
					selectedIps: [],
					credential: { encryptedPrivateKey: "encrypted" },
				}),
				update: jest.fn().mockResolvedValue({ id: "root_1" }),
			},
			remoteRootTask: {
				update: jest.fn().mockResolvedValue({ id: "task_1" }),
			},
		};
		const checkHealth = jest.fn().mockResolvedValue({
			status: "HEALTHY",
			identity: "identity",
			primaryPort: 9993,
			zerotierVersion: "1.16.2",
			resolvedIps: [],
			selectedIp: "203.0.113.10",
			selectedIps: ["203.0.113.10", "2001:db8::10"],
			endpointCandidates: [{ ip: "203.0.113.10", source: "PUBLIC_IP", port: 9993 }],
			zerotierInstalled: true,
			serviceStatus: "RUNNING",
			startupStatus: "ENABLED",
			sshStatus: "OK",
			panelStatus: "OK",
			sshError: null,
			panelError: null,
			remotePlanetHash: "custom",
			remoteOfficialPlanetHash: "official",
			lastError: null,
		});

		await runRemoteRootHealthCheckTask({
			prisma,
			nodeId: "root_1",
			taskId: "task_1",
			checkHealth,
			decryptPrivateKey: () => "private-key",
			classifyPlanetStatus: () => "CUSTOM_MATCH",
		});

		expect(checkHealth).toHaveBeenCalledWith({
			connection: {
				host: "203.0.113.10",
				port: 22,
				user: "root",
				privateKey: "private-key",
			},
			endpointSource: "MANUAL_IP",
			domainName: null,
			selectedIp: null,
			selectedIps: [],
		});
		expect(prisma.remoteRootNode.update).toHaveBeenCalledWith({
			where: { id: "root_1" },
			data: expect.objectContaining({
				status: "HEALTHY",
				identity: "identity",
				selectedIp: "203.0.113.10",
				selectedIps: ["203.0.113.10", "2001:db8::10"],
				startupStatus: "ENABLED",
				sshStatus: "OK",
				panelStatus: "OK",
				sshLastError: null,
				panelLastError: null,
				lastPanelCheckAt: expect.any(Date),
				planetStatus: "CUSTOM_MATCH",
				lastError: null,
			}),
		});
		expect(prisma.remoteRootTask.update).toHaveBeenCalledWith({
			where: { id: "task_1" },
			data: expect.objectContaining({
				status: "SUCCESS",
				finishedAt: expect.any(Date),
			}),
		});
	});

	it("marks the task failed when the background health check throws", async () => {
		const prisma = {
			remoteRootNode: {
				findUnique: jest.fn().mockResolvedValue({
					id: "root_1",
					host: "203.0.113.10",
					sshPort: 22,
					sshUser: "root",
					endpointSource: "MANUAL_IP",
					domainName: null,
					selectedIp: null,
					selectedIps: [],
					credential: { encryptedPrivateKey: "encrypted" },
				}),
				update: jest.fn().mockResolvedValue({ id: "root_1" }),
			},
			remoteRootTask: {
				update: jest.fn().mockResolvedValue({ id: "task_1" }),
			},
		};

		await runRemoteRootHealthCheckTask({
			prisma,
			nodeId: "root_1",
			taskId: "task_1",
			checkHealth: jest.fn().mockRejectedValue(new Error("ssh timed out")),
			decryptPrivateKey: () => "private-key",
			classifyPlanetStatus: () => "UNKNOWN",
		});

		expect(prisma.remoteRootNode.update).toHaveBeenCalledWith({
			where: { id: "root_1" },
			data: expect.objectContaining({
				status: "OFFLINE",
				sshStatus: "FAILED",
				panelStatus: "UNKNOWN",
				sshLastError: "ssh timed out",
				panelLastError: null,
				lastError: "ssh timed out",
			}),
		});
		expect(prisma.remoteRootTask.update).toHaveBeenCalledWith({
			where: { id: "task_1" },
			data: expect.objectContaining({
				status: "FAILED",
				logs: ["ssh timed out"],
			}),
		});
	});
});
