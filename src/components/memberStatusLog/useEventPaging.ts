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
			if (nextCursor) setCursors((previous) => [...previous, nextCursor]);
		},
		previous: () => setCursors((previous) => previous.slice(0, -1)),
		reset: () => setCursors([]),
	};
};
