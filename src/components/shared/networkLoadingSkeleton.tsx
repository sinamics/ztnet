import React from "react";
import cn from "classnames";

interface IProps {
	className?: string;
}

const NetworkLoadingSkeleton = ({ className }: IProps) => {
	return (
		<div role="skeleton" className={cn("container mx-auto mt-12 space-y-10", className)}>
			<div className="flex gap-4 justify-between">
				<div className="flex flex-col gap-4">
					<div className="skeleton h-4 w-72"></div>
					<div className="skeleton h-4 w-72"></div>
				</div>
				<div className="flex gap-5">
					<div className="skeleton h-24 w-72"></div>
					<div className="skeleton h-24 w-72"></div>
				</div>
			</div>
			<div className="skeleton h-32 w-full"></div>
			<div className="flex flex-col gap-4 w-full">
				<div className="skeleton h-32 w-full"></div>
				<div className="skeleton h-4 w-28"></div>
				<div className="skeleton h-4 w-full"></div>
				<div className="skeleton h-4 w-full"></div>
			</div>
			<div className="flex flex-col gap-4 w-full">
				<div className="skeleton h-32 w-full"></div>
				<div className="skeleton h-4 w-28"></div>
				<div className="skeleton h-4 w-full"></div>
				<div className="skeleton h-4 w-full"></div>
			</div>
		</div>
	);
};

export default NetworkLoadingSkeleton;
