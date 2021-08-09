const bcrypt = require('bcryptjs');
const express = require('express');
const router = express.Router();
const prisma = require('../../db/postgres/prisma');
const ztn = require('../_utils/zt');
const Ip4 = require('../_utils/ipGenerator');

router.post('/genNewUser', generateNewUser);
router.post('/updateLicenseStatus', updateLicenseStatus);

module.exports = router;

async function generateNewUser(
  req: any,
  res: {
    status: any;
    send: any;
  }
) {
  //Validate request
  const TOKEN = req.headers['x-auth'];
  if (!TOKEN || TOKEN !== process.env.LICENSE_MANAGER_TOKEN) return res.status(404).send(new Error('Not Authorized!'));

  // check if data is correct
  if (!req.body || !req.body.email) {
    return res.status(404).send(new Error('email not provided'));
  }

  // generate randcom password
  const randPassword = Array(10)
    .fill('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz')
    .map(function (x) {
      return x[Math.floor(Math.random() * x.length)];
    })
    .join('');

  // Hash Password
  const hash = bcrypt.hashSync(randPassword, 10);

  const registerUser = await prisma.users
    .upsert({
      where: { email: req.body.email },
      update: {
        firstname: req.body.firstname,
        lastname: req.body.lastname,
        email: req.body.email,
        licenseKey: req.body.license_key,
        licenseStatus: req.body.license_status,
        orderStatus: req.body.orderStatus,
        expirationDate: req.body.expiration_date,
        orderId: req.body.orderId,
        max_instance_number: req.body.max_instance_number,
        product_id: req.body.product_id,
      },
      create: {
        firstname: req.body.firstname,
        lastname: req.body.lastname,
        email: req.body.email,
        licenseKey: req.body.license_key,
        licenseStatus: req.body.license_status,
        orderStatus: req.body.orderStatus,
        expirationDate: req.body.expiration_date,
        orderId: req.body.orderId,
        max_instance_number: req.body.max_instance_number,
        product_id: req.body.product_id,
        tempPassword: randPassword,
        hash,
      },
      include: {
        network: true,
      },
    })
    .catch(() => res.status(404).send(new Error('Could not create user!')));

  // Generate ipv4 address, cidr, start & end
  const ipAssignmentPools = Ip4.randomIPv4();
  const networkName = process.env.ZT_DEFAULT_NETWORKNAME;

  if (registerUser.network.length > 0) {
    return res.status(200).send({
      status: 'user exsist',
      code: 201,
      email: req.body.email,
      password: registerUser.firstTime ? registerUser.tempPassword : 'User has changed the Password!',
      nwid: registerUser.network[0].nwid,
    });
  }
  // Create ZT network
  const z = await ztn
    .network_create(networkName, ipAssignmentPools)
    .then(async (newNw: { name: string; nwid: string }) => {
      // store the created User in db
      return await prisma.users.update({
        where: {
          userid: registerUser.userid,
        },
        data: {
          network: {
            create: {
              nwname: newNw.name,
              nwid: newNw.nwid,
            },
          },
        },
        select: {
          network: true,
        },
      });
    })
    .catch(() => {
      return res.status(404).send(new Error('Could not create user!'));
    });

  if (registerUser) {
    return res.status(200).send({
      status: 'user has been created',
      code: 200,
      password: randPassword,
      email: req.body.email,
      nwid: z.network[0].nwid,
    });
  } else {
    return res.status(404).send(new Error('Could not create user!'));
  }
}

async function updateLicenseStatus(req: any, res: any) {
  const TOKEN = req.headers['x-auth'];
  if (!TOKEN || TOKEN !== process.env.LICENSE_MANAGER_TOKEN) return res.status(404).send(new Error('Not Authorized!'));

  try {
    await prisma.users.updateMany({
      where: {
        licenseKey: req.body.licenseKey,
      },
      data: {
        licenseStatus: req.body.status,
      },
    });
  } catch (error) {
    console.log(error);
    return res.status(404).send(new Error('User not Found!'));
  }
  return res.status(200).send('user updated');
}
