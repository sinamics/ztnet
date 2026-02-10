import React, { useEffect, useRef, useState } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { RoutesEntity } from "~/types/local/network";
import { api } from "~/utils/api";
import { useRouter } from "next/router";
import TextArea from "~/components/elements/textarea";
import { useTranslations } from "next-intl";
import toast from "react-hot-toast";

interface EditableColumnConfig {
	id: string;
	updateParam: string;
	placeholder?: string;
}

const EDITABLE_COLUMNS: EditableColumnConfig[] = [
	{
		id: "notes",
		updateParam: "note",
		placeholder: "Click to add notes",
	},
	{
		id: "via",
		updateParam: "via",
		placeholder: "LAN",
	},
];

interface useEditableColumnProps {
	refetchNetworkById: () => void;
}

export const useEditableColumn = ({ refetchNetworkById }: useEditableColumnProps) => {
	const utils = api.useUtils();
	const { query } = useRouter();

	const { mutate: updateManageRoutes } = api.network.managedRoutes.useMutation({
		onSuccess: async () => {
			await utils.network.getNetworkById.invalidate({
				nwid: query.id as string,
				central: false,
			});
			toast.success("Route updated successfully");
			void refetchNetworkById();
		},
		onError: (error) => {
			toast.error(error.message || "Failed to update route");
			// Refetch to reset the input values
			void refetchNetworkById();
		},
	});
	const defaultColumn: Partial<ColumnDef<RoutesEntity>> = {
		cell: ({ getValue, row: { original }, column: { id } }) => {
			// Check if this column is editable
			const columnConfig = EDITABLE_COLUMNS.find((col) => col.id === id);
			if (!columnConfig) {
				return getValue();
			}

			return (
				<EditableCell
					nwid={query.id as string}
					getValue={getValue}
					original={original}
					columnConfig={columnConfig}
					updateManageRoutes={updateManageRoutes}
				/>
			);
		},
	};

	return defaultColumn;
};

interface EditableCellProps {
	nwid: string;
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	getValue: () => any;
	original: RoutesEntity;
	columnConfig: EditableColumnConfig;
	updateManageRoutes: (params: {
		nwid: string;
		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		updateParams: Record<string, any>;
	}) => void;
}

const EditableCell: React.FC<EditableCellProps> = ({
	nwid,
	getValue,
	original,
	columnConfig,
	updateManageRoutes,
}) => {
	const t = useTranslations("networkById");
	const initialValue = getValue();
	const inputRef = useRef<HTMLTextAreaElement>(null);
	const singleLineInputRef = useRef<HTMLInputElement>(null);
	const [value, setValue] = useState<string | number>(initialValue);
	// Add a ref to track if update was triggered by Enter key
	const isEnterUpdateRef = useRef(false);

	// Sync value when initialValue changes (e.g., after successful update or data refresh)
	useEffect(() => {
		setValue(initialValue);
	}, [initialValue]);

	const handleUpdate = () => {
		if (value !== initialValue) {
			updateManageRoutes({
				nwid,
				updateParams: {
					[columnConfig.updateParam]: value,
					routeId: original.id,
				},
			});
		}
	};

	const onBlur = () => {
		// Only update if it wasn't triggered by Enter key
		if (!isEnterUpdateRef.current) {
			handleUpdate();
		}
		// Reset the flag
		isEnterUpdateRef.current = false;
	};

	const handleKeyDown = (
		e: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>,
	) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			// Set the flag before updating
			isEnterUpdateRef.current = true;
			handleUpdate();
			inputRef.current?.blur();
			singleLineInputRef.current?.blur();
		}
	};

	// Use single-line input for via field
	if (columnConfig.id === "via") {
		return (
			<input
				ref={singleLineInputRef}
				type="text"
				placeholder={columnConfig.placeholder}
				name="routesVia"
				onChange={(e) => setValue(e.target.value)}
				onBlur={onBlur}
				onKeyDown={handleKeyDown}
				value={(value as string) || ""}
				className="input input-primary input-sm m-0 border-0 bg-transparent p-0 min-w-full cursor-pointer"
			/>
		);
	}

	return (
		<TextArea
			useTooltip
			ref={inputRef}
			placeholder={t("networkRoutes.notesPlaceholder")}
			name="routesNotes"
			onChange={(e) => setValue(e.target.value)}
			onBlur={onBlur}
			onKeyDown={handleKeyDown}
			value={(value as string) || ""}
			className="input-primary input-sm m-0 border-0 bg-transparent p-0 min-w-full cursor-pointer"
		/>
	);
};

export default useEditableColumn;
