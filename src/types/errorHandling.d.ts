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

export interface CustomError {
  shape?: ShapeError;
}
