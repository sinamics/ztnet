export const sixPlane = (networkId: string, nodeId: string): string => {
	const splitBy2Re = /.{1,2}/g;
	const splitBy4Re = /.{1,4}/g;
	const bytes = networkId.match(splitBy2Re);

	if (!bytes) {
		throw new Error("Invalid networkId format");
	}

	const networkPart = bytes
		.map((substr, idx, arr) => parseInt(substr, 16) ^ parseInt(arr[idx + 4], 16))
		.map((byte) => byte.toString(16).toLowerCase())
		.map((byte) => (byte.length === 2 ? byte : `0${byte}`))
		.slice(0, 4);

	const nodeBytes = nodeId.match(splitBy2Re);
	if (!nodeBytes) {
		throw new Error("Invalid nodeId format");
	}

	const nodePart = nodeBytes.slice(0, 5);

	const result = ["fc"]
		.concat(networkPart)
		.concat(nodePart)
		.concat(["00", "00", "00", "00", "00", "01"])
		.join("")
		.match(splitBy4Re)
		.join(":");

	return result;
};

export const toRfc4193Ip = (networkId: string, memberId: string): string => {
	const result = `fd${networkId}9993${memberId}`.match(/.{1,4}/g);

	if (!result) {
		throw new Error("Invalid networkId or memberId format");
	}

	return result.join(":");
};
