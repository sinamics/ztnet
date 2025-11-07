import { toast } from "react-hot-toast";
import { type ErrorData, type ZodErrorFieldErrors } from "~/types/errorHandling";

/**
 * Handles API mutation errors with consistent error messaging
 * This centralizes the common error handling pattern used across auth forms
 *
 * @param error - The error object from the mutation
 */
export function handleFormMutationError(error: {
	data?: unknown;
	message?: string;
}): void {
	if ((error.data as ErrorData)?.zodError) {
		const fieldErrors: ZodErrorFieldErrors = (error.data as ErrorData)?.zodError
			.fieldErrors;

		for (const field in fieldErrors) {
			if (Array.isArray(fieldErrors[field])) {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/restrict-template-expressions, @typescript-eslint/no-unsafe-call
				toast.error(`${fieldErrors[field].join(", ")}`, {
					duration: 10000,
				});
			}
		}
	} else if (error.message) {
		toast.error(error.message);
	} else {
		toast.error("An unknown error occurred");
	}
}
