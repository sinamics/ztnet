export function assertRemoteRootConfigEditable(node: {
	lastReadAt?: Date | string | null;
	zerotierInstalled?: boolean | null;
}) {
	if (!node.lastReadAt) {
		throw new Error("Read remote ZeroTier config before saving settings.");
	}
	if (!node.zerotierInstalled) {
		throw new Error("ZeroTier is not installed on the remote root.");
	}
}
