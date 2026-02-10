interface ZodErrorFieldErrors {
	updateParams?: string;
}

interface ZodError {
	fieldErrors?: ZodErrorFieldErrors;
}

interface ErrorData {
	zodError?: ZodError;
}

interface ShapeError {
	data?: ErrorData;
}

interface CustomBackendError {
	error?: string;
	line?: number;
}

export interface CustomError {
	shape?: ShapeError;
	message?: CustomBackendError;
}
