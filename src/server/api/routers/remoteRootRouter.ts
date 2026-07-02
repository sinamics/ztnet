import { z } from "zod";
import fs from "node:fs";
import { isIP } from "node:net";
import { createTRPCRouter, adminRoleProtectedRoute } from "~/server/api/trpc";
import {
	buildRemoteRootNodeCreateData,
	decryptRemoteRootPrivateKey,
} from "../services/remoteRootCredentialService";
import { resolveRootDomain } from "../services/remoteRootDnsService";
import {
	buildChangeZerotierPortCommand,
	buildDistributePlanetCommand,
	buildRestoreOfficialPlanetCommand,
	buildSaveRemoteRootConfigCommand,
	parseRestoreOfficialPlanetMode,
	REMOTE_ROOT_COMMANDS,
	readRemoteRootConfig,
	runRemoteRootCommand,
	type RemoteRootConfig,
} from "../services/remoteRootProvisioningService";
import { buildRemoteRootPlanetEntry } from "../services/remoteRootPlanetService";
import { type RemoteRootRestoreMode } from "../services/remoteRootPlanetStatusService";
import { classifyLocalRemoteRootPlanetStatus } from "../services/remoteRootLocalPlanetService";
import {
	enqueueRemoteRootHealthCheck,
	runRemoteRootHealthCheckTask,
} from "../services/remoteRootHealthTaskService";
import { assertRemoteRootConfigEditable } from "../services/remoteRootConfigGuardService";
import { buildRemoteRootReadLogs } from "../services/remoteRootTaskLogService";
import { throwError } from "~/server/helpers/errorHandler";
import { ZT_FOLDER } from "~/utils/ztApi";

const nodeInput = z.object({
	name: z.string().min(1),
	host: z.string().min(1),
	sshPort: z.number().int().min(1).max(65535).default(22),
	sshUser: z.string().min(1).default("root"),
	endpointSource: z.enum(["MANUAL_IP", "DOMAIN"]).default("MANUAL_IP"),
	domainName: z.string().optional().nullable(),
	selectedIp: z.string().optional().nullable(),
	selectedIps: z.array(z.string()).default([]),
	primaryPort: z.number().int().min(1).max(65535).default(9993),
	enabled: z.boolean().default(true),
});

const remoteRootConfigInput = z.object({
	nodeId: z.string(),
	primaryPort: z.number().int().min(1).max(65535),
	secondaryPort: z.number().int().min(1).max(65535).optional().nullable(),
	allowSecondaryPort: z.boolean().optional().nullable(),
	interfacePrefixBlacklist: z.array(z.string()).default([]),
	bindAddresses: z.array(z.string()).default([]),
	allowManagementFrom: z.array(z.string()).default([]),
	defaultBondingPolicy: z.string().optional().nullable(),
	multithreaded: z.boolean().optional().nullable(),
	linuxKernelMode: z.boolean().optional().nullable(),
});

function normalizeSelectedIps(input: {
	selectedIp?: string | null;
	selectedIps?: string[];
}) {
	const selectedIps = Array.from(
		new Set(
			[...(input.selectedIps || []), ...(input.selectedIp ? [input.selectedIp] : [])]
				.map((item) => item.trim())
				.filter(Boolean),
		),
	);
	for (const selectedIp of selectedIps) {
		if (!isIP(selectedIp)) {
			throwError("Selected endpoint IP must be an IPv4 or IPv6 address.");
		}
	}
	return {
		selectedIps,
		selectedIp: selectedIps[0] || null,
	};
}

async function createTask(ctx, nodeId: string, type: string) {
	return await ctx.prisma.remoteRootTask.create({
		data: {
			nodeId,
			type,
			status: "RUNNING",
			startedAt: new Date(),
			logs: [],
		},
	});
}

async function finishTask(ctx, taskId: string, status: "SUCCESS" | "FAILED", logs) {
	return await ctx.prisma.remoteRootTask.update({
		where: { id: taskId },
		data: {
			status,
			logs,
			finishedAt: new Date(),
		},
	});
}

function getLocalPlanetPath(): string {
	const generatedPlanet = `${ZT_FOLDER}/zt-mkworld/planet.custom`;
	const activePlanet = `${ZT_FOLDER}/planet`;
	if (fs.existsSync(generatedPlanet)) return generatedPlanet;
	if (fs.existsSync(activePlanet)) return activePlanet;
	throwError("Custom planet file was not found. Create a custom planet first.");
}

