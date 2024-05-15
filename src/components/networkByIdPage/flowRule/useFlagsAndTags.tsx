import { useRouter } from "next/router";
import { useEffect, useState } from "react";
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

export const useFlagsAndTags = ({ organizationId, nwid, memberId, central }: IProp) => {
	const { query } = useRouter();
	const [tagFlags, setTagFlags] = useState<Record<number, number>>({});

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

	useEffect(() => {
		const initialFlags: Record<number, number> = {};
		if (memberById?.tags) {
			for (const [tagId, flags] of memberById.tags) {
				initialFlags[tagId] = flags;
			}
		}
		setTagFlags(initialFlags);
	}, [memberById?.tags]);

	const { mutate: updateTags } = api.networkMember.Tags.useMutation({
		onError: handleApiError,
		onSuccess: handleApiSuccess({ actions: [refetchMemberById, refetchNetworkById] }),
	});

	const handleEnumChange = (
		e: React.ChangeEvent<HTMLSelectElement>,
		tagDetails: TagDetails,
	) => {
		const selectedOption = e.target.value;
		const selectedValue = tagDetails.enums[selectedOption];
		const tagId = tagDetails.id;

		const newTagFlags = { ...tagFlags };
		if (selectedOption === "None") {
			delete newTagFlags[tagId];
		} else {
			newTagFlags[tagId] = selectedValue;
		}

		setTagFlags(newTagFlags);

		const tags: [number, number][] = Object.entries(newTagFlags).map(([id, flags]) => [
			Number(id),
			flags,
		]);
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
		const tagId = tagDetails.id;

		const newTagFlags = { ...tagFlags };
		if (e.target.checked) {
			newTagFlags[tagId] |= flagValue; // Add the flag using bitwise OR
		} else {
			newTagFlags[tagId] &= ~flagValue; // Remove the flag using bitwise AND NOT
		}

		setTagFlags(newTagFlags);

		const tags: [number, number][] = Object.entries(newTagFlags).map(([id, flags]) => [
			Number(id),
			flags,
		]);
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

	return { tagsByName, tagFlags, handleEnumChange, handleFlagsCheckboxChange };
};
