import { type ReactNode } from "react";
import { useRouter } from "next/router";
import cn from "classnames";
import { api } from "~/utils/api";

// Whether the current user meets the organization's role for routes, DNS, IP assignment
// and flow rules. Personal and central networks always allow it; the server enforces it too.
export const useCanChangeNetworkConfig = (central = false) => {
	const { query } = useRouter();
	const { data } = api.network.getNetworkById.useQuery(
		{ nwid: query.id as string, central },
		{ enabled: !!query.id },
	);
	return data?.canChangeNetworkConfig ?? true;
};

interface IProps {
	central?: boolean;
	children: ReactNode;
}

// Disables every control inside for users below the organization's network configuration role
export const NetworkConfigFieldset = ({ central = false, children }: IProps) => {
	const canChange = useCanChangeNetworkConfig(central);
	return (
		<fieldset
			disabled={!canChange}
			className={cn("min-w-0", { "pointer-events-none opacity-60": !canChange })}
		>
			{children}
		</fieldset>
	);
};
