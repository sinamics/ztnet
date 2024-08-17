import { signIn, getProviders } from "next-auth/react";
import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import cn from "classnames";
import { useTranslations } from "next-intl";

interface OAuthProvider {
	id: string;
	name: string;
	type: string;
	signinUrl: string;
	callbackUrl: string;
}

const OAuthLogin: React.FC = () => {
	const t = useTranslations();
	const router = useRouter();
	const [loading, setLoading] = useState(false);
	const [providers, setProviders] = useState<Record<string, OAuthProvider>>({});

	useEffect(() => {
		const fetchProviders = async () => {
			try {
				const fetchedProviders = await getProviders();

				if (fetchedProviders) {
					setProviders(fetchedProviders);
				}
			} catch (error) {
				console.error("Failed to fetch providers:", error);
				toast.error("Failed to load login options");
			}
		};

		fetchProviders();
	}, []);

	const oAuthHandler = async (providerId: string) => {
		setLoading(true);

		try {
			const result = await signIn(providerId, { redirect: false });

			if (result?.error) {
				toast.error(`Error occurred: ${result.error}`, { duration: 10000 });
			} else if (result?.ok) {
				await router.push("/network");
			}
		} catch (_error) {
			toast.error("Unexpected error occurred", { duration: 10000 });
		} finally {
			setLoading(false);
		}
	};

	// Convert providers object to array and sort by name
	const sortedProviders = Object.values(providers)
		.filter((provider) => provider.type === "oauth")
		.sort((a, b) => a.name.localeCompare(b.name));
	return (
		<div>
			{sortedProviders.map((provider) => (
				<button
					key={provider.id}
					type="button"
					onClick={() => oAuthHandler(provider.id)}
					className={cn(
						"btn btn-block btn-primary cursor-pointer font-semibold tracking-wide shadow-lg mb-2",
						{ "opacity-50 cursor-not-allowed": loading },
					)}
					disabled={loading}
				>
					{loading ? <span className="loading loading-spinner"></span> : null}
					{t("authPages.form.signInWith", {
						provider: provider.name,
					})}
				</button>
			))}
		</div>
	);
};

export default OAuthLogin;
