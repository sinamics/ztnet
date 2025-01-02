import React, { useRef, useState } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { RoutesEntity } from "~/types/local/network";
import { api } from "~/utils/api";
import { useRouter } from "next/router";
import TextArea from "~/components/elements/textarea";
import { useTranslations } from "next-intl";
import toast from "react-hot-toast";
import { useParams } from "next/navigation";

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
		onSuccess: () => {
			toast.success("Route updated successfully");
			void refetchNetworkById();
		},
	});

	const urlParams = useParams();

	const defaultColumn: Partial<ColumnDef<RoutesEntity>> = {
		cell: ({ getValue, row: { original }, column: { id } }) => {
			// Check if this column is editable
			const columnConfig = EDITABLE_COLUMNS.find((col) => col.id === id);
			if (!columnConfig) {
				return getValue();
			}

			return (
				<EditableCell
					nwid={urlParams.id as string}
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
	const [value, setValue] = useState<string | number>(initialValue);
	// Add a ref to track if update was triggered by Enter key
	const isEnterUpdateRef = useRef(false);

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

	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			// Set the flag before updating
			isEnterUpdateRef.current = true;
			handleUpdate();
			inputRef.current?.blur();
		}
	};

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
