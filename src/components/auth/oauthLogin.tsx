import { signIn } from "next-auth/react";
import { useRouter } from "next/router";
import { useState } from "react";
import { toast } from "react-hot-toast";
import cn from "classnames";

const OauthLogin: React.FC = () => {
	const router = useRouter();
	const { error: oauthError } = router.query;
	const [loading, setLoading] = useState(false);

	const oAuthHandler = async (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
		event.preventDefault();
		setLoading(true);

		try {
			await signIn("oauth");
			if (!oauthError) {
				await router.push("/network");
			} else {
				toast.error(`Error occurred: ${oauthError}` as string, { duration: 10000 });
			}
		} catch (_error) {
			toast.error(`Error occurred: ${oauthError}` as string);
		} finally {
			setLoading(false);
		}
	};

	return (
		<button
			type="button"
			onClick={oAuthHandler}
			className={cn(
				"btn btn-block btn-primary cursor-pointer font-semibold tracking-wide shadow-lg",
			)}
		>
			{loading ? <span className="loading loading-spinner"></span> : null}
			Sign in with OAuth
		</button>
	);
};

export default OauthLogin;