function nodeUpdateFromConfig(
	config: RemoteRootConfig,
	restoreMode?: RemoteRootRestoreMode | null,
) {
	return {
		identity: config.identity,
		primaryPort: config.primaryPort,
		secondaryPort: config.secondaryPort,
		allowSecondaryPort: config.allowSecondaryPort,
		portMappingEnabled: config.portMappingEnabled,
		interfacePrefixBlacklist: config.interfacePrefixBlacklist,
		bindAddresses: config.bindAddresses,
		allowManagementFrom: config.allowManagementFrom,
		defaultBondingPolicy: config.defaultBondingPolicy,
		multithreaded: config.multithreaded,
		linuxKernelMode: config.linuxKernelMode,
		zerotierVersion: config.zerotierVersion,
		zerotierInstalled: config.zerotierInstalled,
		serviceStatus: config.serviceStatus,
		startupStatus: config.startupStatus,
		endpointCandidates: config.endpointCandidates,
		remotePlanetHash: config.remotePlanetHash,
		remoteOfficialPlanetHash: config.remoteOfficialPlanetHash,
		planetStatus: classifyLocalRemoteRootPlanetStatus({ ...config, restoreMode }),
		lastReadAt: new Date(),
	};
}

async function readAndPersistRemoteRoot(
	ctx,
	nodeId: string,
	restoreMode?: RemoteRootRestoreMode | null,
	extraData: Record<string, unknown> = {},
) {
	const { node, connection } = await getConnection(ctx, nodeId);
	const config = await readRemoteRootConfig(connection);
	return await ctx.prisma.remoteRootNode.update({
		where: { id: node.id },
		data: { ...nodeUpdateFromConfig(config, restoreMode), ...extraData },
	});
}

function taskReadLogs(prefix: string, node): string[] {
	return buildRemoteRootReadLogs({ prefix, node });
}

async function getConnection(ctx, nodeId: string) {
	const node = await ctx.prisma.remoteRootNode.findUnique({
		where: { id: nodeId },
		include: { credential: true },
	});
	if (!node) throwError("Remote root not found", "NOT_FOUND");
	if (!node.credential?.encryptedPrivateKey) {
		throwError("Remote root has no managed SSH key");
	}

	return {
		node,
		connection: {
			host: node.host,
			port: node.sshPort,
			user: node.sshUser,
			privateKey: decryptRemoteRootPrivateKey(node.credential.encryptedPrivateKey),
		},
	};
}

