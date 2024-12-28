import { prisma } from "~/server/db";
import { RoutesEntity } from "~/types/local/network";

interface SyncRoutesParams {
	networkId: string;
	networkFromDatabase: {
		routes: RoutesEntity[];
	};
	ztControllerRoutes: RoutesEntity[];
}

export const syncNetworkRoutes = async ({
	networkId,
	networkFromDatabase,
	ztControllerRoutes,
}: SyncRoutesParams) => {
	try {
		const dbRoutes = networkFromDatabase?.routes;

		if (!dbRoutes || Array.isArray(dbRoutes) === false) {
			return networkFromDatabase;
		}

		// Create Sets for deduplication
		const dbRouteKeys = new Set(dbRoutes.map(getRouteKey));
		const ztRouteKeys = new Set(ztControllerRoutes.map(getRouteKey));

		// Create maps after deduplication
		const existingRouteMap = new Map(
			Array.from(dbRouteKeys).map((key) => {
				const route = dbRoutes.find((r) => getRouteKey(r) === key);
				return [key, route!];
			}),
		);

		const newRouteMap = new Map(
			Array.from(ztRouteKeys).map((key) => {
				const route = ztControllerRoutes.find((r) => getRouteKey(r) === key);
				return [key, route!];
			}),
		);

		// Find routes to create, update, and delete
		const routesToCreate: RoutesEntity[] = [];
		const routesToUpdate: RoutesEntity[] = [];
		const routesToDelete: string[] = [];

		// Find routes to create or update
		for (const [key, ztRoute] of newRouteMap) {
			const existingRoute = existingRouteMap.get(key);
			if (!existingRoute) {
				// Only add if we haven't seen this route before
				if (!routesToCreate.some((r) => getRouteKey(r) === key)) {
					routesToCreate.push(ztRoute);
				}
			} else if (hasRouteChanged(existingRoute, ztRoute)) {
				// Only add if we haven't seen this route before
				if (!routesToUpdate.some((r) => getRouteKey(r) === key)) {
					routesToUpdate.push({
						...ztRoute,
						id: existingRoute.id,
					});
				}
			}
		}

		// Find routes to delete (routes in DB that don't exist in ZT anymore)
		const seenDeleteKeys = new Set<string>();
		for (const [key, dbRoute] of existingRouteMap) {
			if (!newRouteMap.has(key) && !seenDeleteKeys.has(dbRoute.id)) {
				routesToDelete.push(dbRoute.id);
				seenDeleteKeys.add(dbRoute.id);
			}
		}

		// Only proceed if there are changes to make
		if (
			routesToCreate.length === 0 &&
			routesToUpdate.length === 0 &&
			routesToDelete.length === 0
		) {
			return networkFromDatabase;
		}

		// Perform all database operations in a transaction
		const updatedNetwork = await prisma.$transaction(async (tx) => {
			// Create new routes
			if (routesToCreate.length > 0) {
				await tx.routes.createMany({
					data: routesToCreate.map((route) => ({
						networkId: networkId,
						target: route.target,
						via: route.via || null,
					})),
				});
			}

			// Update existing routes
			for (const route of routesToUpdate) {
				await tx.routes.update({
					where: { id: route.id },
					data: {
						target: route.target,
						via: route.via || null,
					},
				});
			}

			// Delete removed routes
			if (routesToDelete.length > 0) {
				await tx.routes.deleteMany({
					where: {
						id: {
							in: Array.from(routesToDelete),
						},
					},
				});
			}

			// Fetch and return the updated network
			return tx.network.findUnique({
				where: { nwid: networkId },
				include: {
					organization: true,
					routes: true,
				},
			});
		});
		return updatedNetwork;
	} catch (error) {
		console.error("Error syncing network routes:", error);
	}
};

// Helper function to generate a unique key for a route
const getRouteKey = (route: RoutesEntity): string => {
	return `${route.target}-${route.via || "null"}`;
};

// Helper function to check if a route has changed
const hasRouteChanged = (dbRoute: RoutesEntity, ztRoute: RoutesEntity): boolean => {
	return dbRoute.target !== ztRoute.target || dbRoute.via !== (ztRoute.via || null);
};
