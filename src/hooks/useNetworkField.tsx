// hooks/useNetworkField.ts
import { useEffect, useState } from "react";
import { useNetworkStore } from "~/store/networkStore";
import type { NetworkEntity } from "~/types/local/network";

type NetworkSection = "basicInfo" | "config" | "security";

interface UseNetworkFieldProps {
	section: NetworkSection;
	field: keyof NetworkEntity;
	onSave?: (value: any) => Promise<void>;
}

export function useNetworkField<T>({ section, field, onSave }: UseNetworkFieldProps) {
	const value = useNetworkStore((state) => state[section]?.[field]) as T;
	const [editValue, setEditValue] = useState<T>(value);
	const lockField = useNetworkStore((state) => state.lockField);
	const unlockField = useNetworkStore((state) => state.unlockField);
	const isFieldLocked = useNetworkStore((state) => state.isFieldLocked(section, field));

	useEffect(() => {
		if (!isFieldLocked) {
			setEditValue(value);
		}
	}, [value, isFieldLocked]);

	const handleFocus = () => {
		lockField(section, field);
	};

	const handleBlur = async () => {
		if (editValue !== value && onSave) {
			try {
				await onSave(editValue);
			} catch (error) {
				console.error("Error saving field:", error);
				setEditValue(value); // Reset to original value on error
			}
		}
		unlockField(section, field);
	};

	return {
		value: isFieldLocked ? editValue : value,
		setValue: setEditValue,
		handleFocus,
		handleBlur,
		isLocked: isFieldLocked,
	};
}
