interface Icon {
	// add optional className prop
	className?: string;
	onClick?: () => void;
}

const Monitor = ({ className, onClick, ...rest }: Icon) => {
	return (
		<span onClick={onClick}>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				fill="none"
				viewBox="0 0 24 24"
				strokeWidth="1.5"
				stroke="currentColor"
				className={`h-4 w-4 cursor-pointer text-primary ${className}`}
				{...rest}
			>
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25m18 0A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25m18 0V12a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 12V5.25"
				/>
			</svg>
		</span>
	);
};

export default Monitor;
