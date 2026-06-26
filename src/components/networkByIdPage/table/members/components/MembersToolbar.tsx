import { useTranslations } from "next-intl";
import { DebouncedInput } from "~/components/elements/debouncedInput";

interface Props {
	globalFilter: string;
	onGlobalFilterChange: (value: string) => void;
	showExtendedView: boolean;
	onToggleExtendedView: () => void;
}

/**
 * Members table toolbar: global search + the compact/extended view toggle
 * (extended view reveals the description column).
 */
export const MembersToolbar = ({
	globalFilter,
	onGlobalFilterChange,
	showExtendedView,
	onToggleExtendedView,
}: Props) => {
	const t = useTranslations("networkById");
	const toggleLabel = showExtendedView
		? t("networkMembersTable.toggles.hideExtendedView")
		: t("networkMembersTable.toggles.showExtendedView");

	return (
		<div className="flex items-center justify-between py-2">
			<DebouncedInput
				value={globalFilter ?? ""}
				onChange={(value) => onGlobalFilterChange(String(value))}
				className="font-lg border-block border p-2 shadow flex-grow mr-4"
				placeholder={t("networkMembersTable.search.placeholder")}
			/>
			<button
				onClick={onToggleExtendedView}
				className={`btn btn-sm ${showExtendedView ? "btn-primary" : "btn-outline"}`}
				title={toggleLabel}
				aria-label={toggleLabel}
			>
				{showExtendedView ? (
					<svg
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
						strokeWidth={1.5}
						stroke="currentColor"
						className="w-4 h-4"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							d="M9 9V4.5M9 9H4.5M9 9 3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5 5.25 5.25"
						/>
					</svg>
				) : (
					<svg
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
						strokeWidth={1.5}
						stroke="currentColor"
						className="w-4 h-4"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15"
						/>
					</svg>
				)}
			</button>
		</div>
	);
};
