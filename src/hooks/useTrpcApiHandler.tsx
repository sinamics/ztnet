import { TRPCClientErrorLike } from "@trpc/client";
import { useTranslations } from "next-intl";

import toast from "react-hot-toast";
import { ErrorData } from "~/types/errorHandling";

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
type TRPCErrorLike = TRPCClientErrorLike<any> & { data?: ErrorData };

export const useTrpcApiErrorHandler = () => {
	const t = useTranslations("admin");

	const handleError = (error: TRPCErrorLike) => {
		if ((error.data as ErrorData)?.zodError) {
			const fieldErrors = (error.data as ErrorData)?.zodError.fieldErrors;
			for (const field in fieldErrors) {
				toast.error(`${fieldErrors[field].join(", ")}`);
			}
		} else if (error.message) {
			toast.error(error.message);
		} else {
			toast.error(t("users.users.toastMessages.errorOccurred"));
		}
	};

	return handleError;
};

export const useTrpcApiSuccessHandler = () => {
	const t = useTranslations("commonToast");

	const handleSuccess = () => {
		toast.success(t("addedSuccessfully"));
	};

	return handleSuccess;
};
