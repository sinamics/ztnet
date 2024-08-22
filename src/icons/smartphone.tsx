interface Icon {
	// add optional className prop
	className?: string;
	onClick?: () => void;
}

const SmartPhone = ({ className, onClick, ...rest }: Icon) => {
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
					d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3"
				/>
			</svg>
		</span>
	);
};

export default SmartPhone;
