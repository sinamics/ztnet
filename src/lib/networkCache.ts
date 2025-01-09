// lib/networkCache.ts
import { NetworkAndMemberResponse } from "~/types/network";

function deepEqual(obj1: any, obj2: any): boolean {
	if (obj1 === obj2) return true;

	if (
		typeof obj1 !== "object" ||
		typeof obj2 !== "object" ||
		obj1 === null ||
		obj2 === null
	)
		return false;

	const keys1 = Object.keys(obj1);
	const keys2 = Object.keys(obj2);

	if (keys1.length !== keys2.length) return false;

	for (const key of keys1) {
		if (!keys2.includes(key)) return false;
		if (!deepEqual(obj1[key], obj2[key])) return false;
	}

	return true;
}

function deepClone<T>(obj: T): T {
	return JSON.parse(JSON.stringify(obj));
}

export class NetworkStateCache {
	private static instance: NetworkStateCache;
	private cache: Map<string, NetworkAndMemberResponse>;
	private lastUpdateTime: Map<string, number>;

	private constructor() {
		this.cache = new Map();
		this.lastUpdateTime = new Map();
	}

	static getInstance(): NetworkStateCache {
		if (!this.instance) {
			this.instance = new NetworkStateCache();
		}
		return this.instance;
	}

	hasChanged(networkId: string, newData: NetworkAndMemberResponse): boolean {
		const cachedData = this.cache.get(networkId);
		if (!cachedData) return true;

		// Compare network config data
		const hasNetworkChanged = !deepEqual(
			this.stripVolatileFields(cachedData.network),
			this.stripVolatileFields(newData.network),
		);

		// Compare member data
		const haveMembersChanged = !deepEqual(
			this.normalizeMemberData(cachedData.members),
			this.normalizeMemberData(newData.members),
		);

		// Compare zombie members
		const haveZombiesChanged = !deepEqual(
			this.normalizeZombieData(cachedData.zombieMembers),
			this.normalizeZombieData(newData.zombieMembers),
		);

		return hasNetworkChanged || haveMembersChanged || haveZombiesChanged;
	}

	private stripVolatileFields(network: any) {
		const { lastSeen, lastUpdate, ...relevantData } = network;
		return relevantData;
	}

	private normalizeMemberData(members: any[]) {
		return members
			.map((member) => {
				const { lastSeen, latency, pathCost, ...relevantData } = member;
				return relevantData;
			})
			.sort((a, b) => a.id.localeCompare(b.id));
	}

	private normalizeZombieData(zombies: any[]) {
		return zombies
			.map((zombie) => ({ ...zombie }))
			.sort((a, b) => a.id.localeCompare(b.id));
	}

	updateCache(networkId: string, data: NetworkAndMemberResponse) {
		this.cache.set(networkId, deepClone(data));
		this.lastUpdateTime.set(networkId, Date.now());
	}

	getLastUpdateTime(networkId: string): number {
		return this.lastUpdateTime.get(networkId) || 0;
	}

	clearCache(networkId: string) {
		this.cache.delete(networkId);
		this.lastUpdateTime.delete(networkId);
	}
}
