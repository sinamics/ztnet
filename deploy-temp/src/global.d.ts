import "@tanstack/react-table";
/* eslint-disable @typescript-eslint/consistent-type-imports */
/* eslint-disable @typescript-eslint/no-empty-interface */
// Use type safe message keys with `next-intl`
type Messages = typeof import("./locales/en/common.json");
declare type IntlMessages = Messages;

declare module "@tanstack/table-core" {
	interface ColumnMeta<TData extends RowData, TValue> {
		style: {
			textAlign: "left" | "center" | "right";
		};
	}
}
