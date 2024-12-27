import React, { useEffect, useRef, useState } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { RoutesEntity } from "~/types/local/network";
import { api } from "~/utils/api";
import { useRouter } from "next/router";

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
	refecthNetworkById: () => void;
}
export const useEditableColumn = ({ refecthNetworkById }: useEditableColumnProps) => {
	const { mutate: updateManageRoutes, isLoading: isUpdating } =
		api.network.managedRoutes.useMutation({
			onSuccess: refecthNetworkById,
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
					isUpdating={isUpdating}
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
	isUpdating: boolean;
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
	isUpdating,
	updateManageRoutes,
}) => {
	const initialValue = getValue();
	const inputRef = useRef<HTMLInputElement>(null);
	const [value, setValue] = useState<string | number>(initialValue ?? "");
	const [isEditing, setIsEditing] = useState(false);

	useEffect(() => {
		setValue(initialValue ?? "");
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
		setIsEditing(false);
		handleUpdate();
	};

	const submitUpdate = (e: React.MouseEvent<HTMLButtonElement>) => {
		e.preventDefault();
		setIsEditing(false);
		handleUpdate();
		inputRef.current?.blur();
	};

	if (isEditing) {
		return (
			<form className="w-full">
				<input
					type="text"
					value={value}
					ref={inputRef}
					onChange={(e) => setValue(e.target.value)}
					onBlur={onBlur}
					className="input-primary input-sm m-0 border-0 bg-transparent p-0 min-w-full"
					disabled={isUpdating}
				/>
				<button type="submit" onClick={submitUpdate} className="hidden" />
			</form>
		);
	}

	return (
		<div
			className="cursor-pointer text-sm"
			onClick={() => !isUpdating && setIsEditing(true)}
		>
			{value || (
				<span className="text-gray-400">
					{columnConfig.placeholder || "Click to edit"}
				</span>
			)}
		</div>
	);
};

export default useEditableColumn;
