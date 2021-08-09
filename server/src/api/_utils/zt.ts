import fs from 'fs';
const axios = require('axios');
const ZT_ADDR = process.env.ZT_ADDR || 'http://127.0.0.1:9993';
const ZT_SECRET = process.env.ZT_SECRET ? process.env.ZT_SECRET : fs.readFileSync("/var/lib/zerotier-one/authtoken.secret", "utf8");

const options = {
  json: true,
  headers: {
    'X-ZT1-Auth': ZT_SECRET,
    'Content-Type': 'application/json',
  },
};
/* 
  Controller API for Admin
*/
//Get Version
const get_controller_version = async function () {
  try {
    const { data } = await axios.get(ZT_ADDR + '/controller', options);

    return data;
  } catch (err) {
    throw err;
  }
};
exports.get_controller_version = get_controller_version;

// Get all networks
const get_controller_networks = async function () {
  try {
    const { data } = await axios.get(ZT_ADDR + '/controller/network', options);

    return data;
  } catch (err) {
    throw err;
  }
};
exports.get_controller_networks = get_controller_networks;

/* 
  Controller API for Standard Users
*/
// Get ZT local address
const get_zt_address = async function () {
  try {
    const { data } = await axios.get(ZT_ADDR + '/status', options);

    return data.address;
  } catch (err) {
    throw err;
  }
};
exports.get_zt_address = get_zt_address;

// Create new network
const network_create = async function (name: any, ipAssignment: any) {
  const zt_address = await get_zt_address();

  let config = {
    name,
    ...ipAssignment,
  };

  try {
    const post = await axios
      .post(`${ZT_ADDR}/controller/network/${zt_address}______`, config, options)
      .catch((err: { response: { statusText: string } }) => console.log(err.response.statusText));
    return post.data;
  } catch (err) {
    console.log(err);
  }
};
exports.network_create = network_create;

exports.network_delete = async function (nwid: string) {
  try {
    const response = await axios.delete(`${ZT_ADDR}/controller/network/${nwid}`, options);
    return response.statusText;
  } catch (err) {
    console.log(err);
  }
};

const network_detail = async function (nwid: string) {
  try {
    const members = await axios.get(`${ZT_ADDR}/controller/network/${nwid}/member/`, options);
    const network = await axios.get(`${ZT_ADDR}/controller/network/${nwid}`, options);
    let membersArr = [];
    for (const member in members.data) {
      const memberetails = await axios.get(`${ZT_ADDR}/controller/network/${nwid}/member/${member}`, options);
      membersArr.push(memberetails.data);
    }

    return { network: { ...network.data }, members: [...membersArr] };
  } catch (err) {
    return { network: {}, members: [] };
  }
};
exports.network_detail = network_detail;

exports.network_update = async function (nwid: any, data: any) {
  try {
    const updated = await axios.post(`${ZT_ADDR}/controller/network/${nwid}`, data, options);
    return { network: { ...updated.data } };
  } catch (err) {
    throw err;
  }
};

const member_detail = async function (nwid: string, id: string) {
  try {
    const response = await axios.get(`${ZT_ADDR}/controller/network/${nwid}/member/${id}`, options);
    return response.data;
  } catch (err) {
    console.log(err);
    throw err;
  }
};
exports.member_detail = member_detail;

exports.member_delete = async function ({ nwid, memberId }: any) {
  return await axios.delete(`${ZT_ADDR}/controller/network/${nwid}/member/${memberId}`, options).then((res: { data: any }) => res.data);
};

exports.member_update = async function (nwid: string, memberId: string, data: any) {
  return await axios.post(`${ZT_ADDR}/controller/network/${nwid}/member/${memberId}`, data, options).then((res: { data: any }) => res.data);
};

exports.peers = async function () {
  try {
    const response = await axios.get(`${ZT_ADDR}/peer`, options);
    return response.data;
  } catch (err) {
    console.log(err);
    throw err;
  }
};

exports.peer = async function (user_zt_adress: any) {
  try {
    const response = await axios.get(`${ZT_ADDR}/peer/` + user_zt_adress, options);
    return response.data;
  } catch (err) {
    console.log(err);
    throw err;
  }
};