export const remoteRootRouter = createTRPCRouter({
	list: adminRoleProtectedRoute.query(async ({ ctx }) => {
		return await ctx.prisma.remoteRootNode.findMany({
			include: {
				credential: {
					select: { id: true, publicKey: true, createdAt: true },
				},
				tasks: {
					orderBy: { createdAt: "desc" },
					take: 3,
				},
			},
			orderBy: { createdAt: "desc" },
		});
	}),

	getById: adminRoleProtectedRoute
		.input(z.object({ id: z.string() }))
		.query(async ({ ctx, input }) => {
			return await ctx.prisma.remoteRootNode.findUnique({
				where: { id: input.id },
				include: {
					credential: {
						select: { id: true, publicKey: true, createdAt: true },
					},
					tasks: { orderBy: { createdAt: "desc" } },
				},
			});
		}),

	create: adminRoleProtectedRoute.input(nodeInput).mutation(async ({ ctx, input }) => {
		const endpoints = normalizeSelectedIps(input);
		return await ctx.prisma.remoteRootNode.create({
			data: buildRemoteRootNodeCreateData({ ...input, ...endpoints }),
		});
	}),

	update: adminRoleProtectedRoute
		.input(nodeInput.partial().extend({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const { id, ...data } = input;
			const endpointData =
				"selectedIp" in data || "selectedIps" in data
					? normalizeSelectedIps({
							selectedIp: data.selectedIp,
							selectedIps: data.selectedIps,
						})
					: {};
			return await ctx.prisma.remoteRootNode.update({
				where: { id },
				data: { ...data, ...endpointData },
			});
		}),

	delete: adminRoleProtectedRoute
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			return await ctx.prisma.remoteRootNode.delete({ where: { id: input.id } });
		}),

	resolveDomain: adminRoleProtectedRoute
		.input(z.object({ domainName: z.string().min(1) }))
		.mutation(async ({ input }) => {
			const resolvedIps = await resolveRootDomain(input.domainName);
			return { resolvedIps };
		}),

	testSsh: adminRoleProtectedRoute
		.input(z.object({ nodeId: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const task = await createTask(ctx, input.nodeId, "READ_CONFIG");
			try {
				const { connection } = await getConnection(ctx, input.nodeId);
				const result = await runRemoteRootCommand(connection, REMOTE_ROOT_COMMANDS.test);
				const updated = await readAndPersistRemoteRoot(ctx, input.nodeId, null, {
					sshStatus: "OK",
					sshLastError: null,
				});
				await finishTask(
					ctx,
					task.id,
					"SUCCESS",
					[
						"SSH connection succeeded.",
						result.stdout,
						result.stderr,
						...taskReadLogs("Remote config read.", updated),
					].filter(Boolean),
				);
				return updated;
			} catch (error) {
				const message = error instanceof Error ? error.message : "SSH test failed.";
				await ctx.prisma.remoteRootNode
					.update({
						where: { id: input.nodeId },
						data: {
							sshStatus: "FAILED",
							sshLastError: message,
							lastError: message,
						},
					})
					.catch(() => undefined);
				await finishTask(ctx, task.id, "FAILED", [message]);
				throw error;
			}
		}),

	installZerotier: adminRoleProtectedRoute
		.input(z.object({ nodeId: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const task = await createTask(ctx, input.nodeId, "INSTALL_ZEROTIER");
			try {
				const { connection } = await getConnection(ctx, input.nodeId);
				const install = await runRemoteRootCommand(
					connection,
					REMOTE_ROOT_COMMANDS.install,
				);
				const enable = await runRemoteRootCommand(
					connection,
					REMOTE_ROOT_COMMANDS.enableService,
				);
				const updated = await readAndPersistRemoteRoot(ctx, input.nodeId);
				await finishTask(
					ctx,
					task.id,
					"SUCCESS",
					[
						install.stderr,
						enable.stderr,
						...taskReadLogs("ZeroTier install command completed.", updated),
					].filter(Boolean),
				);
				return updated;
			} catch (error) {
				await finishTask(ctx, task.id, "FAILED", [
					error instanceof Error ? error.message : "ZeroTier install failed.",
				]);
				throw error;
			}
		}),

	upgradeZerotier: adminRoleProtectedRoute
		.input(z.object({ nodeId: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const task = await createTask(ctx, input.nodeId, "UPGRADE_ZEROTIER");
			try {
				const { connection } = await getConnection(ctx, input.nodeId);
				const result = await runRemoteRootCommand(
					connection,
					REMOTE_ROOT_COMMANDS.upgrade,
				);
				const updated = await readAndPersistRemoteRoot(ctx, input.nodeId);
				await finishTask(
					ctx,
					task.id,
					"SUCCESS",
					[
						result.stderr,
						...taskReadLogs("ZeroTier upgrade command completed.", updated),
					].filter(Boolean),
				);
				return updated;
			} catch (error) {
				await finishTask(ctx, task.id, "FAILED", [
					error instanceof Error ? error.message : "ZeroTier upgrade failed.",
				]);
				throw error;
			}
		}),

	readRemoteConfig: adminRoleProtectedRoute
		.input(z.object({ nodeId: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const task = await createTask(ctx, input.nodeId, "READ_CONFIG");
			try {
				const updated = await readAndPersistRemoteRoot(ctx, input.nodeId);
				await finishTask(
					ctx,
					task.id,
					"SUCCESS",
					taskReadLogs("Remote config read.", updated),
				);
				return updated;
			} catch (error) {
				await finishTask(ctx, task.id, "FAILED", [
					error instanceof Error ? error.message : "Reading remote config failed.",
				]);
				throw error;
			}
		}),

	restartZerotier: adminRoleProtectedRoute
		.input(z.object({ nodeId: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const task = await createTask(ctx, input.nodeId, "RESTART_ZEROTIER");
			try {
				const { connection } = await getConnection(ctx, input.nodeId);
				const result = await runRemoteRootCommand(
					connection,
					REMOTE_ROOT_COMMANDS.restartService,
				);
				const updated = await readAndPersistRemoteRoot(ctx, input.nodeId);
				await finishTask(
					ctx,
					task.id,
					"SUCCESS",
					[result.stderr, ...taskReadLogs("ZeroTier restarted.", updated)].filter(
						Boolean,
					),
				);
				return updated;
			} catch (error) {
				await finishTask(ctx, task.id, "FAILED", [
					error instanceof Error ? error.message : "ZeroTier restart failed.",
				]);
				throw error;
			}
		}),

	saveRemoteConfig: adminRoleProtectedRoute
		.input(remoteRootConfigInput)
		.mutation(async ({ ctx, input }) => {
			const task = await createTask(ctx, input.nodeId, "SAVE_CONFIG");
			try {
				const { node, connection } = await getConnection(ctx, input.nodeId);
				assertRemoteRootConfigEditable(node);
				const result = await runRemoteRootCommand(
					connection,
					buildSaveRemoteRootConfigCommand(input),
				);
				const updated = await readAndPersistRemoteRoot(ctx, input.nodeId);
				await finishTask(
					ctx,
					task.id,
					"SUCCESS",
					[
						result.stderr,
						...taskReadLogs(
							"ZeroTier configuration saved and service restarted.",
							updated,
						),
					].filter(Boolean),
				);
				return updated;
			} catch (error) {
				await finishTask(ctx, task.id, "FAILED", [
					error instanceof Error ? error.message : "ZeroTier config save failed.",
				]);
				throw error;
			}
		}),

	changeZerotierPort: adminRoleProtectedRoute
		.input(
			z.object({ nodeId: z.string(), primaryPort: z.number().int().min(1).max(65535) }),
		)
		.mutation(async ({ ctx, input }) => {
			const task = await createTask(ctx, input.nodeId, "CHANGE_PORT");
			try {
				const { connection } = await getConnection(ctx, input.nodeId);
				const result = await runRemoteRootCommand(
					connection,
					buildChangeZerotierPortCommand(input.primaryPort),
				);
				const updated = await readAndPersistRemoteRoot(ctx, input.nodeId);
				await finishTask(
					ctx,
					task.id,
					"SUCCESS",
					[
						result.stderr,
						...taskReadLogs("ZeroTier port changed and service restarted.", updated),
					].filter(Boolean),
				);
				return updated;
			} catch (error) {
				await finishTask(ctx, task.id, "FAILED", [
					error instanceof Error ? error.message : "ZeroTier port change failed.",
				]);
				throw error;
			}
		}),

	checkHealth: adminRoleProtectedRoute
		.input(z.object({ nodeId: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const { task, reused } = await enqueueRemoteRootHealthCheck({
				prisma: ctx.prisma,
				nodeId: input.nodeId,
				runTask: (taskInput) =>
					runRemoteRootHealthCheckTask({
						...taskInput,
						classifyPlanetStatus: classifyLocalRemoteRootPlanetStatus,
					}),
			});
			return {
				taskId: task.id,
				nodeId: task.nodeId,
				status: task.status,
				reused,
			};
		}),

	distributePlanet: adminRoleProtectedRoute
		.input(z.object({ nodeId: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const task = await createTask(ctx, input.nodeId, "DISTRIBUTE_PLANET");
			try {
				const planetPath = getLocalPlanetPath();
				const planetBase64 = fs.readFileSync(planetPath).toString("base64");
				const { connection } = await getConnection(ctx, input.nodeId);
				const result = await runRemoteRootCommand(
					connection,
					buildDistributePlanetCommand(planetBase64),
				);
				const updated = await readAndPersistRemoteRoot(ctx, input.nodeId);
				await ctx.prisma.remoteRootNode.update({
					where: { id: input.nodeId },
					data: { lastPlanetSyncAt: new Date() },
				});
				await finishTask(
					ctx,
					task.id,
					"SUCCESS",
					[result.stderr, ...taskReadLogs("Planet distributed.", updated)].filter(
						Boolean,
					),
				);
				return updated;
			} catch (error) {
				await finishTask(ctx, task.id, "FAILED", [
					error instanceof Error ? error.message : "Planet distribution failed.",
				]);
				throw error;
			}
		}),

	restoreOfficialPlanet: adminRoleProtectedRoute
		.input(z.object({ nodeId: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const task = await createTask(ctx, input.nodeId, "RESTORE_OFFICIAL_PLANET");
			try {
				const { connection } = await getConnection(ctx, input.nodeId);
				const result = await runRemoteRootCommand(
					connection,
					buildRestoreOfficialPlanetCommand(),
				);
				const restoreMode = parseRestoreOfficialPlanetMode(result.stdout);
				const updated = await readAndPersistRemoteRoot(ctx, input.nodeId, restoreMode);
				await finishTask(
					ctx,
					task.id,
					"SUCCESS",
					[
						result.stderr,
						...taskReadLogs("Remote root restored to official planet.", updated),
					].filter(Boolean),
				);
				return updated;
			} catch (error) {
				await finishTask(ctx, task.id, "FAILED", [
					error instanceof Error ? error.message : "Official planet restore failed.",
				]);
				throw error;
			}
		}),

	buildPlanetRootEntry: adminRoleProtectedRoute
		.input(z.object({ nodeId: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const node = await ctx.prisma.remoteRootNode.findUnique({
				where: { id: input.nodeId },
			});
			if (!node) throwError("Remote root not found", "NOT_FOUND");
			return buildRemoteRootPlanetEntry(node);
		}),

	buildPlanetRootEntries: adminRoleProtectedRoute
		.input(z.object({ nodeIds: z.array(z.string()).optional() }))
		.mutation(async ({ ctx, input }) => {
			// Health status is intentionally ignored here: the UDP "health" probe is
			// not a reliable reachability signal, so we include every enabled root.
			const nodes = await ctx.prisma.remoteRootNode.findMany({
				where: {
					id: input.nodeIds?.length ? { in: input.nodeIds } : undefined,
					enabled: true,
				},
			});
			return nodes.map((node) => buildRemoteRootPlanetEntry(node));
		}),
});
