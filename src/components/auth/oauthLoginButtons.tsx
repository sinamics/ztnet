import cn from "classnames";

interface OAuthButtonProps {
	oAuthHandler: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
	loading: boolean;
}

const OAuthLoginButton: React.FC<OAuthButtonProps> = ({ oAuthHandler, loading }) => (
	<button
		type="button"
		onClick={oAuthHandler}
		className={cn(
			"btn btn-block btn-primary cursor-pointer rounded-full font-semibold tracking-wide shadow-lg",
		)}
	>
		{loading ? <span className="loading loading-spinner"></span> : null}
		Sign in with OAuth
	</button>
);

export default OAuthLoginButton;
