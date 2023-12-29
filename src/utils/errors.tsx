import toast from "react-hot-toast";
import { ErrorData } from "~/types/errorHandling";

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export const handleErrors = (error: any) => {
	if ((error.data as ErrorData)?.zodError) {
		const fieldErrors = (error.data as ErrorData)?.zodError.fieldErrors;
		for (const field in fieldErrors) {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/restrict-template-expressions, @typescript-eslint/no-unsafe-call
			toast.error(`${fieldErrors[field].join(", ")}`);
		}
	} else if (error.message) {
		toast.error(error.message);
	} else {
		toast.error("An unknown error occurred");
	}
};
