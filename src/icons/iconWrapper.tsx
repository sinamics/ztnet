import React from "react";

export interface IconProps {
	className?: string;
	onClick?: () => void;
	fill?: string;
}

interface IconWrapperProps extends IconProps {
	children: React.ReactNode;
	defaultClassName?: string;
}

/**
 * A reusable wrapper component for SVG icons to reduce code duplication.
 * Provides consistent styling and click handling for all icon components.
 */
export const IconWrapper = ({
	children,
	className = "",
	onClick,
	defaultClassName = "h-4 w-4 cursor-pointer text-primary",
	...rest
}: IconWrapperProps) => (
	<span onClick={onClick}>
		<svg
			xmlns="http://www.w3.org/2000/svg"
			fill="none"
			viewBox="0 0 24 24"
			strokeWidth="1.5"
			stroke="currentColor"
			className={`${defaultClassName} ${className}`}
			{...rest}
		>
			{children}
		</svg>
	</span>
);
