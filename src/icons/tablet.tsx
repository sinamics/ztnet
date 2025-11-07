import { IconProps, IconWrapper } from "./iconWrapper";

const Tablet = ({ className, onClick, ...rest }: IconProps) => {
	return (
		<IconWrapper className={className} onClick={onClick} {...rest}>
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				d="M10.5 19.5h3m-6.75 2.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-15a2.25 2.25 0 0 0-2.25-2.25H6.75A2.25 2.25 0 0 0 4.5 4.5v15a2.25 2.25 0 0 0 2.25 2.25Z"
			/>
		</IconWrapper>
	);
};

export default Tablet;
