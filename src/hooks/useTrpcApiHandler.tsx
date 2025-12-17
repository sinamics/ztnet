import { useTranslations } from "next-intl";
import toast from "react-hot-toast";

interface ZodFieldErrors {
	[key: string]: string[];
}

interface TRPCError {
	message: string;
	data?: {
		zodError?: {
			fieldErrors?: ZodFieldErrors;
		} | null;
		code?: string;
		httpStatus?: number;
		path?: string;
	} | null;
}

export const useTrpcApiErrorHandler = () => {
	const t = useTranslations("commonToast");

	const handleError = (error: TRPCError) => {
		if (error.data?.zodError?.fieldErrors) {
			const fieldErrors = error.data.zodError.fieldErrors;
			for (const field in fieldErrors) {
				const errors = fieldErrors[field];
				if (errors && errors.length > 0) {
					toast.error(`${errors.join(", ")}`);
				}
			}
		} else if (error.message) {
			toast.error(error.message);
		} else {
			toast.error(t("errorOccurred"));
		}
	};

	return handleError;
};

interface SuccessHandlerOptions {
	actions?: (() => void)[];
	toastMessage?: string;
}

export const useTrpcApiSuccessHandler = () => {
	const t = useTranslations("commonToast");

	const handleSuccess = ({ actions = [], toastMessage }: SuccessHandlerOptions) => {
		return () => {
			// Display the custom toast message if provided, otherwise use the default
			toast.success(toastMessage || t("updatedSuccessfully"));

			// Refetch all provided queries using for...of loop
			for (const action of actions) {
				void action();
			}
		};
	};

	return handleSuccess;
};
