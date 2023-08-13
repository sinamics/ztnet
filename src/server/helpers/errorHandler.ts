import { TRPCError } from "@trpc/server";
import { type AxiosError } from "axios";

export class APIError extends Error {
	statusText: string;
	status: number;
	cause?: Error;
	constructor(message?: string, axiosError?: AxiosError) {
		super(message || "An unknown error occurred");

		if (axiosError) {
			this.name = "APIError";
			this.status = axiosError.response?.status;
			this.statusText = axiosError.response?.statusText;
			this.cause = axiosError.cause;
		}
	}
}

export type ErrorCode =
	| "BAD_REQUEST"
	| "PARSE_ERROR"
	| "INTERNAL_SERVER_ERROR"
	| "UNAUTHORIZED"
	| "FORBIDDEN"
	| "NOT_FOUND"
	| "METHOD_NOT_SUPPORTED"
	| "TIMEOUT"
	| "CONFLICT"
	| "PRECONDITION_FAILED"
	| "PAYLOAD_TOO_LARGE"
	| "UNPROCESSABLE_CONTENT"
	| "TOO_MANY_REQUESTS"
	| "CLIENT_CLOSED_REQUEST";

export const throwError = (
	message: string,
	code: ErrorCode = "BAD_REQUEST",
	cause: Error | null = null,
) => {
	throw new TRPCError({
		message,
		code,
		cause,
	});
};

export class CustomLimitError extends Error {
	constructor(message?: string) {
		super(message);
		this.name = this.constructor.name;
	}
}
