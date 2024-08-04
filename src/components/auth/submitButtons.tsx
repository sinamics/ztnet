import cn from "classnames";

interface SubmitButtonProps {
	loading: boolean;
	isTotp: boolean;
}

const SubmitButtons: React.FC<SubmitButtonProps> = ({ loading, isTotp }) => (
	<button
		type="submit"
		className={cn(
			"btn btn-block btn-primary border cursor-pointer rounded-full font-semibold tracking-wide shadow-lg",
		)}
	>
		{loading ? <span className="loading loading-spinner"></span> : null}
		{isTotp ? "Verify TOTP" : "Sign in"}
	</button>
);

export default SubmitButtons;
