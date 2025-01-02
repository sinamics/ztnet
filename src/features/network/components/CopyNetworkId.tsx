"use client";

import { CopyToClipboard } from "react-copy-to-clipboard";
import { toast } from "react-hot-toast";
import CopyIcon from "~/icons/copy";

export function CopyNetworkId({ networkId }: { networkId: string }) {
	return (
		<CopyToClipboard
			text={networkId}
			onCopy={() => toast.success(`Copied ${networkId} to clipboard`, { id: "copyNwid" })}
		>
			<div className="flex cursor-pointer items-center gap-2">
				{networkId}
				<CopyIcon />
			</div>
		</CopyToClipboard>
	);
}
