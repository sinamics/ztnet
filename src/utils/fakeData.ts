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
		// online: faker.datatype.boolean(),
		name: faker.person.firstName(),
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
