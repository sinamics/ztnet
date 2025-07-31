import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { useEffect } from "react";

export const usePasswordChangeEnforcement = () => {
	const { data: session, status } = useSession();
	const router = useRouter();

	useEffect(() => {
		// Only run when session is loaded and user is authenticated
		if (status !== "authenticated" || !session?.user) return;

		// Skip if already on the password change required page
		if (router.pathname === "/auth/password-change-required") return;

		// Skip for other auth pages
		if (router.pathname.startsWith("/auth/")) return;

		// Check if user needs to change password
		if (session.user.requestChangePassword) {
			// Immediately replace the current route to prevent back navigation
			void router.replace("/auth/password-change-required");
		}
	}, [session, status, router]);

	// Block rendering of content if password change is required
	const shouldBlockContent =
		status === "authenticated" &&
		session?.user?.requestChangePassword &&
		router.pathname !== "/auth/password-change-required";

	return {
		shouldBlockContent,
		needsPasswordChange: session?.user?.requestChangePassword || false,
		isLoading: status === "loading",
	};
};
