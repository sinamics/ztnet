export const removeTrailingSlash = (str: string) => {
  return str.replace(/\/+$/, '');
};
