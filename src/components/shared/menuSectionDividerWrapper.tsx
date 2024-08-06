import React from "react";

interface MenuSectionWrapperProps {
	title: string;
	children: React.ReactNode;
	className?: string;
}

const MenuSectionDividerWrapper: React.FC<MenuSectionWrapperProps> = ({
	title,
	children,
	className = "",
}) => {
	return (
		<div className={`space-y-5 ${className}`}>
			<div className="">
				<p className="text-[0.7rem] leading-3 tracking-wider text-gray-400 uppercase">
					{title}
				</p>
				<div className="divider mt-0 p-0  text-gray-500" />
			</div>
			{children}
		</div>
	);
};

export default MenuSectionDividerWrapper;
