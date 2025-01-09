// stores/networkStore.ts
import { network_members } from "@prisma/client";
import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { NetworkEntity } from "~/types/local/network";

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

	// Actions
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
}

export const useNetworkStore = create<NetworkState>()(
	devtools(
		(set) => ({
			basicInfo: null,
			config: null,
			security: null,
			organization: null,
			cidr: [],
			duplicateRoutes: [],
			members: [],
			zombieMembers: [],

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

			updateNetworkData: (data) => {
				const { network, members, zombieMembers } = data;

				set((state) => {
					// Update basic info
					const basicInfoUpdates = {
						id: network.id,
						nwid: network.nwid,
						name: network.name,
						description: network.description,
						private: network.private,
						objtype: network.objtype,
						creationTime: network.creationTime,
						revision: network.revision,
					};

					// Update config
					const configUpdates = {
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
					};

					// Update security
					const securityUpdates = {
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
					};

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
		}),
		{ name: "network-store" },
	),
);
