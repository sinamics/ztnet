// app/networks/NetworksList.tsx
import { UserNetworksTable } from "~/features/networks/components/UserNetworksTable";
import { useTranslations } from "next-intl";

interface NetworksListProps {
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	networks: any[]; // Replace with proper network type
	showEmptyState: boolean;
}

export default function NetworksList({ networks, showEmptyState }: NetworksListProps) {
	const t = useTranslations("networks");

	if (showEmptyState) {
		return (
			<div className="alert alert-warning">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					className="h-6 w-6 shrink-0 stroke-current"
					fill="none"
					viewBox="0 0 24 24"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth="2"
						d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
					/>
				</svg>
				<span>{t("noNetworksMessage")}</span>
			</div>
		);
	}

	return <UserNetworksTable tableData={networks} />;
}
