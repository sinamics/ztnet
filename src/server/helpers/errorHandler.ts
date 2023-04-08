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
      // eslint-disable-next-line no-console
      console.error(axiosError);
    }
  }
}
