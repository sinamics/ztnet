/* eslint-disable @typescript-eslint/consistent-type-imports */
/* eslint-disable @typescript-eslint/no-empty-interface */
// Use type safe message keys with `next-intl`
type Messages = typeof import("./locales/en/common.json");
declare interface IntlMessages extends Messages {}
