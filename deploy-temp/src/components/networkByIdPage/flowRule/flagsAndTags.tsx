import React from "react";
import { useFlagsAndTags } from "./useFlagsAndTags";
import TagComponent from "./tagComponent";

interface IProp {
	organizationId: string;
	nwid: string;
	memberId: string;
	central?: boolean;
}

const FlagsAndTags = ({ organizationId, nwid, memberId, central = false }: IProp) => {
	const { tagsByName, tagFlags, handleEnumChange, handleFlagsCheckboxChange } =
		useFlagsAndTags({
			organizationId,
			nwid,
			memberId,
			central,
		});

	if (!tagsByName || Object.keys(tagsByName).length === 0) {
		return <p className="text-sm text-gray-500">None</p>;
	}

	return (
		<div className="flex flex-wrap gap-2">
			{Object.entries(tagsByName).map(([tagName, tagDetails]) => (
				<TagComponent
					key={tagName}
					tagName={tagName}
					tagDetails={tagDetails}
					tagFlags={tagFlags}
					handleEnumChange={handleEnumChange}
					handleFlagsCheckboxChange={handleFlagsCheckboxChange}
				/>
			))}
		</div>
	);
};

export default FlagsAndTags;
