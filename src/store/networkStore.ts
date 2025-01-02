// stores/networkStore.ts
import { network_members } from "@prisma/client";
import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { NetworkEntity } from "~/types/local/network";

interface NetworkState {
	// Basic network info
	network: Partial<NetworkEntity> | null;

	// Network configuration
	config: Partial<NetworkEntity> | null;

	// Organization related
	organization: {
		organizationId: string | null;
		authorId: string | null;
	} | null;

	// Members
	members: network_members[];
	zombieMembers: network_members[];

	// Actions
	setNetwork: (network: any) => void;
	updateNetworkName: (name: string) => void;
	updateNetworkConfig: (config: Partial<NetworkState["config"]>) => void;
	setMembers: (members: network_members[]) => void;
}

export const useNetworkStore = create<NetworkState>()(
	devtools(
		(set) => ({
			network: null,
			config: null,
			organization: null,
			members: [],
			zombieMembers: [],

			setNetwork: (networkData) => {
				const { members, zombieMembers, ...network } = networkData;
				set({
					network: {
						id: network.id,
						name: network.name,
						nwid: network.nwid,
						description: network.description,
						private: network.private,
					},
					config: {
						ipAssignmentPools: network.ipAssignmentPools,
						routes: network.routes,
						dns: network.dns,
						rules: network.rules,
						mtu: network.mtu,
						multicastLimit: network.multicastLimit,
						enableBroadcast: network.enableBroadcast,
					},
					organization: {
						organizationId: network.organizationId,
						authorId: network.authorId,
					},
					members,
					zombieMembers,
				});
			},

			updateNetworkName: (name) =>
				set((state) => ({
					network: state.network ? { ...state.network, name } : null,
				})),

			updateNetworkConfig: (config) =>
				set((state) => ({
					config: state.config ? { ...state.config, ...config } : null,
				})),

			setMembers: (members) => set({ members }),
		}),
		{ name: "network-store" },
	),
);
