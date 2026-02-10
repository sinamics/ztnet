interface Icon {
	className?: string;
	onClick?: () => void;
	fill?: string;
}

export const AndroidIcon = ({ className = "", onClick, ...rest }: Icon) => (
	<span onClick={onClick}>
		<svg
			xmlns="http://www.w3.org/2000/svg"
			fill="none"
			viewBox="0 0 24 24"
			strokeWidth="1.5"
			stroke="currentColor"
			className={`bg-op h-5 w-5 cursor-pointer text-primary ${className}`}
			{...rest}
		>
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				d="M16.61 15.15C16.15 15.15 15.77 14.78 15.77 14.32S16.15 13.5 16.61 13.5H16.61C17.07 13.5 17.45 13.86 17.45 14.32C17.45 14.78 17.07 15.15 16.61 15.15M7.41 15.15C6.95 15.15 6.57 14.78 6.57 14.32C6.57 13.86 6.95 13.5 7.41 13.5H7.41C7.87 13.5 8.24 13.86 8.24 14.32C8.24 14.78 7.87 15.15 7.41 15.15M16.91 10.14L18.58 7.26C18.67 7.09 18.61 6.88 18.45 6.79C18.28 6.69 18.07 6.75 17.97 6.91L16.29 9.82C14.95 9.12 13.5 8.75 12 8.75C10.5 8.75 9.05 9.12 7.71 9.82L6.03 6.91C5.93 6.75 5.72 6.69 5.55 6.79C5.39 6.88 5.33 7.09 5.42 7.26L7.09 10.14C4.47 11.79 2.75 14.62 2.75 17.88H21.25C21.25 14.62 19.53 11.79 16.91 10.14Z"
			/>
		</svg>
	</span>
);
