/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/restrict-plus-operands */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
// function randomOctet() {
//   return Math.floor(Math.random() * 255);
// }
const cidrOptions = [
  "10.121.15.0/24",
  "10.121.16.0/24",
  "10.121.17.0/24",
  "10.121.18.0/24",
  "172.25.25.0/24",
  "172.25.26.0/24",
  "172.25.27.0/24",
  "172.25.28.0/24",
];

const generateCidr = () => {
  return cidrOptions[Math.floor(Math.random() * cidrOptions.length)];
};

export const IPv4gen = (CIDR: string | null) => {
  const cidr = CIDR ? CIDR : generateCidr();

  const [start, prefix] = cidr.split("/");
  const host32 = ((1 << (32 - parseInt(prefix))) - 1) >>> 0;
  const net = start.split(".").map((oct: string) => {
    return parseInt(oct);
  });

  let net32 = 0 >>> 0;
  net32 = (net[0] << 24) + (net[1] << 16) + (net[2] << 8) + net[3];
  net32 &= ~host32;

  const nwCidr = int32toIPv4String(net32) + "/" + prefix;
  const ipRangeStart = int32toIPv4String(net32 + 1);

  const bcast32 = net32 + host32;
  const ipRangeEnd = int32toIPv4String(bcast32 - 1);

  return {
    ipAssignmentPools: [{ ipRangeStart, ipRangeEnd }],
    routes: [{ target: nwCidr, via: null }],
    v4AssignMode: { zt: true },
    cidrOptions,
  };
};

function int32toIPv4String(int32: number) {
  let ipv4 = "";
  ipv4 = ((int32 & 0xff000000) >>> 24).toString();
  ipv4 += "." + ((int32 & 0x00ff0000) >>> 16).toString();
  ipv4 += "." + ((int32 & 0x0000ff00) >>> 8).toString();
  ipv4 += "." + (int32 & 0x000000ff).toString();
  return ipv4;
}
