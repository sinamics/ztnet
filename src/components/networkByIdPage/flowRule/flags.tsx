import { useRouter } from "next/router";
import React, { useState } from "react";
import {
	useTrpcApiErrorHandler,
	useTrpcApiSuccessHandler,
} from "~/hooks/useTrpcApiHandler";
import { TagDetails } from "~/types/local/member";
import { api } from "~/utils/api";

interface IProp {
	organizationId: string;
	nwid: string;
	memberId: string;
	central?: boolean;
}

const FlagsTags = ({ organizationId, nwid, memberId, central = false }: IProp) => {
	const { query } = useRouter();

	const handleApiError = useTrpcApiErrorHandler();
	const handleApiSuccess = useTrpcApiSuccessHandler();
	const { data: memberById, refetch: refetchMemberById } =
		api.networkMember.getMemberById.useQuery(
			{
				nwid,
				id: memberId,
				central,
			},
			{ enabled: !!query.id, networkMode: "online" },
		);
	const { data: networkById, refetch: refetchNetworkById } =
		api.network.getNetworkById.useQuery(
			{
				nwid,
				central,
			},
			{ enabled: !!query.id },
		);
	console.log(memberById);
	const [flagValues, setFlagValues] = useState(memberById?.tags?.[0]?.[1] || 0);
	const { mutate: updateTags } = api.networkMember.Tags.useMutation({
		onError: handleApiError,
		onSuccess: handleApiSuccess({ actions: [refetchMemberById, refetchNetworkById] }),
	});

	const handleDropdownChange = (
		e: React.ChangeEvent<HTMLSelectElement>,
		tagDetails: TagDetails,
	) => {
		const selectedOption = e.target.value;

		const selectedValue = tagDetails.enums[selectedOption];
		const tagId = tagDetails.id;

		// Update the flagValues to match the new selected value's flags
		const currentTagFlags = memberById.tags.find((tag) => tag[0] === tagId)?.[1] || 0;
		setFlagValues(currentTagFlags);

		// Update the tags map with the new selected enum value
		const tagMap = new Map(memberById.tags);

		if (selectedOption === "None") {
			tagMap.delete(tagId);
			setFlagValues(0);
		} else {
			tagMap.set(tagId, selectedValue);
			const currentTagFlags = tagMap.get(tagId) || 0;
			setFlagValues(currentTagFlags);
		}

		const tags = Array.from(tagMap.entries());
		updateTags({
			updateParams: {
				tags,
			},
			organizationId,
			memberId,
			central,
			nwid,
		});
	};

	const handleFlagsCheckboxChange = (
		e: React.ChangeEvent<HTMLInputElement>,
		flagValue: number,
		tagDetails: TagDetails,
	) => {
		// Toggle flag based on checkbox state
		let newFlagValues = flagValues;
		if (e.target.checked) {
			newFlagValues |= flagValue; // Add the flag using bitwise OR
		} else {
			newFlagValues &= ~flagValue; // Remove the flag using bitwise AND NOT
		}

		// Update state to reflect the new flags setting
		setFlagValues(newFlagValues);

		// Prepare updated tags with the new flags setting included
		const tagMap = new Map(memberById.tags);
		tagMap.set(tagDetails.id, newFlagValues);

		const tags = Array.from(tagMap.entries());
		updateTags({
			updateParams: {
				tags,
			},
			organizationId,
			memberId,
			central,
			nwid,
		});
	};

	const tagsByName = networkById?.network?.tagsByName;
	if (!tagsByName || Object.keys(tagsByName).length === 0) {
		return <p className="text-sm text-gray-500">None</p>;
	}

	// Create a Map from existing tags for easy lookup
	const tagMap = new Map(memberById?.tags as [number, number][]);
	return (
		<div className="flex flex-wrap gap-2">
			{Object.entries(tagsByName).map(([tagName, tagDetails]: [string, TagDetails]) => {
				if (!tagDetails || typeof tagDetails !== "object" || !tagDetails.enums) {
					return null;
				}

				// const tagValue = flagValues;
				const tagValue = tagMap.get(tagDetails.id);

				const selectedOption =
					Object.entries(tagDetails.enums).find(
						([_, value]) => value === tagValue,
					)?.[0] ?? "None";

				return (
					<div
						key={tagName}
						className="form-control rounded-md border border-base-300 p-2 space-y-3"
					>
						<div>
							<label className="label">
								<span className="label-text">{tagName.toUpperCase()}</span>
							</label>
							<div className="flex gap-3">
								<select
									className="select select-bordered select-sm capitalize"
									onChange={(e) => handleDropdownChange(e, tagDetails)}
									value={selectedOption}
								>
									<option value="None">None</option>
									{Object.entries(tagDetails.enums).map(([option]) => (
										<option key={option} value={option}>
											{option}
										</option>
									))}
									{/* <option value="Custom">Custom</option> */}
								</select>
								<input
									type="text"
									placeholder="Type here"
									readOnly
									className="input input-sm input-bordered w-2/5"
									value={
										selectedOption in tagDetails.enums
											? tagDetails.enums[selectedOption]
											: flagValues || "None"
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
												checked={(flagValues & flagValue) !== 0}
												onChange={(e) =>
													handleFlagsCheckboxChange(e, flagValue, tagDetails)
												}
											/>
											<span className="label-text">{flagKey}</span>
										</label>
									))}
							</div>
						</div>
					</div>
				);
			})}
		</div>
	);
};

export default FlagsTags;
