// place it where you store your types
// import all namespaces for default language only
import type common from "../../public/locales/en/common.json";

export interface Resources {
  common: typeof common;
  // as many as files you have
}
