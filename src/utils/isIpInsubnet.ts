// type Route = {
//   target: string;
//   via: string | null;
// };

// make a function that check if an ip is in a subnet

export const isIPInSubnet = (ip: string, target: string): boolean => {
  const [subnet, mask] = target.split("/");
  const subnetBits = parseInt(mask, 10);

  const ipToInt = (ip: string): number => {
    const [a, b, c, d] = ip.split(".").map(Number);
    return (a << 24) | (b << 16) | (c << 8) | d;
  };

  const subnetInt = ipToInt(subnet);
  const ipInt = ipToInt(ip);
  const maskInt = ~((1 << (32 - subnetBits)) - 1);

  return (subnetInt & maskInt) === (ipInt & maskInt);
};
