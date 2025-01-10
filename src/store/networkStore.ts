// stores/networkStore.ts
import type { network_members } from "@prisma/client";
import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { NetworkEntity } from "~/types/local/network";

interface EditLocks {
	basicInfo: Set<keyof NetworkEntity>;
	config: Set<keyof NetworkEntity>;
	security: Set<keyof NetworkEntity>;
}

export interface NetworkState {
	basicInfo: Partial<NetworkEntity> | null;
	config: Partial<NetworkEntity> | null;
	security: Partial<NetworkEntity> | null;
	organization: {
		organizationId: string | null;
		authorId: string | null;
		organization: string;
	} | null;
	cidr: string[];
	duplicateRoutes: any[];
	members: network_members[];
	zombieMembers: network_members[];
	editLocks: EditLocks;

	// Actions for setting/updating network data
	setNetwork: (networkData: NetworkEntity) => void;
	updateBasicInfo: (info: Partial<NetworkEntity>) => void;
	updateConfig: (config: Partial<NetworkEntity>) => void;
	updateSecurity: (security: Partial<NetworkEntity>) => void;
	setMembers: (members: network_members[]) => void;
	updateNetworkData: (data: {
		network: Partial<NetworkEntity>;
		members: network_members[];
		zombieMembers: network_members[];
	}) => void;

	// Actions for managing edit locks
	lockField: (section: keyof EditLocks, field: keyof NetworkEntity) => void;
	unlockField: (section: keyof EditLocks, field: keyof NetworkEntity) => void;
	isFieldLocked: (section: keyof EditLocks, field: keyof NetworkEntity) => boolean;
}

export const useNetworkStore = create<NetworkState>()(
	devtools(
		(set, get) => ({
			// Initial state
			basicInfo: null,
			config: null,
			security: null,
			organization: null,
			cidr: [],
			duplicateRoutes: [],
			members: [],
			zombieMembers: [],
			editLocks: {
				basicInfo: new Set(),
				config: new Set(),
				security: new Set(),
			},

			// Set initial network data
			setNetwork: (networkData) => {
				const { members, zombieMembers, ...network } = networkData;

				set({
					basicInfo: {
						id: network.id,
						nwid: network.nwid,
						name: network.name,
						description: network.description,
						private: network.private,
						objtype: network.objtype,
						creationTime: network.creationTime,
						revision: network.revision,
					},

					config: {
						mtu: network.mtu,
						multicastLimit: network.multicastLimit,
						enableBroadcast: network.enableBroadcast,
						ipAssignmentPools: network.ipAssignmentPools,
						routes: network.routes,
						dns: network.dns,
						rules: network.rules,
						rulesSource: network.rulesSource,
						flowRule: network.flowRule,
						autoAssignIp: network.autoAssignIp,
						v4AssignMode: network.v4AssignMode,
						v6AssignMode: network.v6AssignMode,
					},

					security: {
						authTokens: network.authTokens,
						authorizationEndpoint: network.authorizationEndpoint,
						capabilities: network.capabilities,
						clientId: network.clientId,
						ssoEnabled: network.ssoEnabled,
						tags: network.tags,
						tagsByName: network.tagsByName,
						capabilitiesByName: network.capabilitiesByName,
						remoteTraceLevel: network.remoteTraceLevel,
						remoteTraceTarget: network.remoteTraceTarget,
					},

					organization: {
						organizationId: network.organizationId,
						authorId: network.authorId,
						organization: network.organization,
					},

					cidr: network.cidr || [],
					duplicateRoutes: network.duplicateRoutes || [],
					members,
					zombieMembers,
				});
			},

			// Update specific sections
			updateBasicInfo: (info) =>
				set((state) => ({
					basicInfo: state.basicInfo ? { ...state.basicInfo, ...info } : info,
				})),

			updateConfig: (config) =>
				set((state) => ({
					config: state.config ? { ...state.config, ...config } : config,
				})),

			updateSecurity: (security) =>
				set((state) => ({
					security: state.security ? { ...state.security, ...security } : security,
				})),

			setMembers: (members) => set({ members }),

			// Handle WebSocket updates
			updateNetworkData: (data) => {
				const { network, members, zombieMembers } = data;
				const state = get();

				set((state) => {
					// Create updates for each section, excluding locked fields
					const basicInfoUpdates = Object.fromEntries(
						Object.entries({
							id: network.id,
							nwid: network.nwid,
							name: network.name,
							description: network.description,
							private: network.private,
							objtype: network.objtype,
							creationTime: network.creationTime,
							revision: network.revision,
						}).filter(
							([key]) => !state.editLocks.basicInfo.has(key as keyof NetworkEntity),
						),
					);

					const configUpdates = Object.fromEntries(
						Object.entries({
							mtu: network.mtu,
							multicastLimit: network.multicastLimit,
							enableBroadcast: network.enableBroadcast,
							ipAssignmentPools: network.ipAssignmentPools,
							routes: network.routes,
							dns: network.dns,
							rules: network.rules,
							rulesSource: network.rulesSource,
							flowRule: network.flowRule,
							autoAssignIp: network.autoAssignIp,
							v4AssignMode: network.v4AssignMode,
							v6AssignMode: network.v6AssignMode,
						}).filter(([key]) => !state.editLocks.config.has(key as keyof NetworkEntity)),
					);

					const securityUpdates = Object.fromEntries(
						Object.entries({
							authTokens: network.authTokens,
							authorizationEndpoint: network.authorizationEndpoint,
							capabilities: network.capabilities,
							clientId: network.clientId,
							ssoEnabled: network.ssoEnabled,
							tags: network.tags,
							tagsByName: network.tagsByName,
							capabilitiesByName: network.capabilitiesByName,
							remoteTraceLevel: network.remoteTraceLevel,
							remoteTraceTarget: network.remoteTraceTarget,
						}).filter(
							([key]) => !state.editLocks.security.has(key as keyof NetworkEntity),
						),
					);

					return {
						...state,
						basicInfo: state.basicInfo
							? { ...state.basicInfo, ...basicInfoUpdates }
							: basicInfoUpdates,
						config: state.config ? { ...state.config, ...configUpdates } : configUpdates,
						security: state.security
							? { ...state.security, ...securityUpdates }
							: securityUpdates,
						organization: network.organization
							? {
									organizationId: network.organizationId,
									authorId: network.authorId,
									organization: network.organization,
								}
							: state.organization,
						cidr: network.cidr || state.cidr,
						duplicateRoutes: network.duplicateRoutes || state.duplicateRoutes,
						members: members || state.members,
						zombieMembers: zombieMembers || state.zombieMembers,
					};
				});
			},

			// Edit lock management
			lockField: (section, field) =>
				set((state) => ({
					editLocks: {
						...state.editLocks,
						[section]: new Set([...state.editLocks[section], field]),
					},
				})),

			unlockField: (section, field) =>
				set((state) => {
					const newSet = new Set(state.editLocks[section]);
					newSet.delete(field);
					return {
						editLocks: {
							...state.editLocks,
							[section]: newSet,
						},
					};
				}),

			isFieldLocked: (section, field) => {
				const state = get();
				return state.editLocks[section].has(field);
			},
		}),
		{ name: "network-store" },
	),
);
