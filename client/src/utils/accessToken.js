let accessToken = "";

export const setAccessToken = (s) => {
  return new Promise((res, rej) => {
    accessToken = s;
    res();
  });
};

export const getAccessToken = () => {
  return accessToken;
};
