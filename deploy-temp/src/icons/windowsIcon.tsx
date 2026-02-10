interface Icon {
	className?: string;
	onClick?: () => void;
	fill?: string;
}

export const WindowsIcon = ({ className = "", onClick, ...rest }: Icon) => (
	<span onClick={onClick}>
		<svg
			xmlns="http://www.w3.org/2000/svg"
			fill="none"
			viewBox="0 0 24 24"
			strokeWidth="1.5"
			stroke="currentColor"
			className={`bg-op h-4 w-4 cursor-pointer text-primary ${className}`}
			{...rest}
		>
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				d="M3,12V6.75L9,5.43V11.91L3,12M20,3V11.75L10,11.9V5.21L20,3M3,13L9,13.09V19.9L3,18.75V13M20,13.25V22L10,20.09V13.1L20,13.25Z"
			/>
		</svg>
	</span>
);
