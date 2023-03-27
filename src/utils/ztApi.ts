/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/restrict-plus-operands */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import fs from "fs";
import axios from "axios";
const ZT_ADDR = process.env.ZT_ADDR || "http://127.0.0.1:9993";
let ZT_SECRET = process.env.ZT_SECRET;
const ZT_FILE =
  process.env.ZT_SECRET_FILE || "/var/lib/zerotier-one/authtoken.secret";

if (!ZT_SECRET) {
  try {
    ZT_SECRET = fs.readFileSync(ZT_FILE, "utf8");
  } catch (error) {
    console.log(error);
  }
}

const options = {
  json: true,
  headers: {
    "X-ZT1-Auth": ZT_SECRET,
    "Content-Type": "application/json",
  },
};
/* 
  Controller API for Admin
*/
//Get Version
export const get_controller_version = async function () {
  try {
    const { data } = await axios.get(ZT_ADDR + "/controller", options);

    return data;
  } catch (err) {
    throw err;
  }
};

// Get all networks
export const get_controller_networks = async function () {
  try {
    const { data } = await axios.get(ZT_ADDR + "/controller/network", options);

    return data;
  } catch (err) {
    throw err;
  }
};

/* 
  Controller API for Standard Users
*/
// Get ZT local address
export const get_zt_address = async function () {
  try {
    const { data } = await axios.get(ZT_ADDR + "/status", options);
    console.log(data);
    return data.address;
  } catch (err) {
    throw err;
  }
};

// Create new network
export const network_create = async function (name: any, ipAssignment: any) {
  const zt_address = await get_zt_address();

  const config = {
    name,
    ...ipAssignment,
  };

  try {
    const post = await axios
      .post(
        `${ZT_ADDR}/controller/network/${zt_address}______`,
        config,
        options
      )
      .catch((err: { response: { statusText: string } }) =>
        console.log(err.response.statusText)
      );
    return post.data;
  } catch (err) {
    console.log(err);
  }
};

export const network_delete = async function (nwid: string) {
  try {
    const response = await axios.delete(
      `${ZT_ADDR}/controller/network/${nwid}`,
      options
    );
    return response.statusText;
  } catch (err) {
    console.log(err);
  }
};

export const network_detail = async function (nwid: string) {
  try {
    const members = await axios.get(
      `${ZT_ADDR}/controller/network/${nwid}/member/`,
      options
    );
    const network = await axios.get(
      `${ZT_ADDR}/controller/network/${nwid}`,
      options
    );
    const membersArr: any = [];
    for (const member in members.data) {
      const memberetails = await axios.get(
        `${ZT_ADDR}/controller/network/${nwid}/member/${member}`,
        options
      );
      membersArr.push(memberetails.data);
    }
    return { network: { ...network.data }, members: [...membersArr] };
  } catch (err) {
    return { network: {}, members: [] };
  }
};

export const network_update = async function (nwid: any, data: any) {
  try {
    const updated = await axios.post(
      `${ZT_ADDR}/controller/network/${nwid}`,
      data,
      options
    );
    return { network: { ...updated.data } };
  } catch (err) {
    throw err;
  }
};

export const member_detail = async function (nwid: string, id: string) {
  try {
    const response = await axios.get(
      `${ZT_ADDR}/controller/network/${nwid}/member/${id}`,
      options
    );
    return response.data;
  } catch (err) {
    console.log(err);
    throw err;
  }
};

export const member_delete = async function ({ nwid, memberId }: any) {
  return await axios
    .delete(`${ZT_ADDR}/controller/network/${nwid}/member/${memberId}`, options)
    .then((res: { data: any }) => res.data);
};

export const member_update = async function (
  nwid: string,
  memberId: string,
  data: any
) {
  return await axios
    .post(
      `${ZT_ADDR}/controller/network/${nwid}/member/${memberId}`,
      data,
      options
    )
    .then((res: { data: any }) => res.data);
};

export const peers = async function () {
  try {
    const response = await axios.get(`${ZT_ADDR}/peer`, options);
    return response.data;
  } catch (err) {
    console.log(err);
    throw err;
  }
};

export const peer = async function (user_zt_adress: any) {
  try {
    const response = await axios.get(
      `${ZT_ADDR}/peer/` + user_zt_adress,
      options
    );

    return response.data;
  } catch (err) {
    // throw err;
  }
};
