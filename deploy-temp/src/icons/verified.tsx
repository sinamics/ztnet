interface Icon {
	className?: string;
	onClick?: () => void;
}

const Verified = ({ className, onClick, ...rest }: Icon) => {
	return (
		<span onClick={onClick}>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 20 20"
				fill="currentColor"
				className={`h-4 w-4 cursor-pointer text-green-500 ${className}`}
				{...rest}
			>
				<path
					fillRule="evenodd"
					d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
					clipRule="evenodd"
				/>
			</svg>
		</span>
	);
};

export default Verified;
