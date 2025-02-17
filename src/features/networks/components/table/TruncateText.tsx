type TruncateTextProps = {
	text: string;
};

export const TruncateText = ({ text }: TruncateTextProps) => {
	if (!text) return null;

	const shouldTruncate = text?.length > 100;
	return (
		<div
			className={`text-left ${
				shouldTruncate
					? "max-w-[150px] truncate sm:max-w-xs md:overflow-auto md:whitespace-normal"
					: ""
			}`}
		>
			{text}
		</div>
	);
};
