import React, { useRef, useState } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { RoutesEntity } from "~/types/local/network";
import { api } from "~/utils/api";
import { useRouter } from "next/router";
import Input from "~/components/elements/input";

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
];

interface useEditableColumnProps {
	refetchNetworkById: () => void;
}

export const useEditableColumn = ({ refetchNetworkById }: useEditableColumnProps) => {
	const { mutate: updateManageRoutes } = api.network.managedRoutes.useMutation({
		onSuccess: refetchNetworkById,
	});

	const { query } = useRouter();
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
	const initialValue = getValue();
	const inputRef = useRef<HTMLInputElement>(null);
	const [value, setValue] = useState<string | number>(initialValue);

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
		handleUpdate();
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter") {
			e.preventDefault();
			handleUpdate();
			inputRef.current?.blur();
		}
	};

	return (
		<Input
			useTooltip
			ref={inputRef}
			placeholder="Click to add notes"
			name="routesNotes"
			onChange={(e) => setValue(e.target.value)}
			onBlur={onBlur}
			onKeyDown={handleKeyDown}
			value={(value as string) || ""}
			type="text"
			className="input-primary input-sm m-0 border-0 bg-transparent p-0 min-w-full cursor-pointer"
		/>
	);
};

export default useEditableColumn;
