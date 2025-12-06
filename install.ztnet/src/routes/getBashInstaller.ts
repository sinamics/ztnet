import path from 'path';
import { Request, Response } from 'express';
import fs from 'fs';
import { removeTrailingSlash } from '../utils/helpers';

// Initialize a counter variable at the top level
let downloadCounter = 0;

//fetch bash script
export const getBashInstaller = async function (req: Request, res: Response) {
  const url = removeTrailingSlash(req.url);
  const inst_path = !url ? `bash/entrypoint.sh` : `bash${url}.sh`;

  const filename = 'install.sh';
  const fileURL = path.join(__dirname, '..', '..', inst_path);

  //validate that file exists
  fs.access(fileURL, fs.constants.R_OK, (err) => {
    if (err) {
      console.error('File access error:', err);
      res.download(path.join(__dirname, '..', '..', 'bash/error.sh'), 'error.sh');
      return;
    }

    // File exists, increment the download counter and log it with the current date
    downloadCounter++;
    const currentDate = new Date().toISOString();
    console.log(`[${currentDate}] Bash file has been downloaded ${downloadCounter} times.`);

    // For entrypoint.sh, inject the correct base URL based on environment
    if (inst_path === 'bash/entrypoint.sh') {
      fs.readFile(fileURL, 'utf8', (readErr, data) => {
        if (readErr) {
          console.error('File read error:', readErr);
          res.download(path.join(__dirname, '..', '..', 'bash/error.sh'), 'error.sh');
          return;
        }

        // Determine base URL based on environment
        let baseUrl = 'http://install.ztnet.network';
        if (process.env.NODE_ENV === 'development') {
          // Use the host from the request in dev mode
          const host = req.get('host') || 'localhost:9090';
          const protocol = req.protocol || 'http';
          baseUrl = `${protocol}://${host}`;
        }

        // Replace the placeholder URL in the script
        const modifiedScript = data.replace(
          /INSTALLER_BASE_URL="\$\{ZTNET_INSTALLER_URL:-[^}]+\}"/,
          `INSTALLER_BASE_URL="\${ZTNET_INSTALLER_URL:-${baseUrl}}"`
        );

        res.setHeader('Content-Type', 'application/x-sh');
        res.setHeader('Content-Disposition', 'attachment; filename=install.sh');
        res.send(modifiedScript);
      });
    } else {
      // For other scripts, just download directly
      res.download(fileURL, 'install.sh');
    }
  });
};
