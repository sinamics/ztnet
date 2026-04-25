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
			// genericOAuth plugin uses `signIn.oauth2`, not `signIn.social`.
			// `signIn.social` is reserved for the built-in social providers
			// (google, github, etc.) and would 404 here.
			const { error } = await authClient.signIn.oauth2({
				providerId: "oauth",
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
