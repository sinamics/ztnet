import React from "react";
import { TagDetails } from "~/types/local/member";

interface TagComponentProps {
	tagName: string;
	tagDetails: TagDetails;
	tagFlags: Record<number, number>;
	handleEnumChange: (
		e: React.ChangeEvent<HTMLSelectElement>,
		tagDetails: TagDetails,
	) => void;
	handleFlagsCheckboxChange: (
		e: React.ChangeEvent<HTMLInputElement>,
		flagValue: number,
		tagDetails: TagDetails,
	) => void;
}

const TagComponent: React.FC<TagComponentProps> = ({
	tagName,
	tagDetails,
	tagFlags,
	handleEnumChange,
	handleFlagsCheckboxChange,
}) => {
	const tagValue = tagFlags[tagDetails.id] ?? 0;
	const selectedOption =
		Object.entries(tagDetails.enums).find(([, value]) => value === tagValue)?.[0] ??
		"None";

	return (
		<div className="form-control rounded-md border w-full border-base-300 p-2">
			<div>
				<label className="label">
					<span className="label-text">{tagName.toUpperCase()}</span>
				</label>
				<div className="flex gap-3">
					<select
						className="select select-bordered select-sm capitalize"
						onChange={(e) => handleEnumChange(e, tagDetails)}
						value={selectedOption}
					>
						<option value="None">None</option>
						{Object.entries(tagDetails.enums).map(([option]) => (
							<option key={option} value={option}>
								{option}
							</option>
						))}
					</select>
					<input
						type="text"
						placeholder="Type here"
						readOnly
						className="input input-sm input-bordered w-2/5"
						value={
							selectedOption in tagDetails.enums
								? tagDetails.enums[selectedOption]
								: tagValue || "None"
						}
					/>
				</div>
			</div>

			<div>
				<label className="label">
					<span className="label-text">Flags:</span>
				</label>
				<div className="flex flex-wrap">
					{Object.entries(tagDetails.flags)
						.sort((a, b) => a[1] - b[1])
						.map(([flagKey, flagValue]) => (
							<label key={flagKey} className="label cursor-pointer space-x-2">
								<input
									type="checkbox"
									className="checkbox checkbox-sm"
									checked={(tagFlags[tagDetails.id] & flagValue) !== 0}
									onChange={(e) => handleFlagsCheckboxChange(e, flagValue, tagDetails)}
								/>
								<span className="label-text">{flagKey}</span>
							</label>
						))}
				</div>
			</div>
		</div>
	);
};

export default TagComponent;
