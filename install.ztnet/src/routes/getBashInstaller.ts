import path from 'path';
import { Request, Response } from 'express';
import fs from 'fs';
import { removeTrailingSlash } from '../utils/helpers';

// Initialize a counter variable at the top level
let downloadCounter = 0;

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

  // Prevent path traversal via req.url: the resolved path must stay inside bash/.
  const bashRoot = path.resolve(__dirname, '..', '..', 'bash');
  if (!path.resolve(fileURL).startsWith(bashRoot + path.sep)) {
    res.download(path.join(bashRoot, 'error.sh'), 'error.sh', options);
    return;
  }

  //validate that file exists
  fs.access(fileURL, fs.constants.R_OK, (err) => {
    if (err) {
      console.error(err);
      res.download(path.join(__dirname, '..', '..', 'bash/error.sh'), 'error.sh', options);
      return;
    }

    // File exists, increment the download counter and log it with the current date
    downloadCounter++;
    const currentDate = new Date().toISOString();
    console.log(`[${currentDate}] Bash file has been downloaded ${downloadCounter} times.`);

    //file exists
    res.download(fileURL, 'install.sh', options);
  });
};
