import { CopyToClipboard } from "react-copy-to-clipboard";
import toast from "react-hot-toast";
import { useTranslations } from "next-intl";
import cn from "classnames";

/**
 * A copyable, truncating IP value. Clicking copies to the clipboard (with a
 * toast); the full value is always available via the native `title` tooltip.
 * `truncate` keeps long IPv6 addresses inside their cell's max-width instead of
 * overflowing into neighbouring columns.
 */
export const CopyableIp = ({ ip, className }: { ip: string; className?: string }) => {
	const t = useTranslations();
	return (
		<CopyToClipboard
			text={ip}
			onCopy={() =>
				toast.success(t("commonToast.copyToClipboard.success", { element: ip }))
			}
			title={t("commonToast.copyToClipboard.title")}
		>
			<span className={cn("block cursor-pointer truncate", className)} title={ip}>
				{ip}
			</span>
		</CopyToClipboard>
	);
};

/**
 * The read-only "ghost" badge used for auto-generated addresses (RFC4193 /
 * 6PLANE). Capped to the cell width so the IPv6 truncates gracefully.
 */
export const GeneratedIpBadge = ({ ip }: { ip: string }) => (
	<div className="badge badge-ghost rounded-md text-sm max-w-full">
		<CopyableIp ip={ip} />
	</div>
);
