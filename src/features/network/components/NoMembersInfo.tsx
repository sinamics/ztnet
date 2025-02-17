// app/network/[id]/components/NoMembersInfo.tsx
"use client";

import { network } from "@prisma/client";
import { CopyToClipboard } from "react-copy-to-clipboard";
import { toast } from "react-hot-toast";
import CopyIcon from "~/icons/copy";

interface NoMembersInfoProps {
	network: network;
}

interface CopyBlockProps {
	text: string;
	command: string;
}

const CopyBlock = ({ text, command }: CopyBlockProps) => (
	<div>
		<div className="w-full flex justify-center">
			<p>{text}</p>
		</div>
		<div className="w-full flex justify-center">
			<CopyToClipboard
				text={command}
				onCopy={() =>
					toast.success("Command copied to clipboard!", {
						id: "copyCommand",
					})
				}
			>
				<div className="flex cursor-pointer items-center gap-2">
					<kbd className="kbd kbd-md">{command}</kbd>
					<CopyIcon />
				</div>
			</CopyToClipboard>
		</div>
	</div>
);

export function NoMembersInfo({ network }: NoMembersInfoProps) {
	return (
		<div role="alert" className="alert">
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

			<div className="w-full space-y-5 font-medium tracking-wide">
				<div className="w-full flex justify-center">
					<p>No members in this network yet. Follow these steps to get started:</p>
				</div>

				<CopyBlock
					text="1. Install ZeroTier on your device:"
					command="curl -s https://install.zerotier.com | sudo bash"
				/>

				<CopyBlock
					text="2. Join this network:"
					command={`zerotier-cli join ${network.nwid}`}
				/>

				<div className="w-full flex justify-center text-sm text-gray-500">
					<p>After joining, your device will appear here pending authorization.</p>
				</div>
			</div>
		</div>
	);
}

// You might also want to add a loading state version:
export function NoMembersInfoSkeleton() {
	return (
		<div className="alert animate-pulse">
			<div className="w-full space-y-5">
				<div className="h-4 bg-gray-200 rounded w-3/4 mx-auto" />
				<div className="h-8 bg-gray-200 rounded w-2/3 mx-auto" />
				<div className="h-8 bg-gray-200 rounded w-2/3 mx-auto" />
				<div className="h-4 bg-gray-200 rounded w-1/2 mx-auto" />
			</div>
		</div>
	);
}
