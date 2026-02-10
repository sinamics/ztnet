import cn from "classnames";

interface SubmitButtonProps {
	loading: boolean;
	title: string;
}

const FormSubmitButtons: React.FC<SubmitButtonProps> = ({ loading, title }) => (
	<button
		type="submit"
		className={cn(
			"btn btn-block btn-primary border cursor-pointer font-semibold tracking-wide shadow-lg",
		)}
	>
		{loading ? <span className="loading loading-spinner"></span> : null}
		{title}
	</button>
);

export default FormSubmitButtons;
