import path from 'path';
import { Request, Response } from 'express';
import fs from 'fs';

// Initialize a counter variable for beta downloads
let betaDownloadCounter = 0;

// Fetch beta bash script
export const getBetaInstaller = async function (_req: Request, res: Response) {
  const inst_path = `bash/ztnet_beta.sh`;
  const filename = 'install_beta.sh';
  const fileURL = path.join(__dirname, '..', '..', inst_path);
  const options = {
    headers: {
      'x-timestamp': Date.now(),
      'x-sent': true,
      'content-disposition': 'attachment; filename=' + filename,
    },
  };

  // Validate that file exists
  fs.access(fileURL, fs.constants.R_OK, (err) => {
    if (err) {
      console.error(err);
      res.download(path.join(__dirname, '..', '..', 'bash/error.sh'), 'error.sh', options);
      return;
    }

    // File exists, increment the download counter and log it with the current date
    betaDownloadCounter++;
    const currentDate = new Date().toISOString();
    console.log(`[${currentDate}] Beta bash file has been downloaded ${betaDownloadCounter} times.`);

    // File exists
    res.download(fileURL, 'install_beta.sh', options);
  });
};