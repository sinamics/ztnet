import { TRPCClientErrorLike } from "@trpc/client";
import { useTranslations } from "next-intl";

import toast from "react-hot-toast";
import { ErrorData } from "~/types/errorHandling";

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
type TRPCErrorLike = TRPCClientErrorLike<any> & { data?: ErrorData };

export const useTrpcApiErrorHandler = () => {
	const t = useTranslations("commonToast");

	const handleError = (error: TRPCErrorLike) => {
		if ((error.data as ErrorData)?.zodError) {
			const fieldErrors = (error.data as ErrorData)?.zodError.fieldErrors;
			for (const field in fieldErrors) {
				toast.error(`${fieldErrors[field].join(", ")}`);
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
