import { faker } from "@faker-js/faker";
import { type MemberEntity } from "~/types/local/member";

// const items = Array(100)
//   .fill(null)
//   .map((_, i) => ({
//     nwid: i,
//     nwname: "rigid-zebra",
//     members: [],
//   }));

export type Network = {
	nwid: string;
	name: string;
	members: string[];
};

const range = (len: number) => {
	const arr = [];
	for (let i = 0; i < len; i++) {
		arr.push(i);
	}

	return arr;
};

const newNetwork = (): Network => {
	return {
		nwid: faker.string.uuid(),
		name: faker.person.lastName(),
		members: [],
		// age: faker.datatype.number(40),
		// visits: faker.datatype.number(1000),
		// progress: faker.datatype.number(100),
		// status: faker.helpers.shuffle<Person["status"]>([
		//   "relationship",
		//   "complicated",
		//   "single",
		// ])[0]!,
	};
};
const newMembers = (): Partial<MemberEntity> => {
	return {
		nwid: faker.string.uuid(),
		id: faker.string.hexadecimal({ length: 10 }).substring(2),
		creationTime: faker.date.past().getTime(),
		lastSeen: faker.date.recent().toISOString(),
		// online: faker.datatype.boolean(),
		name: faker.person.firstName(),
		authenticationExpiryTime: faker.date.future().getTime(),
		lastAuthorizedTime: faker.date.recent().getTime(),
		lastDeauthorizedTime: faker.date.recent().getTime(),
		// age: faker.datatype.number(40),
		// visits: faker.datatype.number(1000),
		// progress: faker.datatype.number(100),
		// status: faker.helpers.shuffle<Person["status"]>([
		//   "relationship",
		//   "complicated",
		//   "single",
		// ])[0]!,
	};
};

export function makeNetworkData(...lens: number[]) {
	const makeDataLevel = (depth = 0): Network[] => {
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		const len = lens[depth]!;
		return range(len).map((): Network => {
			return {
				...newNetwork(),
				// subRows: lens[depth + 1] ? makeDataLevel(depth + 1) : undefined,
			};
		});
	};

	return makeDataLevel();
}

export function makeNetworkMemberData(...lens: number[]) {
	const makeDataLevel = (depth = 0): Partial<MemberEntity>[] => {
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		const len = lens[depth]!;
		return range(len).map((): Partial<MemberEntity> => {
			return {
				...newMembers(),
				// subRows: lens[depth + 1] ? makeDataLevel(depth + 1) : undefined,
			};
		});
	};

	return makeDataLevel();
}

const generateFakeDevice = () => {
	const deviceTypes = ["desktop", "mobile", "tablet"];
	const browsers = ["Chrome", "Firefox", "Safari", "Edge"];
	const operatingSystems = ["Windows", "MacOS", "Linux", "iOS", "Android"];

	const createdAt = faker.date.past();
	const lastActive = faker.date.between({ from: createdAt, to: new Date() });

	return {
		id: faker.string.uuid(),
		userId: faker.string.uuid(),
		deviceType: faker.helpers.arrayElement(deviceTypes),
		ipAddress: faker.internet.ip(),
		location: faker.datatype.boolean() ? faker.location.city() : null,
		deviceId: faker.string.alphanumeric(8),
		browser: faker.helpers.arrayElement(browsers),
		os: faker.helpers.arrayElement(operatingSystems),
		lastActive: lastActive.toISOString(),
		isActive: faker.datatype.boolean(),
		createdAt: createdAt.toISOString(),
	};
};

export const generateFakeUserDevices = (count = 5) => {
	return Array(count)
		.fill(null)
		.map(() => generateFakeDevice());
};
