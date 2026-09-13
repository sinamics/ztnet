import { authClient } from "~/lib/authClient";
import { useState } from "react";
import { toast } from "react-hot-toast";
import cn from "classnames";
import { useTranslations } from "next-intl";

interface OAuthLoginProps {
	oauthEnabled?: boolean;
}

const OAuthLogin: React.FC<OAuthLoginProps> = ({ oauthEnabled = true }) => {
	const t = useTranslations();
	const [loading, setLoading] = useState(false);

	if (!oauthEnabled) return null;

	const oAuthHandler = async () => {
		setLoading(true);
		try {
			// `signIn.social` is the only entry point: since better-auth 1.7 the
			// genericOAuth plugin registers "oauth" as a social provider and mounts
			// no routes of its own. The callback URL stays
			// `${baseURL}/api/auth/callback/oauth` — the path documented at
			// https://ztnet.network/authentication/oauth and already registered in
			// every existing IdP config (PKCE, mapProfileToUser, etc. all apply).
			const { error } = await authClient.signIn.social({
				provider: "oauth",
				callbackURL: "/network",
				errorCallbackURL: "/auth/login",
			});
			if (error) {
				toast.error(error.message || "Unexpected error occurred", {
					duration: 10000,
				});
			}
		} catch (_error) {
			toast.error("Unexpected error occurred", { duration: 10000 });
		} finally {
			setLoading(false);
		}
	};

	return (
		<div>
			<button
				type="button"
				onClick={oAuthHandler}
				className={cn(
					"btn btn-block btn-primary cursor-pointer font-semibold tracking-wide shadow-lg mb-2",
					{ "opacity-50 cursor-not-allowed": loading },
				)}
				disabled={loading}
			>
				{loading ? <span className="loading loading-spinner"></span> : null}
				{t("authPages.form.signInWith", {
					provider: "OAuth",
				})}
			</button>
		</div>
	);
};

export default OAuthLogin;
