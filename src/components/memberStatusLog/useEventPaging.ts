import { useState } from "react";

export interface EventCursor {
	createdAt: Date;
	id: number;
}

/**
 * Cursor paging for the member status log. The server only knows "the page
 * after this row", so going back means remembering the cursor each visited
 * page was opened with.
 */
export const useEventPaging = () => {
	// cursors[i] opens page i + 1. Page 0 has no cursor.
	const [cursors, setCursors] = useState<EventCursor[]>([]);

	return {
		page: cursors.length,
		cursor: cursors[cursors.length - 1] ?? null,
		next: (nextCursor: EventCursor | null | undefined) => {
			if (!nextCursor) return;
			setCursors((previous) => {
				// A second click before the next page has arrived hands in the
				// cursor that is already open.
				const open = previous[previous.length - 1];
				if (open && open.id === nextCursor.id) return previous;
				return [...previous, nextCursor];
			});
		},
		previous: () => setCursors((previous) => previous.slice(0, -1)),
		reset: () => setCursors([]),
	};
};
