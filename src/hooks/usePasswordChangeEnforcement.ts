import { api } from "~/utils/api";
import { useRouter } from "next/router";
import { useEffect } from "react";

export const usePasswordChangeEnforcement = () => {
	const { data: me, isLoading } = api.auth.me.useQuery();
	const router = useRouter();

	useEffect(() => {
		if (isLoading || !me) return;

		// Skip if already on the password change required page
		if (router.pathname === "/auth/password-change-required") return;

		// Skip for other auth pages
		if (router.pathname.startsWith("/auth/")) return;

		// Check if user needs to change password
		if (me.requestChangePassword) {
			void router.replace("/auth/password-change-required");
		}
	}, [me, isLoading, router]);

	// Block rendering of content if password change is required
	const shouldBlockContent =
		!isLoading &&
		!!me?.requestChangePassword &&
		router.pathname !== "/auth/password-change-required";

	return {
		shouldBlockContent,
		needsPasswordChange: me?.requestChangePassword || false,
		isLoading,
	};
};
