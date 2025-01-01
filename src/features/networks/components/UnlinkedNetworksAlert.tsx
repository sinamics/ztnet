// app/networks/UnlinkedNetworksAlert.tsx
import Link from "next/link";
import { useTranslations } from "next-intl";

interface UnlinkedNetworksAlertProps {
	count: number;
}

export default function UnlinkedNetworksAlert({ count }: UnlinkedNetworksAlertProps) {
	const t = useTranslations("networks");

	return (
		<div className="col-span-3 flex justify-center pb-5">
			<div role="alert" className="alert w-full md:w-3/6">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
					className="stroke-info shrink-0 w-6 h-6"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth="2"
						d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
					/>
				</svg>
				<span>
					{t.rich("unlinkedNetworks.title", {
						amount: count,
					})}
				</span>
				<div>
					<Link href="/admin/?tab=controller" className="btn btn-sm">
						{t("unlinkedNetworks.navigate")}
					</Link>
				</div>
			</div>
		</div>
	);
}
