import path from 'path';
import { Request, Response } from 'express';
import fs from 'fs';
import { removeTrailingSlash } from '../utils/helpers';

//fetch bash script
export const getBashInstaller = async function (req: Request, res: Response) {
  const url = removeTrailingSlash(req.url);
  const inst_path = !url ? `bash/ztnet.sh` : `bash${url}.sh`;

  const filename = 'install.sh';
  const fileURL = path.join(__dirname, '..', '..', inst_path);
  const options = {
    headers: {
      'x-timestamp': Date.now(),
      'x-sent': true,
      'content-disposition': 'attachment; filename=' + filename,
    },
  };

  //validate that file exists
  fs.access(fileURL, fs.constants.R_OK, (err) => {
    if (err) {
      console.error(err);
      res.download(path.join(__dirname, '..', '..', 'bash/error.sh'), 'error.sh', options);
      return;
    }

    //file exists
    res.download(fileURL, 'install.sh', options);
  });
};
