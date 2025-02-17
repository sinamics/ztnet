// app/lib/hooks/useActionHandler.ts
"use client";

import { useTranslations } from "next-intl";
import { ZodError } from "zod";
import { toast } from "react-hot-toast";

interface ActionError {
	message: string;
	zodError?: {
		fieldErrors: Record<string, string[]>;
	};
}

export function useActionErrorHandler() {
	const t = useTranslations("commonToast");

	const handleError = (error: unknown) => {
		if (error instanceof ZodError) {
			// Handle Zod validation errors
			const fieldErrors = error.flatten().fieldErrors;
			for (const field in fieldErrors) {
				if (fieldErrors[field]) {
					toast.error(`${fieldErrors[field].join(", ")}`);
				}
			}
		} else if (error instanceof Error) {
			// Handle regular errors
			toast.error(error.message);
		} else if (typeof error === "object" && error !== null && "message" in error) {
			// Handle error objects
			const actionError = error as ActionError;
			if (actionError.zodError) {
				for (const field in actionError.zodError.fieldErrors) {
					if (actionError.zodError.fieldErrors[field]) {
						toast.error(`${actionError.zodError.fieldErrors[field].join(", ")}`);
					}
				}
			} else {
				toast.error(actionError.message);
			}
		} else {
			// Fallback error message
			toast.error(t("errorOccurred"));
		}
	};

	return handleError;
}

interface SuccessHandlerOptions {
	actions?: (() => void | Promise<void>)[];
	toastMessage?: string;
}

export function useActionSuccessHandler() {
	const t = useTranslations("commonToast");

	const handleSuccess = ({ actions = [], toastMessage }: SuccessHandlerOptions = {}) => {
		return async () => {
			// Display success message
			toast.success(toastMessage || t("updatedSuccessfully"));

			// Execute all actions
			for (const action of actions) {
				await action();
			}
		};
	};

	return handleSuccess;
}
