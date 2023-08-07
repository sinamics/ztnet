type Route = {
	target?: string;
};
// make a function that check if an ip is in a subnet
export const isIPInSubnet = (
	ip: string,
	targets: Route[] | undefined,
): boolean => {
	if (!Array.isArray(targets)) {
		// console.warn(
		//   "isIPInSubnet function expects 'targets' to be an array of strings. Invalid input received."
		// );
		return false;
	}

	const ipToInt = (ip: string): number => {
		const [a, b, c, d] = ip.split(".").map(Number);
		return (a << 24) | (b << 16) | (c << 8) | d;
	};

	const ipInt = ipToInt(ip);
	if (!targets.some((targetObj) => "target" in targetObj)) {
		return false;
	}

	for (const { target } of targets) {
		if (!target) continue;
		const [subnet, mask] = target.split("/");
		const subnetBits = parseInt(mask, 10);

		const subnetInt = ipToInt(subnet);
		const maskInt = ~((1 << (32 - subnetBits)) - 1);

		if ((subnetInt & maskInt) === (ipInt & maskInt)) {
			return true;
		}
	}

	return false;
};
