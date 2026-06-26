import { useEffect, useState } from "react";
import type { SortingState, VisibilityState } from "@tanstack/react-table";
import { getLocalStorageItem, setLocalStorageItem } from "~/utils/localstorage";
import {
	DEFAULT_SORTING,
	EXTENDED_VIEW_STORAGE_KEY,
	SORTING_STORAGE_KEY,
} from "../constants";

/**
 * Centralises the members table's persisted UI preferences:
 * - sorting state (localStorage)
 * - the "extended view" toggle (localStorage), which controls visibility of the
 *   `description` column. `notations` is always hidden (used only for sorting/bg).
 */
export const useTablePersistence = () => {
	const [sorting, setSorting] = useState<SortingState>(() =>
		getLocalStorageItem(SORTING_STORAGE_KEY, DEFAULT_SORTING),
	);
	const [showExtendedView, setShowExtendedView] = useState<boolean>(() =>
		getLocalStorageItem(EXTENDED_VIEW_STORAGE_KEY, false),
	);
	const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
		notations: false,
		description: showExtendedView,
	});

	useEffect(() => {
		setLocalStorageItem(SORTING_STORAGE_KEY, sorting);
	}, [sorting]);

	useEffect(() => {
		setLocalStorageItem(EXTENDED_VIEW_STORAGE_KEY, showExtendedView);
		setColumnVisibility((prev) => ({ ...prev, description: showExtendedView }));
	}, [showExtendedView]);

	return {
		sorting,
		setSorting,
		showExtendedView,
		setShowExtendedView,
		columnVisibility,
		setColumnVisibility,
	};
};
