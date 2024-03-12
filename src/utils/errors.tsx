import { TRPCError } from "@trpc/server";
import { getHTTPStatusCodeFromError } from "@trpc/server/http";
import { NextApiResponse } from "next";
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

export const handleApiErrors = (cause, res: NextApiResponse) => {
	if (cause instanceof TRPCError) {
		const httpCode = getHTTPStatusCodeFromError(cause);
		try {
			const parsedErrors = JSON.parse(cause.message);
			return res.status(httpCode).json({ cause: parsedErrors });
		} catch (_error) {
			return res.status(httpCode).json({ error: cause.message });
		}
	}

	if (cause instanceof Error) {
		return res.status(500).json({ message: cause.message });
	}
	return res.status(500).json({ message: "Internal server error" });
};
