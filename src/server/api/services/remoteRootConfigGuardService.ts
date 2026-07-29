import type { RemoteRootDeploymentMode } from "./remoteRootProvisioningService";

export function assertRemoteRootConfigEditable(node: {
	lastReadAt?: Date | string | null;
	zerotierInstalled?: boolean | null;
	deploymentMode?: RemoteRootDeploymentMode | string | null;
}) {
	if (!node.lastReadAt) {
		throw new Error("Read remote ZeroTier config before saving settings.");
	}
	if (!node.zerotierInstalled) {
		throw new Error("ZeroTier is not installed on the remote root.");
	}
	if (node.deploymentMode !== "NATIVE" && node.deploymentMode !== "DOCKER") {
		throw new Error("Remote root deployment is not supported for remote configuration changes.");
	}
}

export function assertRemoteRootNativeCommandAllowed(node: {
	deploymentMode?: RemoteRootDeploymentMode | string | null;
}, operation: string) {
	if (node.deploymentMode === "DOCKER") {
		throw new Error(`${operation} is not available for Docker deployments. Restart the ZeroTier container manually after supported file changes.`);
	}
	if (node.deploymentMode !== "NATIVE") {
		throw new Error(`${operation} requires a detected native ZeroTier service.`);
	}
}

export function remoteRootRequiresManualRestart(node: {
	deploymentMode?: RemoteRootDeploymentMode | string | null;
}) {
	return node.deploymentMode === "DOCKER";
}
