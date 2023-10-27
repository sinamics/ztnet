import path from 'path';
import { Request, Response } from 'express';
import fs from 'fs';
import { PROD_BINARIES_PATH, DEV_BINARIES_PATH } from '../project-config';

//download binary
export const getBinary = async function (req: Request, res: Response) {
  const folderPath = process.env.NODE_ENV !== 'development' ? PROD_BINARIES_PATH : DEV_BINARIES_PATH;

  const { arch, version, app }: any = req.query;

  if (!arch || !version || !app)
    return res.status(404).send('Need args: ?arch=armhf&app=ztnet&version="0.3.7"\n');

  const binPath = path.join(folderPath, app, arch);

  let filesArr: any = [];

  try {
    filesArr = fs.readdirSync(binPath);
  } catch (error) {
    return res.download(path.join(__dirname, '..', '..', 'bash/error.sh'), 'error.sh');
  }

  // sort array descending
  const sortedFiles = filesArr.sort((a: any, b: any) => {
    return b.localeCompare(a);
  });

  // find filename inlcuding version number
  const file = sortedFiles.find((file: string) => {
    if (version === 'latest') {
      return sortedFiles[0];
    }

    return file.includes(version);
  });

  if (!file) return res.status(404).send('Version does not exist\n');

  const filePath = path.join(binPath, file);

  const options = {
    headers: {
      'x-timestamp': Date.now(),
      'x-sent': true,
    },
  };

  //validate that file exists
  return fs.access(filePath, fs.constants.R_OK, (err) => {
    if (err) {
      console.error(err);
      return res.status(403).send('Status: File not found!\n');
    }

    //file exists
    return res.download(filePath, file, options);
  });
};
