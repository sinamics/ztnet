/* eslint-disable no-console */
/* eslint-disable camelcase */
const fs = require('fs');
const sharp = require('sharp');

module.exports = {
  resizeProfileImage,
  resizeAdvertisementImage,
};

/**
 * @param  {} inputFile File object from multer.
 * Resize files. w1600 - w960 - w320 - w220
 */
function resizeProfileImage(inputFile) {
  const w170_fileName = `w170-${inputFile.filename}`;
  const w100_fileName = `w100-${inputFile.filename}`;

  const w170 = `${inputFile.destination}/${w170_fileName}`;
  const w100 = `${inputFile.destination}/${w100_fileName}`;

  const promises = [
    new Promise((resolve) =>
      sharp(inputFile.orginalFile)
        .resize({
          width: 170,
          height: 170,
          // fit: sharp.fit.cover,
          // position: sharp.strategy.entropy,
        })
        .toFile(w170)
        .then(resolve)
        .catch((err) => console.error(err))
    ),
    new Promise((resolve) =>
      sharp(inputFile.orginalFile)
        .resize({ height: 100 })
        .toFile(w100)
        .then(resolve)
        .catch((err) => console.error(err))
    ),
  ];

  const fileObject = {
    ...inputFile,
    w170,
    w100,
  };
  return Promise.all(promises).then(() => {
    fs.unlinkSync(inputFile.orginalFile);
    return fileObject;
  });
}

/**
 * @param  {} inputFile File object from multer.
 * Resize files. w1600 - w960 - w320 - w220
 */
function resizeAdvertisementImage(inputFile) {
  const w270_fileName = `w270-${inputFile.filename}`;
  const w100_fileName = `w100-${inputFile.filename}`;

  const w270 = `${inputFile.destination}/${w270_fileName}`;
  const w100 = `${inputFile.destination}/${w100_fileName}`;

  const promises = [
    new Promise((resolve) =>
      sharp(inputFile.orginalFile)
        .resize({
          height: 270,
        })
        .toFile(w270)
        .then(resolve)
        .catch((err) => console.error(err))
    ),
    new Promise((resolve) =>
      sharp(inputFile.orginalFile)
        .resize({ height: 100 })
        .toFile(w100)
        .then(resolve)
        .catch((err) => console.error(err))
    ),
  ];

  const fileObject = {
    ...inputFile,
    w270,
    w100,
  };
  return Promise.all(promises).then(() => {
    fs.unlinkSync(inputFile.orginalFile);
    return fileObject;
  });
}
