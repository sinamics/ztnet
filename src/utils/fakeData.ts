import { faker } from "@faker-js/faker";

// const items = Array(100)
//   .fill(null)
//   .map((_, i) => ({
//     nwid: i,
//     nwname: "rigid-zebra",
//     members: [],
//   }));

export type Network = {
  nwid: string;
  nwname: string;
  members: string[];
};

const range = (len: number) => {
  const arr = [];
  for (let i = 0; i < len; i++) {
    arr.push(i);
  }
  return arr;
};

const newPerson = (): Network => {
  return {
    nwid: faker.person.firstName(),
    nwname: faker.person.lastName(),
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

export function makeNetworkData(...lens: number[]) {
  const makeDataLevel = (depth = 0): Network[] => {
    const len = lens[depth]!;
    return range(len).map((d): Network => {
      return {
        ...newPerson(),
        subRows: lens[depth + 1] ? makeDataLevel(depth + 1) : undefined,
      };
    });
  };

  return makeDataLevel();
}
