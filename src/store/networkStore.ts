import type { network_members } from "@prisma/client";
import { create } from "zustand";
import { devtools, subscribeWithSelector } from "zustand/middleware";
import type { NetworkEntity } from "~/types/local/network";

// Network sections enum
export enum NetworkSection {
	BASIC_INFO = "basicInfo",
	CONFIG = "config",
	SECURITY = "security",
}

// Type-safe interfaces for each section
interface NetworkBasicInfo {
	id?: string;
	nwid?: string;
	name?: string;
	description?: string;
	private?: boolean;
	objtype?: string;
	creationTime?: number;
	revision?: number;
}

interface NetworkConfig {
	mtu?: number;
	multicastLimit?: number;
	enableBroadcast?: boolean;
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	ipAssignmentPools?: any[];
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	routes?: any[];
	dns?: any;
	rules?: any[];
	rulesSource?: string;
	flowRule?: boolean;
	autoAssignIp?: boolean;
	v4AssignMode?: any;
	v6AssignMode?: any;
	cidr?: string[];
	duplicateRoutes?: any[];
}

interface NetworkSecurity {
	authTokens?: any[];
	authorizationEndpoint?: string;
	capabilities?: any[];
	clientId?: string;
	ssoEnabled?: boolean;
	tags?: any[];
	tagsByName?: Record<string, any>;
	capabilitiesByName?: Record<string, any>;
	remoteTraceLevel?: number;
	remoteTraceTarget?: string;
}

interface NetworkOrganization {
	organizationId: string | null;
	authorId: string | null;
	organization: string;
}

// Type mapping for section types
export interface SectionTypeMap {
	[NetworkSection.BASIC_INFO]: NetworkBasicInfo;
	[NetworkSection.CONFIG]: NetworkConfig;
	[NetworkSection.SECURITY]: NetworkSecurity;
}

// Utility type to get the fields of a specific section
export type SectionFields<T extends NetworkSection> = keyof SectionTypeMap[T];

// Store state interface
interface NetworkState {
	[NetworkSection.BASIC_INFO]: NetworkBasicInfo;
	[NetworkSection.CONFIG]: NetworkConfig;
	[NetworkSection.SECURITY]: NetworkSecurity;
	organization: NetworkOrganization | null;
	cidr: string[];
	duplicateRoutes: any[];
	members: network_members[];
	zombieMembers: network_members[];

	// Type-safe actions
	setNetwork: (networkData: NetworkEntity) => void;
	updateSection: <T extends NetworkSection>(
		section: T,
		data: Partial<SectionTypeMap[T]>,
	) => void;
	updateMultipleSections: (
		updates: Partial<{
			[K in NetworkSection]?: Partial<SectionTypeMap[K]>;
		}>,
	) => void;
	setMembers: (members: network_members[]) => void;
	updateNetworkData: (data: {
		network: Partial<NetworkEntity>;
		members: network_members[];
		zombieMembers: network_members[];
	}) => void;
}

export const useNetworkStore = create<NetworkState>()(
	subscribeWithSelector(
		devtools(
			(set) => ({
				// Initial state
				[NetworkSection.BASIC_INFO]: {},
				[NetworkSection.CONFIG]: {},
				[NetworkSection.SECURITY]: {},
				organization: null,
				cidr: [],
				duplicateRoutes: [],
				members: [],
				zombieMembers: [],

				setNetwork: (network) => {
					set({
						[NetworkSection.BASIC_INFO]: {
							id: network.id,
							nwid: network.nwid,
							name: network.name,
							description: network.description,
							private: network.private,
							creationTime: network.creationTime,
						},
						[NetworkSection.CONFIG]: {
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
							cidr: network.cidr || [],
							duplicateRoutes: network.duplicateRoutes || [],
						},
						[NetworkSection.SECURITY]: {
							capabilities: network.capabilities,
							tags: network.tags,
							tagsByName: network.tagsByName,
							capabilitiesByName: network.capabilitiesByName,
							remoteTraceLevel: network.remoteTraceLevel,
						},
						cidr: network.cidr || [],
						duplicateRoutes: network.duplicateRoutes || [],
					});
				},

				// Type-safe update for a single section
				updateSection: (section, data) => {
					set((state) => ({
						[section]: {
							...state[section],
							...data,
						},
					}));
				},

				// Type-safe update for multiple sections
				updateMultipleSections: (updates) => {
					set((state) => {
						const newState: Partial<NetworkState> = {};

						for (const [section, data] of Object.entries(updates) as [
							NetworkSection,
							Partial<SectionTypeMap[NetworkSection]>,
						][]) {
							newState[section] = {
								...state[section],
								...data,
							};
						}

						return newState;
					});
				},

				setMembers: (members) => set({ members }),

				updateNetworkData: (data) => {
					const { network, members, zombieMembers } = data;
					const updates: Partial<{
						[K in NetworkSection]?: Partial<SectionTypeMap[K]>;
					}> = {
						[NetworkSection.BASIC_INFO]: {
							id: network.id,
							nwid: network.nwid,
							name: network.name,
							description: network.description,
							private: network.private,
							objtype: network.objtype,
							creationTime: network.creationTime,
							revision: network.revision,
						},
						[NetworkSection.CONFIG]: {
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
						[NetworkSection.SECURITY]: {
							authorizationEndpoint: network.authorizationEndpoint,
							capabilities: network.capabilities,
							clientId: network.clientId,
							ssoEnabled: network.ssoEnabled,
							tags: network.tags,
							tagsByName: network.tagsByName,
							capabilitiesByName: network.capabilitiesByName,
							remoteTraceLevel: network.remoteTraceLevel,
						},
					};

					set((state) => ({
						...state,
						...updates,
						members: members || state.members,
						zombieMembers: zombieMembers || state.zombieMembers,
					}));
				},
			}),
			{ name: "network-store" },
		),
	),
);

// Type-safe selector hooks
export function useNetworkSection<T extends NetworkSection>(section: T) {
	return useNetworkStore((state) => state[section]);
}

// Implementation
export function useNetworkField<
	T extends NetworkSection,
	K extends keyof SectionTypeMap[T],
>(section: T, fieldOrFields: K | readonly K[]) {
	return useNetworkStore((state) => {
		if (Array.isArray(fieldOrFields)) {
			return fieldOrFields.reduce(
				(acc, field) => {
					acc[field] = state[section][field];
					return acc;
				},
				{} as { [P in K]: SectionTypeMap[T][P] },
			);
		}
		return state[section][fieldOrFields as K];
	});
}

export function useNetworkMembers() {
	return useNetworkStore((state) => state.members);
}

export function useNetworkName() {
	return useNetworkField(NetworkSection.BASIC_INFO, "name");
}

export function useNetworkMTU() {
	return useNetworkField(NetworkSection.CONFIG, "mtu");
}

export function useNetworkDescription() {
	return useNetworkField(NetworkSection.BASIC_INFO, "description");
}
